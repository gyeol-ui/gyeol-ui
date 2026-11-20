import { readFile } from "node:fs/promises";
import { join } from "node:path";
import StyleDictionary from "style-dictionary";
import type {
  DesignTokens,
  File,
  FormatFn,
  PlatformConfig,
  TransformedToken,
} from "style-dictionary/types";
import { formattedVariables } from "style-dictionary/utils";

export interface BuildResult {
  /** `tokens.css`의 내용 */
  css: string;
}

const PREFIX = "gyeol";

type ColorScheme = "light" | "dark";

const COLOR_SCHEMES: readonly ColorScheme[] = ["light", "dark"];

/**
 * Color Scheme마다 Semantic을 내는 CSS 블록의 selector다.
 * 배열은 바깥에서 안쪽 순서로 중첩한다.
 * dark는 OS 설정(media query)과 data-color-scheme 속성, 두 블록에 같은 내용을 낸다.
 */
const SCHEME_SELECTORS: Record<ColorScheme, readonly (readonly string[])[]> = {
  light: [[":root"]],
  dark: [
    [
      "@media (prefers-color-scheme: dark)",
      ':root:not([data-color-scheme="light"])',
    ],
    ['[data-color-scheme="dark"]'],
  ],
};

/**
 * css/variables와 같은 변수 줄을 `selectors` 블록 안에 내되, 맨 앞에 CSS color-scheme 속성을 넣고
 * 헤더를 내지 않는다. 헤더는 Primitive 블록(파일 맨 위)에만 남긴다.
 */
const colorSchemeFormat =
  (colorScheme: ColorScheme, selectors: readonly string[]): FormatFn =>
  ({ dictionary }) => {
    const indent = "  ".repeat(selectors.length);
    const variables = formattedVariables({
      format: "css",
      dictionary,
      outputReferences: true,
      usesDtcg: true,
      formatting: { indentation: indent },
    });
    const body = `${indent}color-scheme: ${colorScheme};\n${variables}`;
    const block = selectors.reduceRight(
      (content, selector, depth) =>
        `${"  ".repeat(depth)}${selector} {\n${content}\n${"  ".repeat(depth)}}`,
      body,
    );
    // css/variables처럼 줄바꿈으로 끝낸다
    return `${block}\n`;
  };

const readJson = async (path: string): Promise<DesignTokens> =>
  JSON.parse(await readFile(path, "utf8"));

/** `tokens` 안에 `path` 경로의 토큰이 있는지 */
const hasTokenAt = (tokens: DesignTokens, path: readonly string[]): boolean => {
  let node: unknown = tokens;
  for (const key of path) {
    if (typeof node !== "object" || node === null || !(key in node)) {
      return false;
    }
    node = Reflect.get(node, key);
  }
  return typeof node === "object" && node !== null && "$value" in node;
};

// 실제로 일하는 transform은 name/kebab(이름), color/css(hex, rgba()), size/rem(dimension)이다.
//
// size/rem은 이름과 달리 px를 rem으로 바꾸지 않는다. unit이 적혀 있으면 그대로 붙이고
// ({16, "px"} → "16px"), unit 없는 숫자에만 "rem"을 붙인다. 토큰은 모두 px로 쓰므로 px로 나온다.
// size/px를 직접 고르지 않는 이유: size/px는 unit을 무시해 {1.5, "rem"}도 "1.5px"로 낸다.
const cssPlatform = (files: File[]): PlatformConfig => ({
  prefix: PREFIX,
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
async function buildPrimitiveCss(primitive: DesignTokens): Promise<string> {
  const sd = new StyleDictionary({
    tokens: primitive,
    log: { verbosity: "silent" },
    platforms: {
      css: cssPlatform([
        { destination: "tokens.css", format: "css/variables" },
      ]),
    },
  });
  return (await formatOutputs(sd)).join("");
}

/**
 * Color Scheme 하나의 Semantic을 `var()` 참조로 낸다.
 *
 * Primitive는 참조를 풀 대상으로만 함께 넘기고, filter로 Semantic만 출력한다.
 * include 옵션은 source처럼 경로를 glob으로 풀어 "파일을 직접 읽는다"는 방침과 맞지 않아 쓰지 않는다.
 * 출력에서 빠진 Primitive를 가리킨다는 "filtered out token references" 경고가 나지만 의도한 동작이고,
 * 로그를 silent로 꺼서 보이지 않는다.
 */
async function buildSemanticCss(
  primitive: DesignTokens,
  semantic: DesignTokens,
  colorScheme: ColorScheme,
): Promise<string[]> {
  // 블록마다 selector가 달라 format을 블록마다 만든다.
  // 파일 설정의 format은 타입상 함수도 받지만 5.8은 등록된 이름만 찾으므로 이름을 붙여 등록한다.
  const blocks = SCHEME_SELECTORS[colorScheme].map((selectors, index) => ({
    name: `gyeol/css/${colorScheme}-${index}`,
    format: colorSchemeFormat(colorScheme, selectors),
  }));

  // Semantic에는 범주 그룹이 없어 최상위 이름이 Primitive 범주(color, spacing, radius)와 겹치지 않는다
  const sd = new StyleDictionary({
    tokens: { ...primitive, ...semantic },
    log: { verbosity: "silent" },
    hooks: {
      formats: Object.fromEntries(blocks.map((b) => [b.name, b.format])),
    },
    platforms: {
      css: cssPlatform(
        blocks.map(({ name }) => ({
          destination: `${name}.css`,
          format: name,
          filter: (token: TransformedToken) => hasTokenAt(semantic, token.path),
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
  // 파일 경로를 Style Dictionary의 source 옵션으로 넘기지 않고 직접 읽는다.
  // source의 항목은 경로 하나라도 glob 패턴으로 풀리고, 맞는 파일이 0개여도 오류가 아니다.
  // 그러면 토큰 없이 빌드가 끝나 빈 ":root {}"가 나온다. 직접 읽으면 파일이 없을 때 ENOENT로 실패한다.
  const primitive = await readJson(join(tokensDir, "primitive.json"));

  const blocks = [await buildPrimitiveCss(primitive)];
  for (const colorScheme of COLOR_SCHEMES) {
    const semantic = await readJson(
      join(tokensDir, "semantic", `${colorScheme}.json`),
    );
    blocks.push(...(await buildSemanticCss(primitive, semantic, colorScheme)));
  }
  return { css: blocks.join("\n").trimEnd() + "\n" };
}
