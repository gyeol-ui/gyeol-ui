/** `@gyeol-ui/tokens/tokens.json`의 항목 하나. 모르는 `type`을 걸러 내려고 `type`을 문자열로 받는다 */
export interface PublicToken {
  path: string;
  type: string;
  cssVariable: string;
}

/** 범주별 스토리에 보여줄 Token 하나 */
export interface CategoryToken {
  path: string;
  cssVariable: string;
}

/** 토큰 스토리의 범주. 스토리 하나가 범주 하나다 */
export type TokenCategory = "color" | "spacing" | "radius";

export type TokensByCategory = Record<TokenCategory, CategoryToken[]>;

/** `dimension` 토큰은 경로의 첫 조각이 범주다 */
const DIMENSION_CATEGORIES: readonly TokenCategory[] = ["spacing", "radius"];

/**
 * 토큰 하나가 들어갈 범주를 찾는다.
 * `color`는 모두 색이고, `dimension`은 경로의 첫 조각(`spacing.4` → `spacing`)으로 나눈다.
 */
function findCategory(token: PublicToken): TokenCategory | undefined {
  if (token.type === "color") return "color";
  if (token.type !== "dimension") return undefined;
  const [first] = token.path.split(".");
  return DIMENSION_CATEGORIES.find((category) => category === first);
}

/**
 * 공개 토큰 목록을 범주별로 나눈다. 범주 안의 순서는 공개 토큰 목록의 순서를 따른다.
 * 범주를 정할 수 없는 토큰(모르는 `type`이나 범주)이 있으면, 그런 토큰을 모두 담아 실패한다.
 */
export function groupTokensByCategory(
  tokens: readonly PublicToken[],
): TokensByCategory {
  const groups: TokensByCategory = { color: [], spacing: [], radius: [] };
  const unknownTokens: string[] = [];
  for (const token of tokens) {
    const category = findCategory(token);
    if (category === undefined) {
      unknownTokens.push(`${token.path}(${token.type})`);
    } else {
      groups[category].push({
        path: token.path,
        cssVariable: token.cssVariable,
      });
    }
  }
  if (unknownTokens.length > 0) {
    throw new Error(
      `토큰 스토리의 범주를 정할 수 없는 토큰이 있다. type이 color이거나, dimension이면서 경로가 ${DIMENSION_CATEGORIES.map((category) => `${category}.*`).join(", ")} 중 하나여야 한다: ${unknownTokens.join(", ")}`,
    );
  }
  return groups;
}
