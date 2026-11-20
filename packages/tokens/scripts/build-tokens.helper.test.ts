// 헬퍼의 입력과 출력을 보여 주는 문서용 테스트다. 기대값은 손으로 쓴 결과 그대로다.
import { describe, expect, it } from "vitest";
import { colorSchemeBlock, tokenFilePaths } from "./build-tokens.helper.ts";

// 변수 줄을 Color Scheme 블록으로 감싼다
describe("colorSchemeBlock", () => {
  it("selector 하나: 블록 맨 앞에 color-scheme 줄을 넣고 들여 쓴다", () => {
    const block = colorSchemeBlock({
      colorScheme: "light",
      selectors: [":root"],
      variables: "--gyeol-bg-surface: var(--gyeol-color-white);",
    });

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
    const block = colorSchemeBlock({
      colorScheme: "dark",
      selectors: [
        "@media (prefers-color-scheme: dark)",
        ':root:not([data-color-scheme="light"])',
      ],
      variables: "--gyeol-bg-surface: var(--gyeol-color-gray-900);",
    });

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
    const block = colorSchemeBlock({
      colorScheme: "dark",
      selectors: [':root[data-color-scheme="dark"]'],
      variables: [
        "--gyeol-bg-surface: var(--gyeol-color-gray-900);",
        "--gyeol-ring-offset: var(--gyeol-bg-surface);",
      ].join("\n"),
    });

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
describe("tokenFilePaths", () => {
  it("Primitive 하나와 Color Scheme마다 Semantic 하나", () => {
    expect(tokenFilePaths("/repo/tokens")).toEqual({
      primitive: "/repo/tokens/primitive.json",
      semantic: {
        light: "/repo/tokens/semantic/light.json",
        dark: "/repo/tokens/semantic/dark.json",
      },
    });
  });
});
