import { cp, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { buildTokens } from "./build-tokens.ts";

const fixture = (name: string): string =>
  fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

test("Primitive를 :root에 --gyeol- 접두사 CSS 변수로 낸다", async () => {
  const { css } = await buildTokens(fixture("valid"));

  expect(css).toContain(":root {");
  expect(css).toContain("--gyeol-color-white: #ffffff;");
  expect(css).toContain("--gyeol-color-gray-900: #18181b;");
  expect(css).toContain("--gyeol-spacing-4: 16px;");
  expect(css).toContain("--gyeol-radius-md: 6px;");
});

test("alpha가 있는 색은 rgba()로 낸다", async () => {
  const { css } = await buildTokens(fixture("valid"));

  expect(css).toContain("--gyeol-color-overlay: rgba(0, 0, 0, 0.5);");
});

test("light Semantic을 :root 블록에 color-scheme: light와 var() 참조로 낸다", async () => {
  const { css } = await buildTokens(fixture("valid"));

  expect(css).toContain(
    [
      ":root {",
      "  color-scheme: light;",
      "  --gyeol-bg-surface: var(--gyeol-color-white);",
    ].join("\n"),
  );
  expect(css).toContain("  --gyeol-fg-default: var(--gyeol-color-gray-900);");
});

test("dark Semantic을 OS 설정 media query 블록에 color-scheme: dark로 낸다", async () => {
  const { css } = await buildTokens(fixture("valid"));

  expect(css).toContain(
    [
      "@media (prefers-color-scheme: dark) {",
      '  :root:not([data-color-scheme="light"]) {',
      "    color-scheme: dark;",
      "    --gyeol-bg-surface: var(--gyeol-color-gray-900);",
    ].join("\n"),
  );
});

test("dark Semantic을 data-color-scheme 속성 블록에도 color-scheme: dark로 낸다", async () => {
  const { css } = await buildTokens(fixture("valid"));

  expect(css).toContain(
    [
      '[data-color-scheme="dark"] {',
      "  color-scheme: dark;",
      "  --gyeol-bg-surface: var(--gyeol-color-gray-900);",
    ].join("\n"),
  );
});

test("Semantic이 다른 Semantic을 가리키면 그 Semantic 변수를 var()로 낸다", async () => {
  const { css } = await buildTokens(fixture("valid"));

  expect(css).toContain("--gyeol-ring-offset: var(--gyeol-bg-surface);");
});

test("Semantic 블록에는 Primitive 변수를 다시 내지 않는다", async () => {
  const { css } = await buildTokens(fixture("valid"));

  expect(css.match(/--gyeol-color-white:/g)).toHaveLength(1);
});

test("토큰 폴더에 Semantic 파일이 없으면 실패한다", async () => {
  const dir = await mkdtemp(join(tmpdir(), "gyeol-tokens-"));
  await cp(fixture("valid/primitive.json"), join(dir, "primitive.json"));

  await expect(buildTokens(dir)).rejects.toThrow("light.json");
});

test("실제 씨앗 토큰 폴더로 빌드가 성공한다", async () => {
  const tokensDir = fileURLToPath(new URL("../tokens", import.meta.url));
  const { css } = await buildTokens(tokensDir);

  // 값은 Figma에서 바뀔 수 있으므로 이름만 확인한다
  expect(css).toMatch(/--gyeol-color-gray-900: \S+;/);
  expect(css).toMatch(/--gyeol-spacing-4: \S+;/);
  expect(css).toMatch(/--gyeol-radius-md: \S+;/);
  expect(css).toMatch(/--gyeol-bg-surface: var\(--gyeol-\S+\);/);
  expect(css).toContain("--gyeol-ring-offset: var(--gyeol-bg-surface);");
});

test("토큰 폴더에 primitive.json이 없으면 실패한다", async () => {
  await expect(buildTokens(fixture("does-not-exist"))).rejects.toThrow(
    "primitive.json",
  );
});

test("fixture의 CSS 출력 전체", async () => {
  const { css } = await buildTokens(fixture("valid"));

  expect(css).toMatchInlineSnapshot(`
    "/**
     * Do not edit directly, this file was auto-generated.
     */

    :root {
      --gyeol-color-white: #ffffff;
      --gyeol-color-gray-900: #18181b;
      --gyeol-color-overlay: rgba(0, 0, 0, 0.5);
      --gyeol-spacing-4: 16px;
      --gyeol-radius-md: 6px;
    }

    :root {
      color-scheme: light;
      --gyeol-bg-surface: var(--gyeol-color-white);
      --gyeol-fg-default: var(--gyeol-color-gray-900);
      --gyeol-ring-offset: var(--gyeol-bg-surface);
    }

    @media (prefers-color-scheme: dark) {
      :root:not([data-color-scheme="light"]) {
        color-scheme: dark;
        --gyeol-bg-surface: var(--gyeol-color-gray-900);
        --gyeol-fg-default: var(--gyeol-color-white);
        --gyeol-ring-offset: var(--gyeol-bg-surface);
      }
    }

    [data-color-scheme="dark"] {
      color-scheme: dark;
      --gyeol-bg-surface: var(--gyeol-color-gray-900);
      --gyeol-fg-default: var(--gyeol-color-white);
      --gyeol-ring-offset: var(--gyeol-bg-surface);
    }
    "
  `);
});
