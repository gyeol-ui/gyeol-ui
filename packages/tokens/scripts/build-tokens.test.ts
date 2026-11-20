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

test("실제 씨앗 토큰 폴더로 빌드가 성공한다", async () => {
  const tokensDir = fileURLToPath(new URL("../tokens", import.meta.url));
  const { css } = await buildTokens(tokensDir);

  // 값은 Figma에서 바뀔 수 있으므로 이름만 확인한다
  expect(css).toMatch(/--gyeol-color-gray-900: \S+;/);
  expect(css).toMatch(/--gyeol-spacing-4: \S+;/);
  expect(css).toMatch(/--gyeol-radius-md: \S+;/);
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
    "
  `);
});
