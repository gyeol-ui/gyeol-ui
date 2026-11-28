import {
  CATEGORY_NAMESPACES,
  type PublicToken,
  ROLE_NAMESPACES,
  toThemeVariable,
} from "./format-theme.helper.ts";

export type { PublicToken };

/**
 * 공개 토큰 목록으로 Tailwind 테마(`theme.css`) 텍스트를 쓴다.
 * 표에 없는 Role이나 범주의 토큰이 있으면, 그런 토큰의 경로를 모두 담아 실패한다.
 */
export function formatTheme(tokens: readonly PublicToken[]): string {
  const declarations: string[] = [];
  const unknownPaths: string[] = [];
  for (const token of tokens) {
    const variable = toThemeVariable(token);
    if (variable === undefined) {
      unknownPaths.push(token.path);
    } else {
      declarations.push(`  ${variable}: var(${token.cssVariable});`);
    }
  }
  if (unknownPaths.length > 0) {
    throw new Error(
      `Tailwind namespace를 정할 수 없는 토큰이 있다. Role(${Object.keys(ROLE_NAMESPACES).join(", ")}), alpha 그룹, 범주(${Object.keys(CATEGORY_NAMESPACES).join(", ")}) 중 하나여야 한다: ${unknownPaths.join(", ")}`,
    );
  }
  return [
    `@import "@gyeol-ui/tokens/tokens.css";`,
    "",
    "@theme inline {",
    "  --color-*: initial;",
    "  --spacing: initial;",
    "  --radius-*: initial;",
    "  --spacing-0: 0px;",
    ...declarations,
    "}",
    "",
    // 토큰의 Color Scheme 규칙과 같게 켠다: OS가 dark이고 <html>에 data-color-scheme="light"가 없을 때, 또는 <html data-color-scheme="dark">일 때.
    // :where()로 감싸 명시도를 클래스 하나로 유지한다.
    "@custom-variant dark {",
    "  @media (prefers-color-scheme: dark) {",
    `    &:where(:root:not([data-color-scheme="light"]), :root:not([data-color-scheme="light"]) *) { @slot; }`,
    "  }",
    `  &:where(:root[data-color-scheme="dark"], :root[data-color-scheme="dark"] *) { @slot; }`,
    "}",
    "",
  ].join("\n");
}
