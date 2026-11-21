/** `@gyeol-ui/tokens/tokens.json`의 항목 하나 */
export interface PublicToken {
  path: string;
  type: "color" | "dimension";
  cssVariable: string;
}

/** Semantic의 Role마다 토큰을 넣을 Tailwind namespace */
const ROLE_NAMESPACES: Record<string, string> = {
  bg: "--background-color",
  fg: "--text-color",
  border: "--border-color",
  "ring-offset": "--ring-offset-color",
};

/** `alpha` 그룹(`bg-surface`의 투명도 단계)은 배경에 칠한다 */
const ALPHA_GROUP_NAMESPACE = "--background-color";

/** 색이 아닌 Primitive의 범주마다 토큰을 넣을 Tailwind namespace. 이름에서 범주를 뗀다 */
const CATEGORY_NAMESPACES: Record<string, string> = {
  spacing: "--spacing",
  radius: "--radius",
};

/** 토큰 하나를 `@theme`의 변수 이름으로 바꾼다 */
function toThemeVariable(token: PublicToken): string | undefined {
  const [first, ...rest] = token.path.split(".");
  if (first === undefined) return undefined;
  if (token.type === "dimension") {
    const namespace = CATEGORY_NAMESPACES[first];
    return namespace && `${namespace}-${rest.join("-")}`;
  }
  const name = token.path.replaceAll(".", "-");
  if (first === "alpha" && rest.length > 0) {
    return `${ALPHA_GROUP_NAMESPACE}-${name}`;
  }
  const role = Object.keys(ROLE_NAMESPACES).find(
    (candidate) => name === candidate || name.startsWith(`${candidate}-`),
  );
  return role && `${ROLE_NAMESPACES[role]}-${name}`;
}

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
  ].join("\n");
}
