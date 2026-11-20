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

/**
 * "alias + 투명도"를 CSS 값으로 쓴다. 참조 대상 변수 `--{variable}`을 불투명도 `alpha`(0–1)만큼 남기고 투명하게 섞는다.
 * 참조 대상 변수를 가리키므로 Color Scheme이 바뀌어 대상의 색이 바뀌면 함께 바뀐다.
 */
export function colorMix({
  variable,
  alpha,
}: {
  variable: string;
  alpha: number;
}): string {
  // 0.07 * 100 = 7.000000000000001 같은 부동소수점 오차를 지운다
  const percent = Number((alpha * 100).toFixed(4));
  return `color-mix(in srgb, var(--${variable}) ${percent}%, transparent)`;
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
