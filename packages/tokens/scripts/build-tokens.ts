import StyleDictionary from "style-dictionary";
import type {
  Dictionary,
  File,
  FormatFn,
  PlatformConfig,
  TransformedToken,
} from "style-dictionary/types";
import { formattedVariables } from "style-dictionary/utils";
import {
  COLOR_SCHEMES,
  formatAlphaColor,
  formatColorMix,
  formatTsModule,
  wrapInColorSchemeBlock,
  resolveTokenFilePaths,
  type ColorScheme,
  type SelectorChain,
  type TokenFilePaths,
  type TsEntry,
} from "./build-tokens.helper.ts";
import { validateTokens } from "./validate-tokens.ts";

export interface BuildResult {
  /** `tokens.css`의 내용 */
  css: string;
  /** 패키지 TS 진입점(`tokens`, `values`)의 소스 */
  ts: string;
}

const PREFIX = "gyeol";

/**
 * Color Scheme마다 Semantic을 내는 CSS 블록의 selector다.
 * dark는 OS 설정(media query)과 data-color-scheme 속성, 두 블록에 같은 내용을 낸다.
 *
 * data-color-scheme 속성은 `<html>`에서만 지원하므로 모든 selector를 `:root`로 묶는다.
 * 하위 요소에 붙인 속성은 어느 블록에도 맞지 않아 부모의 값을 물려받는다.
 * `:root[data-color-scheme="dark"]`는 명시도가 (0,2,0)이라 light `:root`(0,1,0)를 블록 순서와 관계없이 이긴다.
 */
const SCHEME_SELECTORS: Record<ColorScheme, readonly SelectorChain[]> = {
  light: [[":root"]],
  dark: [
    [
      "@media (prefers-color-scheme: dark)",
      ':root:not([data-color-scheme="light"])',
    ],
    [':root[data-color-scheme="dark"]'],
  ],
};

/** Figma의 "alias + 투명도". `$extensions.gyeol.alias`에 적는다 */
interface AliasWithAlpha {
  /** 참조 대상. 예: `{bg-surface}` */
  ref: string;
  /** 불투명도(0–1) */
  alpha: number;
}

/**
 * 토큰 원본의 `gyeol.alias`를 읽는다. 변환 전 원본(`original`)에서 읽는 이유:
 * Style Dictionary는 `$value`뿐 아니라 토큰 전체의 참조를 풀기 때문에, 변환 후에는 `ref`가 참조 대상의 색 객체로 바뀌어 있다.
 */
const readAliasWithAlpha = (
  token: TransformedToken,
): AliasWithAlpha | undefined => token.original.$extensions?.gyeol?.alias;

/** "alias + 투명도" 토큰인지 판단한다. 토큰 원본에 `gyeol.alias`가 있으면 그렇다 */
const isAliasWithAlpha = (token: TransformedToken): boolean =>
  readAliasWithAlpha(token) !== undefined;

/**
 * "alias + 투명도" 토큰을 `color-mix()`로 내도록 바꾼다. 다른 토큰은 그대로 돌려준다.
 */
function applyColorMix({
  token,
  dictionary,
}: {
  token: TransformedToken;
  dictionary: Dictionary;
}): TransformedToken {
  const alias = readAliasWithAlpha(token);
  if (!alias) return token;
  // include로 넘긴 Primitive는 filter로 빠지므로 filter 전 토큰에서 찾는다
  const target = dictionary.unfilteredTokenMap?.get(alias.ref);
  // 참조 대상이 없으면 Style Dictionary가 ref를 풀다가 먼저 실패하므로 여기에는 오지 않는다. 타입을 좁히는 가드다
  if (!target) {
    throw new Error(
      `${token.path.join(".")}: gyeol.alias의 참조 대상 ${alias.ref}가 없다`,
    );
  }
  return {
    ...token,
    // 출력할 값. 원본 $value에 적힌 계산된 색(rgba) 대신 참조 대상 변수를 섞는다
    $value: formatColorMix({ variable: target.name, alpha: alias.alpha }),
    // 블록 안에서 변수 줄의 순서를 다른 참조 토큰과 같은 규칙으로 정하려고 원본 값을 ref로 바꾼다.
    //
    // formattedVariables는 outputReferences를 켜면, 참조되는 토큰을 참조하는 토큰보다 앞에 두도록 정렬한다(sortByReference).
    //   예: --gyeol-ring-offset: var(--gyeol-bg-surface)는 --gyeol-bg-surface 뒤에 나온다.
    // 이때 토큰이 참조하는지는 original.$value가 "{bg-surface}" 같은 참조 문자열인지로만 판단한다.
    //
    // "alias + 투명도"의 original.$value는 계산된 색 객체다. 그대로 두면 참조가 없는 토큰으로 여겨,
    // 참조하는 토큰 모두보다 앞, 즉 블록 맨 앞으로 옮겨진다.
    //   예: light 블록에서 --gyeol-alpha-90이 자기가 가리키는 --gyeol-bg-surface보다 먼저 나온다.
    // ref를 넣으면 bg-surface를 참조하는 토큰으로 여겨 다른 참조 토큰처럼 원본 순서를 지키고, bg-surface 뒤에 나온다.
    //
    // 출력 값은 바뀌지 않는다. outputReferences 함수가 이 토큰을 빼므로 ref가 var()로 바뀌지 않고 위의 $value가 나온다.
    // CSS 변수는 선언 순서와 관계없이 풀리므로 순서는 읽기 위한 것이다.
    original: { ...token.original, $value: alias.ref },
  };
}

/**
 * css/variables와 같은 변수 줄을 `selectors` 블록 안에 내되, 맨 앞에 CSS color-scheme 속성을 넣고
 * 헤더를 내지 않는다. 헤더는 Primitive 블록(파일 맨 위)에만 남긴다.
 * 변수 줄은 Style Dictionary가 만들고, 블록으로 감싸는 일은 wrapInColorSchemeBlock이 한다.
 */
const createColorSchemeFormat =
  ({
    colorScheme,
    selectors,
  }: {
    colorScheme: ColorScheme;
    selectors: SelectorChain;
  }): FormatFn =>
  ({ dictionary }) =>
    wrapInColorSchemeBlock({
      colorScheme,
      selectors,
      variables: formattedVariables({
        format: "css",
        dictionary: {
          ...dictionary,
          allTokens: dictionary.allTokens.map((token) =>
            applyColorMix({ token, dictionary }),
          ),
        },
        // "alias + 투명도"는 원본 값을 var()로 바꾸지 않고 applyColorMix가 만든 color-mix()를 그대로 낸다
        outputReferences: (token) => !isAliasWithAlpha(token),
        usesDtcg: true,
        formatting: { indentation: "" },
      }),
    });

/**
 * TS `tokens`에 넣을 토큰 목록을 낸다. 값은 CSS 변수 참조다.
 * Style Dictionary의 JS/TS 기본 format은 참조를 내지 못하므로 직접 만든다.
 * 문자열이 아니라 목록을 돌려주고, Primitive와 Semantic의 목록을 합쳐 TS로 쓰는 일은 formatTsModule이 한다.
 */
const listTsReferences: FormatFn = ({ dictionary }): TsEntry[] =>
  dictionary.allTokens.map((token) => ({
    path: token.path,
    value: `var(--${token.name})`,
  }));

/**
 * Semantic 토큰의 실제 색을 쓴다. Style Dictionary가 참조를 끝까지 풀어 `color/css`로 바꾼 값(hex나 rgba())이다.
 * "alias + 투명도"는 원본 `$value`에 적힌 계산된 색 대신, CSS의 color-mix()와 같게 참조 대상의 색에 불투명도를 곱한다.
 */
function formatSemanticValue(token: TransformedToken): string {
  const alias = readAliasWithAlpha(token);
  // Style Dictionary는 $extensions의 ref도 풀어 참조 대상의 색(color/css를 거친 값)으로 바꿔 둔다.
  // 참조 대상이 다시 "alias + 투명도"면 그 토큰의 원본 $value(계산된 색)가 들어오고, 여기에 불투명도를 한 번 더 곱한다
  const color: unknown = alias
    ? token.$extensions?.gyeol?.alias?.ref
    : token.$value;
  if (typeof color !== "string") {
    throw new Error(`${token.path.join(".")}: 실제 색을 풀지 못했다`);
  }
  return alias ? formatAlphaColor({ color, alpha: alias.alpha }) : color;
}

/** TS `values`의 Color Scheme 하나에 넣을 토큰 목록을 낸다. 값은 실제 색이다 */
const listTsValues: FormatFn = ({ dictionary }): TsEntry[] =>
  dictionary.allTokens.map((token) => ({
    path: token.path,
    value: formatSemanticValue(token),
  }));

/** TS 토큰 목록을 내는 format의 등록 이름 */
const TS_FORMAT = {
  references: "gyeol/ts/references",
  values: "gyeol/ts/values",
} as const;

const TS_FORMATS = {
  [TS_FORMAT.references]: listTsReferences,
  [TS_FORMAT.values]: listTsValues,
};

/** Primitive와 Semantic 빌드가 함께 쓰는 플랫폼 설정. CSS와 TS 모두 이름과 값을 같은 transform으로 만든다. 만들 파일 목록만 다르다 */
const configurePlatform = (files: File[]): PlatformConfig => ({
  prefix: PREFIX,
  // 실제로 일하는 transform은 name/kebab(이름), color/css(hex, rgba()), size/rem(dimension)이다.
  // size/rem은 이름과 달리 px를 rem으로 바꾸지 않는다. unit이 적혀 있으면 그대로 붙이고
  // ({16, "px"} → "16px"), unit 없는 숫자에만 "rem"을 붙인다. 토큰은 모두 px로 쓰므로 px로 나온다.
  // size/px를 직접 고르지 않는 이유: size/px는 unit을 무시해 {1.5, "rem"}도 "1.5px"로 낸다.
  transformGroup: "css",
  files,
});

const formatOutputs = async (sd: StyleDictionary): Promise<string[]> => {
  const files = await sd.formatPlatform("css");
  return files.map(({ output }) => {
    if (typeof output !== "string") {
      throw new Error("Style Dictionary가 CSS를 만들지 못했다");
    }
    return output;
  });
};

/** `ts` 플랫폼의 파일마다 TS format이 낸 토큰 목록을 모은다 */
const collectTsEntries = async (sd: StyleDictionary): Promise<TsEntry[][]> => {
  const files = await sd.formatPlatform("ts");
  return files.map(({ output }) => {
    if (!Array.isArray(output)) {
      throw new Error("Style Dictionary가 TS 토큰 목록을 만들지 못했다");
    }
    return output;
  });
};

/**
 * Primitive를 `:root`에 실제 값으로 낸다. 파일 맨 위의 자동 생성 헤더도 여기서 나온다.
 * TS `tokens`에는 색이 아닌 Primitive(spacing, radius)만 참조로 낸다. Primitive 색은 공개 API가 아니다.
 */
async function buildPrimitive(
  primitivePath: string,
): Promise<{ css: string; tsReferences: TsEntry[] }> {
  const sd = new StyleDictionary({
    source: [primitivePath],
    log: { verbosity: "silent" },
    hooks: { formats: TS_FORMATS },
    platforms: {
      css: configurePlatform([{ format: "css/variables" }]),
      ts: configurePlatform([
        {
          format: TS_FORMAT.references,
          filter: (token: TransformedToken) => token.$type !== "color",
        },
      ]),
    },
  });
  const [css] = await formatOutputs(sd);
  const [tsReferences] = await collectTsEntries(sd);
  if (css === undefined || tsReferences === undefined) {
    throw new Error("Style Dictionary가 Primitive 결과를 만들지 못했다");
  }
  return { css, tsReferences };
}

/** source(Semantic)에서 읽은 토큰만 고른다. include로 넘긴 Primitive는 빠진다 */
const isSourceToken = (token: TransformedToken): boolean => token.isSource;

/**
 * Color Scheme 하나의 Semantic을 CSS에는 `var()` 참조로, TS에는 참조와 실제 색으로 낸다.
 *
 * Primitive는 include로 참조를 풀 대상으로만 넘긴다. include로 읽은 토큰도 기본으로는 출력되므로,
 * filter로 source(Semantic)에서 읽은 토큰(isSource)만 낸다.
 * 출력에서 빠진 Primitive를 가리킨다는 "filtered out token references" 경고가 나지만 의도한 동작이고,
 * 로그를 silent로 꺼서 보이지 않는다.
 */
async function buildSemantic({
  paths,
  colorScheme,
}: {
  paths: TokenFilePaths;
  colorScheme: ColorScheme;
}): Promise<{
  cssBlocks: string[];
  tsReferences: TsEntry[];
  tsValues: TsEntry[];
}> {
  // 블록마다 selector가 달라 format을 블록마다 만든다.
  // 파일 설정의 format은 타입상 함수도 받지만 5.8은 등록된 이름만 찾으므로 이름을 붙여 등록한다.
  const formats = SCHEME_SELECTORS[colorScheme].map((selectors, index) => ({
    name: `gyeol/css/${colorScheme}-${index}`,
    format: createColorSchemeFormat({ colorScheme, selectors }),
  }));

  const sd = new StyleDictionary({
    include: [paths.primitive],
    source: [paths.semantic[colorScheme]],
    log: { verbosity: "silent" },
    hooks: {
      formats: {
        ...Object.fromEntries(formats.map((f) => [f.name, f.format])),
        ...TS_FORMATS,
      },
    },
    platforms: {
      css: configurePlatform(
        formats.map(({ name }) => ({
          format: name,
          filter: isSourceToken,
        })),
      ),
      ts: configurePlatform(
        [TS_FORMAT.references, TS_FORMAT.values].map((format) => ({
          format,
          filter: isSourceToken,
        })),
      ),
    },
  });
  const [tsReferences, tsValues] = await collectTsEntries(sd);
  if (tsReferences === undefined || tsValues === undefined) {
    throw new Error("Style Dictionary가 Semantic 결과를 만들지 못했다");
  }
  return { cssBlocks: await formatOutputs(sd), tsReferences, tsValues };
}

/**
 * 토큰 폴더(`primitive.json`, `semantic/light.json`, `semantic/dark.json`이 들어 있는 폴더)를 읽어
 * CSS 텍스트와 TS 소스를 돌려준다. 파일을 쓰지 않는다. 쓰는 일은 `build.ts`가 한다.
 */
export async function buildTokens(tokensDir: string): Promise<BuildResult> {
  // Style Dictionary에 넘기기 전에 토큰 파일을 직접 읽어 검증 규칙을 검사한다. 위반이 있으면 모두 모아 던진다.
  // 파일이 없을 때도 여기서 ENOENT로 실패한다. Style Dictionary의 source와 include는 경로 하나라도 glob 패턴으로 풀고,
  // 맞는 파일이 0개여도 오류가 아니라서, 그대로 넘기면 토큰 없이 빌드가 끝나 빈 블록이 나온다.
  await validateTokens(tokensDir);

  const paths = resolveTokenFilePaths(tokensDir);

  const primitive = await buildPrimitive(paths.primitive);
  const semantic = {
    light: await buildSemantic({ paths, colorScheme: "light" }),
    dark: await buildSemantic({ paths, colorScheme: "dark" }),
  };

  const css = [
    primitive.css,
    ...COLOR_SCHEMES.flatMap((colorScheme) => semantic[colorScheme].cssBlocks),
  ];
  return {
    css: css.join("\n").trimEnd() + "\n",
    ts: formatTsModule({
      // light와 dark의 Semantic 이름은 검증 규칙(semantic-names-match)으로 같으므로 참조는 light에서 가져온다
      tokens: [...semantic.light.tsReferences, ...primitive.tsReferences],
      values: {
        light: semantic.light.tsValues,
        dark: semantic.dark.tsValues,
      },
    }),
  };
}
