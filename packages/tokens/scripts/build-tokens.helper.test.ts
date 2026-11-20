// 헬퍼의 입력과 출력을 보여 주는 문서용 테스트다. 기대값은 손으로 쓴 결과 그대로다.
import { describe, expect, it } from "vitest";
import {
  formatColorMix,
  formatTsModule,
  wrapInColorSchemeBlock,
  resolveTokenFilePaths,
} from "./build-tokens.helper.ts";

// alias + 투명도를 CSS color-mix()로 쓴다
describe("formatColorMix", () => {
  it("참조 대상 변수를 불투명도 %만큼 transparent와 섞는다", () => {
    // given, when
    const value = formatColorMix({ variable: "gyeol-bg-surface", alpha: 0.9 });

    // then
    expect(value).toBe(
      "color-mix(in srgb, var(--gyeol-bg-surface) 90%, transparent)",
    );
  });

  it("%는 부동소수점 오차 없이 쓴다", () => {
    // given, when: 0.07 * 100은 7.000000000000001이다
    const value = formatColorMix({
      variable: "gyeol-color-white",
      alpha: 0.07,
    });

    // then
    expect(value).toBe(
      "color-mix(in srgb, var(--gyeol-color-white) 7%, transparent)",
    );
  });

  it("소수점 아래 %도 쓴다", () => {
    // given, when
    const value = formatColorMix({
      variable: "gyeol-color-white",
      alpha: 0.125,
    });

    // then
    expect(value).toBe(
      "color-mix(in srgb, var(--gyeol-color-white) 12.5%, transparent)",
    );
  });
});

// 변수 줄을 Color Scheme 블록으로 감싼다
describe("wrapInColorSchemeBlock", () => {
  it("selector 하나: 블록 맨 앞에 color-scheme 줄을 넣고 들여 쓴다", () => {
    // given, when
    const block = wrapInColorSchemeBlock({
      colorScheme: "light",
      selectors: [":root"],
      variables: "--gyeol-bg-surface: var(--gyeol-color-white);",
    });

    // then
    expect(block).toBe(
      [
        ":root {",
        "  color-scheme: light;",
        "  --gyeol-bg-surface: var(--gyeol-color-white);",
        "}",
        "",
      ].join("\n"),
    );
  });

  it("selector 여럿: 앞의 것이 바깥인 중첩 블록이 되고, 깊이만큼 들여 쓴다", () => {
    // given, when
    const block = wrapInColorSchemeBlock({
      colorScheme: "dark",
      selectors: [
        "@media (prefers-color-scheme: dark)",
        ':root:not([data-color-scheme="light"])',
      ],
      variables: "--gyeol-bg-surface: var(--gyeol-color-gray-900);",
    });

    // then
    expect(block).toBe(
      [
        "@media (prefers-color-scheme: dark) {",
        '  :root:not([data-color-scheme="light"]) {',
        "    color-scheme: dark;",
        "    --gyeol-bg-surface: var(--gyeol-color-gray-900);",
        "  }",
        "}",
        "",
      ].join("\n"),
    );
  });

  it("변수 줄이 여럿이면 줄마다 들여 쓴다", () => {
    // given, when
    const block = wrapInColorSchemeBlock({
      colorScheme: "dark",
      selectors: [':root[data-color-scheme="dark"]'],
      variables: [
        "--gyeol-bg-surface: var(--gyeol-color-gray-900);",
        "--gyeol-ring-offset: var(--gyeol-bg-surface);",
      ].join("\n"),
    });

    // then
    expect(block).toBe(
      [
        ':root[data-color-scheme="dark"] {',
        "  color-scheme: dark;",
        "  --gyeol-bg-surface: var(--gyeol-color-gray-900);",
        "  --gyeol-ring-offset: var(--gyeol-bg-surface);",
        "}",
        "",
      ].join("\n"),
    );
  });
});

// 토큰 폴더에서 토큰 파일 경로를 만든다
describe("resolveTokenFilePaths", () => {
  it("Primitive 하나와 Color Scheme마다 Semantic 하나", () => {
    // given, when
    const paths = resolveTokenFilePaths("/repo/tokens");

    // then
    expect(paths).toEqual({
      primitive: "/repo/tokens/primitive.json",
      semantic: {
        light: "/repo/tokens/semantic/light.json",
        dark: "/repo/tokens/semantic/dark.json",
      },
    });
  });
});

// 토큰 목록을 TS 소스로 쓴다
describe("formatTsModule", () => {
  it("경로를 camelCase 키의 중첩 객체로 쓰고 as const를 붙인다", () => {
    // given, when
    const ts = formatTsModule({
      tokens: [
        { path: ["bg-surface"], value: "var(--gyeol-bg-surface)" },
        { path: ["alpha", "90"], value: "var(--gyeol-alpha-90)" },
        { path: ["spacing", "4"], value: "var(--gyeol-spacing-4)" },
      ],
      values: {
        light: [{ path: ["bg-surface"], value: "#ffffff" }],
        dark: [{ path: ["bg-surface"], value: "#18181b" }],
      },
    });

    // then
    expect(ts).toBe(
      [
        "/**",
        " * Do not edit directly, this file was auto-generated.",
        " */",
        "",
        "/** CSS 변수 참조. Semantic 색과 spacing, radius를 담는다 */",
        "export const tokens = {",
        '  bgSurface: "var(--gyeol-bg-surface)",',
        "  alpha: {",
        '    90: "var(--gyeol-alpha-90)",',
        "  },",
        "  spacing: {",
        '    4: "var(--gyeol-spacing-4)",',
        "  },",
        "} as const;",
        "",
        "/** Color Scheme별 Semantic의 실제 색. CSS 밖(예: 상태바 색을 브리지로 넘길 때)에서 쓴다 */",
        "export const values = {",
        "  light: {",
        '    bgSurface: "#ffffff",',
        "  },",
        "  dark: {",
        '    bgSurface: "#18181b",',
        "  },",
        "} as const;",
        "",
      ].join("\n"),
    );
  });
});
