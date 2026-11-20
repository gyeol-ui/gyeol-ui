import { access } from "node:fs/promises";
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
  colorMix,
  colorSchemeBlock,
  tokenFilePaths,
  type ColorScheme,
  type SelectorChain,
} from "./build-tokens.helper.ts";

export interface BuildResult {
  /** `tokens.css`의 내용 */
  css: string;
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
 * "alias + 투명도" 토큰인지 판단한다. 토큰 원본에 `gyeol.alias`가 있으면 그렇다.
 *
 * `gyeol.alias`는 변환 전 원본(`original`)에서 읽는다. Style Dictionary는 `$value`뿐 아니라 토큰 전체의 참조를 풀기 때문에,
 * 변환 후에는 `ref`가 참조 대상의 색 객체로 바뀌어 있다.
 */
const isAliasWithAlpha = (token: TransformedToken): boolean => {
  const alias: AliasWithAlpha | undefined =
    token.original.$extensions?.gyeol?.alias;
  return alias !== undefined;
};

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
  if (!isAliasWithAlpha(token)) return token;
  // 변환 전 원본에서 읽는다. 이유는 isAliasWithAlpha에 적었다
  const alias: AliasWithAlpha = token.original.$extensions?.gyeol?.alias;
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
    $value: colorMix({ variable: target.name, alpha: alias.alpha }),
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
 * 변수 줄은 Style Dictionary가 만들고, 블록으로 감싸는 일은 colorSchemeBlock이 한다.
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
    colorSchemeBlock({
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

/** Primitive와 Semantic 빌드가 함께 쓰는 CSS 플랫폼 설정. 만들 파일 목록만 다르다 */
const cssPlatform = (files: File[]): PlatformConfig => ({
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

/**
 * Primitive를 `:root`에 실제 값으로 낸다. 파일 맨 위의 자동 생성 헤더도 여기서 나온다.
 */
async function buildPrimitiveCss(primitivePath: string): Promise<string> {
  const sd = new StyleDictionary({
    source: [primitivePath],
    log: { verbosity: "silent" },
    platforms: {
      css: cssPlatform([{ format: "css/variables" }]),
    },
  });
  return (await formatOutputs(sd)).join("");
}

/**
 * Color Scheme 하나의 Semantic을 `var()` 참조로 낸다.
 *
 * Primitive는 include로 참조를 풀 대상으로만 넘긴다. include로 읽은 토큰도 기본으로는 출력되므로,
 * filter로 source(Semantic)에서 읽은 토큰(isSource)만 낸다.
 * 출력에서 빠진 Primitive를 가리킨다는 "filtered out token references" 경고가 나지만 의도한 동작이고,
 * 로그를 silent로 꺼서 보이지 않는다.
 */
async function buildSemanticCss({
  primitivePath,
  semanticPath,
  colorScheme,
}: {
  primitivePath: string;
  semanticPath: string;
  colorScheme: ColorScheme;
}): Promise<string[]> {
  // 블록마다 selector가 달라 format을 블록마다 만든다.
  // 파일 설정의 format은 타입상 함수도 받지만 5.8은 등록된 이름만 찾으므로 이름을 붙여 등록한다.
  const formats = SCHEME_SELECTORS[colorScheme].map((selectors, index) => ({
    name: `gyeol/css/${colorScheme}-${index}`,
    format: createColorSchemeFormat({ colorScheme, selectors }),
  }));

  const sd = new StyleDictionary({
    include: [primitivePath],
    source: [semanticPath],
    log: { verbosity: "silent" },
    hooks: {
      formats: Object.fromEntries(formats.map((f) => [f.name, f.format])),
    },
    platforms: {
      css: cssPlatform(
        formats.map(({ name }) => ({
          format: name,
          filter: (token: TransformedToken) => token.isSource,
        })),
      ),
    },
  });
  return formatOutputs(sd);
}

/**
 * 토큰 폴더(`primitive.json`, `semantic/light.json`, `semantic/dark.json`이 들어 있는 폴더)를 읽어
 * CSS 텍스트를 돌려준다. 파일을 쓰지 않는다. 쓰는 일은 `build.ts`가 한다.
 */
export async function buildTokens(tokensDir: string): Promise<BuildResult> {
  const paths = tokenFilePaths(tokensDir);

  // Style Dictionary의 source와 include는 경로 하나라도 glob 패턴으로 풀고, 맞는 파일이 0개여도 오류가 아니다.
  // 그러면 토큰 없이 빌드가 끝나 빈 블록이 나온다. 넘기기 전에 파일이 있는지 확인해, 없으면 ENOENT로 실패한다.
  for (const path of [paths.primitive, ...Object.values(paths.semantic)]) {
    await access(path);
  }

  const cssBlocks = [await buildPrimitiveCss(paths.primitive)];
  for (const colorScheme of COLOR_SCHEMES) {
    cssBlocks.push(
      ...(await buildSemanticCss({
        primitivePath: paths.primitive,
        semanticPath: paths.semantic[colorScheme],
        colorScheme,
      })),
    );
  }
  return { css: cssBlocks.join("\n").trimEnd() + "\n" };
}
