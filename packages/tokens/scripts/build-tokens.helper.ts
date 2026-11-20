// build-tokens.ts가 쓰는 순수 변환 함수다. 입력과 출력은 build-tokens.helper.test.ts에서 볼 수 있다.
import { join } from "node:path";

export const COLOR_SCHEMES = ["light", "dark"] as const;

export type ColorScheme = (typeof COLOR_SCHEMES)[number];

/** 바깥에서 안쪽 순서로 중첩하는 selector 목록. 예: `["@media …", ":root"]` */
export type SelectorChain = readonly string[];

export interface TokenFilePaths {
  primitive: string;
  semantic: Record<ColorScheme, string>;
}

/** 토큰 폴더 안의 토큰 파일 경로. Figma collection의 mode 하나가 파일 하나다 */
export function tokenFilePaths(tokensDir: string): TokenFilePaths {
  return {
    primitive: join(tokensDir, "primitive.json"),
    semantic: {
      light: join(tokensDir, "semantic", "light.json"),
      dark: join(tokensDir, "semantic", "dark.json"),
    },
  };
}

const indentAt = (depth: number): string => "  ".repeat(depth);

/**
 * 들여쓰기 없는 변수 줄을 `selectors` 블록 안에 넣는다.
 * 맨 앞에 CSS color-scheme 줄을 넣고, 줄마다 중첩 깊이만큼 들여 쓰며, css/variables처럼 줄바꿈으로 끝낸다.
 */
export function colorSchemeBlock({
  colorScheme,
  selectors,
  variables,
}: {
  colorScheme: ColorScheme;
  selectors: SelectorChain;
  variables: string;
}): string {
  const indent = indentAt(selectors.length);
  const body = [`color-scheme: ${colorScheme};`, ...variables.split("\n")]
    .map((line) => `${indent}${line}`)
    .join("\n");
  const block = selectors.reduceRight(
    (content, selector, depth) =>
      `${indentAt(depth)}${selector} {\n${content}\n${indentAt(depth)}}`,
    body,
  );
  return `${block}\n`;
}
