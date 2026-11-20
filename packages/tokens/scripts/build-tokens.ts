import { access } from "node:fs/promises";
import StyleDictionary from "style-dictionary";
import type {
  File,
  FormatFn,
  PlatformConfig,
  TransformedToken,
} from "style-dictionary/types";
import { formattedVariables } from "style-dictionary/utils";
import {
  COLOR_SCHEMES,
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
        dictionary,
        outputReferences: true,
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
