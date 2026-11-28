import { describe, expect, it } from "vitest";
import { collectRules, findDeclarations } from "./css-rules.ts";

describe("collectRules", () => {
  it("클래스를 고르는 규칙마다 선택자와 선언을 돌려준다", () => {
    // given, when
    const rules = collectRules({
      css: `
        .p-4 { padding: 16px; }
        .m-4 { margin: 16px; }
      `,
      className: "p-4",
    });

    // then
    expect(rules).toEqual([
      {
        media: undefined,
        selector: ".p-4",
        declarations: { padding: "16px" },
      },
    ]);
  });

  it("@media 안의 규칙은 그 조건을 media에 담는다", () => {
    // given, when
    const rules = collectRules({
      css: `
        @media (prefers-color-scheme: dark) {
          .dark\\:opacity-80 { opacity: 80%; }
        }
        .dark\\:opacity-80:where(.dark *) { opacity: 80%; }
      `,
      className: "dark:opacity-80",
    });

    // then
    expect(rules).toEqual([
      {
        media: "(prefers-color-scheme: dark)",
        selector: ".dark\\:opacity-80",
        declarations: { opacity: "80%" },
      },
      {
        media: undefined,
        selector: ".dark\\:opacity-80:where(.dark *)",
        declarations: { opacity: "80%" },
      },
    ]);
  });

  it("이름이 그 클래스로 시작하는 다른 클래스는 고르지 않는다", () => {
    // given, when
    const rules = collectRules({
      css: `
        .p-40 { padding: 160px; }
        .p-4-x { padding: 1px; }
      `,
      className: "p-4",
    });

    // then
    expect(rules).toEqual([]);
  });
});

describe("findDeclarations", () => {
  it("클래스를 고르는 규칙이 여럿이면 선언을 하나로 합친다", () => {
    // given, when
    const declarations = findDeclarations({
      css: `
        .divide-x > :not(:last-child) { border-color: red; }
        @media (hover: hover) {
          .divide-x:hover { border-width: 1px; }
        }
      `,
      className: "divide-x",
    });

    // then
    expect(declarations).toEqual({
      "border-color": "red",
      "border-width": "1px",
    });
  });

  it("클래스를 고르는 규칙이 없으면 undefined", () => {
    // given, when
    const declarations = findDeclarations({
      css: ".p-4 { padding: 16px; }",
      className: "p-5",
    });

    // then
    expect(declarations).toBeUndefined();
  });
});
