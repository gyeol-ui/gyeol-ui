/** `@gyeol-ui/tokens/tokens.json`의 항목 하나 */
export interface PublicToken {
  path: string;
  type: "color" | "dimension";
  cssVariable: string;
}

/** Semantic의 Role마다 토큰을 넣을 Tailwind namespace */
export const ROLE_NAMESPACES: Readonly<Record<string, string>> = {
  bg: "--background-color",
  fg: "--text-color",
  border: "--border-color",
  "ring-offset": "--ring-offset-color",
};

/** `alpha` 그룹(`bg-surface`의 투명도 단계)은 배경에 칠한다 */
const ALPHA_GROUP_NAMESPACE = "--background-color";

/** 색이 아닌 Primitive의 범주마다 토큰을 넣을 Tailwind namespace. 이름에서 범주를 뗀다 */
export const CATEGORY_NAMESPACES: Readonly<Record<string, string>> = {
  spacing: "--spacing",
  radius: "--radius",
};

/**
 * 토큰 하나를 `@theme`의 변수 이름으로 바꾼다.
 * 표에 없는 Role이나 범주라 namespace를 정할 수 없으면 undefined를 돌려준다.
 */
export function toThemeVariable(token: PublicToken): string | undefined {
  const [first, ...rest] = token.path.split(".");
  if (first === undefined) return undefined;
  if (token.type === "dimension") {
    const namespace = CATEGORY_NAMESPACES[first];
    return namespace && rest.length > 0
      ? `${namespace}-${rest.join("-")}`
      : undefined;
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
