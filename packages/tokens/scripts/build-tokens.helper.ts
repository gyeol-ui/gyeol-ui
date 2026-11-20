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
export function resolveTokenFilePaths(tokensDir: string): TokenFilePaths {
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
export function formatColorMix({
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

const formatIndent = (depth: number): string => "  ".repeat(depth);

const HEX_COLOR = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const RGBA_COLOR = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/;

/**
 * "alias + 투명도"의 실제 색을 `rgba()`로 쓴다. CSS의 `color-mix(in srgb, 색 N%, transparent)`와 같은 결과다:
 * 색의 RGB는 그대로 두고, 불투명도에 `alpha`(0–1)를 곱한다.
 * `color`는 Style Dictionary의 `color/css`가 내는 모양(`#rrggbb`나 `rgba(r, g, b, a)`)이다.
 */
export function formatAlphaColor({
  color,
  alpha,
}: {
  color: string;
  alpha: number;
}): string {
  const hex = HEX_COLOR.exec(color);
  const rgba = RGBA_COLOR.exec(color);
  const [r, g, b, a] = hex
    ? [...hex.slice(1, 4).map((part) => parseInt(part, 16)), 1]
    : rgba
      ? rgba.slice(1, 5).map(Number)
      : [];
  if (
    r === undefined ||
    g === undefined ||
    b === undefined ||
    a === undefined
  ) {
    throw new Error(`${color}: hex나 rgba() 색이 아니다`);
  }
  // 0.07 * 100 같은 곱셈의 부동소수점 오차를 지운다
  const opacity = Number((a * alpha).toFixed(4));
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/** 토큰 경로의 이름 칸(kebab-case)을 TS 키(camelCase)로 바꾼다. 예: `bg-surface` → `bgSurface` */
export const toCamelCase = (name: string): string =>
  name.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());

/** TS 객체로 낼 토큰 하나. `path`는 토큰 경로이고 `value`는 낼 문자열이다 */
export interface TsEntry {
  path: readonly string[];
  value: string;
}

/** 키를 camelCase로 바꾼 토큰 경로를 따라 중첩한 객체. 잎은 낼 문자열이다 */
type TsTree = Map<string, string | TsTree>;

/** 토큰 목록을 경로대로 중첩한다 */
function toTsTree(entries: readonly TsEntry[]): TsTree {
  const root: TsTree = new Map();
  for (const { path, value } of entries) {
    const keys = path.map(toCamelCase);
    const leafKey = keys.at(-1);
    // 토큰 경로는 비어 있지 않다. 타입을 좁히는 가드다
    if (leafKey === undefined) continue;
    let node = root;
    for (const key of keys.slice(0, -1)) {
      const child = node.get(key);
      const group: TsTree = child instanceof Map ? child : new Map();
      node.set(key, group);
      node = group;
    }
    node.set(leafKey, value);
  }
  return root;
}

/** 식별자나 0 이상의 정수면 따옴표 없이, 아니면 따옴표로 쓴다 */
const formatTsKey = (key: string): string =>
  /^[A-Za-z_$][\w$]*$/.test(key) || /^(0|[1-9]\d*)$/.test(key)
    ? key
    : JSON.stringify(key);

/** 중첩한 객체를 TS 객체 리터럴로 쓴다. `depth`는 닫는 괄호의 들여쓰기 깊이다 */
function formatTsObject({
  tree,
  depth,
}: {
  tree: TsTree;
  depth: number;
}): string {
  const lines = [...tree].map(
    ([key, value]) =>
      `${formatIndent(depth + 1)}${formatTsKey(key)}: ${
        typeof value === "string"
          ? JSON.stringify(value)
          : formatTsObject({ tree: value, depth: depth + 1 })
      },`,
  );
  return `{\n${lines.join("\n")}\n${formatIndent(depth)}}`;
}

/**
 * `@gyeol-ui/tokens`의 TS 소스를 쓴다. 경로의 이름 칸은 camelCase 키가 되고, 그룹은 중첩 객체가 된다.
 * `as const`로 값의 리터럴 타입을 남긴다.
 */
export function formatTsModule({
  tokens,
  values,
}: {
  tokens: readonly TsEntry[];
  values: Record<ColorScheme, readonly TsEntry[]>;
}): string {
  const valuesTree: TsTree = new Map(
    COLOR_SCHEMES.map((colorScheme) => [
      colorScheme,
      toTsTree(values[colorScheme]),
    ]),
  );
  return [
    "/**",
    " * Do not edit directly, this file was auto-generated.",
    " */",
    "",
    "/** CSS 변수 참조. Semantic 색과 spacing, radius를 담는다 */",
    `export const tokens = ${formatTsObject({ tree: toTsTree(tokens), depth: 0 })} as const;`,
    "",
    "/** Color Scheme별 Semantic의 실제 색. CSS 밖(예: 상태바 색을 브리지로 넘길 때)에서 쓴다 */",
    `export const values = ${formatTsObject({ tree: valuesTree, depth: 0 })} as const;`,
    "",
  ].join("\n");
}

/**
 * 들여쓰기 없는 변수 줄을 `selectors` 블록 안에 넣는다.
 * 맨 앞에 CSS color-scheme 줄을 넣고, 줄마다 중첩 깊이만큼 들여 쓰며, css/variables처럼 줄바꿈으로 끝낸다.
 */
export function wrapInColorSchemeBlock({
  colorScheme,
  selectors,
  variables,
}: {
  colorScheme: ColorScheme;
  selectors: SelectorChain;
  variables: string;
}): string {
  const indent = formatIndent(selectors.length);
  const body = [`color-scheme: ${colorScheme};`, ...variables.split("\n")]
    .map((line) => `${indent}${line}`)
    .join("\n");
  const block = selectors.reduceRight(
    (content, selector, depth) =>
      `${formatIndent(depth)}${selector} {\n${content}\n${formatIndent(depth)}}`,
    body,
  );
  return `${block}\n`;
}
