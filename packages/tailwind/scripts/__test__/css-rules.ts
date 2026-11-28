import postcss, { AtRule } from "postcss";

/** CSS 규칙 하나. 감싼 `@media`의 조건(없으면 undefined), 선택자, 선언(속성 → 값) */
export interface CssRule {
  media: string | undefined;
  selector: string;
  declarations: Record<string, string>;
}

/**
 * CSS에서 클래스를 고르는 규칙을 모두 모은다.
 * 클래스 이름은 HTML에 쓰는 그대로 받는다(`dark:opacity-80`). CSS의 이스케이프(`.dark\:opacity-80`)는 이 함수가 맞춘다.
 *
 * @example
 * collectRules({
 *   css: "@media (hover: hover) { .a:hover { color: red; } }",
 *   className: "a",
 * });
 * // [{ media: "(hover: hover)", selector: ".a:hover", declarations: { color: "red" } }]
 */
export function collectRules({
  css,
  className,
}: {
  css: string;
  className: string;
}): CssRule[] {
  const escaped = className
    .replaceAll(":", "\\:")
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const selector = new RegExp(`\\.${escaped}(?![\\w-])`);
  const rules: CssRule[] = [];
  postcss.parse(css).walkRules((rule) => {
    if (!selector.test(rule.selector)) return;
    const declarations: Record<string, string> = {};
    rule.walkDecls((decl) => {
      declarations[decl.prop] = decl.value;
    });
    const media =
      rule.parent instanceof AtRule && rule.parent.name === "media"
        ? rule.parent.params
        : undefined;
    rules.push({ media, selector: rule.selector, declarations });
  });
  return rules;
}

/**
 * CSS에서 클래스를 고르는 규칙들의 선언을 하나로 합친다. 규칙이 없으면 undefined.
 * 조건(`@media`, 선택자)은 버리므로, 클래스가 어떤 값을 내는지만 볼 때 쓴다.
 *
 * @example
 * findDeclarations({ css: ".p-4 { padding: 16px; }", className: "p-4" });
 * // { padding: "16px" }
 */
export function findDeclarations({
  css,
  className,
}: {
  css: string;
  className: string;
}): Record<string, string> | undefined {
  const rules = collectRules({ css, className });
  if (rules.length === 0) return undefined;
  return Object.assign({}, ...rules.map(({ declarations }) => declarations));
}
