import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildTokens } from "./build-tokens.ts";

const fixture = (name: string): string =>
  fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

describe("buildTokens", () => {
  describe("Primitive 블록", () => {
    it("Primitive를 :root에 --gyeol- 접두사 CSS 변수로 낸다", async () => {
      // given, when
      const { css } = await buildTokens(fixture("valid"));

      // then
      expect(css).toContain(":root {");
      expect(css).toContain("--gyeol-color-white: #ffffff;");
      expect(css).toContain("--gyeol-color-gray-900: #18181b;");
      expect(css).toContain("--gyeol-spacing-4: 16px;");
      expect(css).toContain("--gyeol-radius-md: 6px;");
    });

    it("alpha가 있는 색은 rgba()로 낸다", async () => {
      // given, when
      const { css } = await buildTokens(fixture("valid"));

      // then
      expect(css).toContain("--gyeol-color-overlay: rgba(0, 0, 0, 0.5);");
    });
  });

  describe("Semantic 블록", () => {
    it("light Semantic을 :root 블록에 color-scheme: light와 var() 참조로 낸다", async () => {
      // given, when
      const { css } = await buildTokens(fixture("valid"));

      // then
      expect(css).toContain(
        [
          ":root {",
          "  color-scheme: light;",
          "  --gyeol-bg-surface: var(--gyeol-color-white);",
        ].join("\n"),
      );
      expect(css).toContain(
        "  --gyeol-fg-default: var(--gyeol-color-gray-900);",
      );
    });

    it("dark Semantic을 OS 설정 media query 블록에 color-scheme: dark로 낸다", async () => {
      // given, when
      const { css } = await buildTokens(fixture("valid"));

      // then
      expect(css).toContain(
        [
          "@media (prefers-color-scheme: dark) {",
          '  :root:not([data-color-scheme="light"]) {',
          "    color-scheme: dark;",
          "    --gyeol-bg-surface: var(--gyeol-color-gray-900);",
        ].join("\n"),
      );
    });

    it("dark Semantic을 <html>의 data-color-scheme 속성 블록에도 color-scheme: dark로 낸다", async () => {
      // given, when
      const { css } = await buildTokens(fixture("valid"));

      // then
      expect(css).toContain(
        [
          ':root[data-color-scheme="dark"] {',
          "  color-scheme: dark;",
          "  --gyeol-bg-surface: var(--gyeol-color-gray-900);",
        ].join("\n"),
      );
    });

    it("Semantic이 다른 Semantic을 가리키면 그 Semantic 변수를 var()로 낸다", async () => {
      // given, when
      const { css } = await buildTokens(fixture("valid"));

      // then
      expect(css).toContain("--gyeol-ring-offset: var(--gyeol-bg-surface);");
    });

    it("Semantic 블록에는 Primitive 변수를 다시 내지 않는다", async () => {
      // given, when
      const { css } = await buildTokens(fixture("valid"));

      // then
      expect(css.match(/--gyeol-color-white:/g)).toHaveLength(1);
    });

    it("data-color-scheme 속성은 <html>에서만 Color Scheme을 바꾼다", async () => {
      // given, when
      const { css } = await buildTokens(fixture("valid"));

      // then: 모든 블록의 selector가 :root로 시작하므로 하위 요소의 속성은 아무 블록에도 맞지 않는다
      const selectors = [...css.matchAll(/^\s*([^\s@/*].*) \{$/gm)].map(
        ([, selector]) => selector,
      );
      expect(selectors).toEqual([
        ":root",
        ":root",
        ':root:not([data-color-scheme="light"])',
        ':root[data-color-scheme="dark"]',
      ]);
    });
  });

  describe("토큰 폴더", () => {
    it("실제 씨앗 토큰 폴더로 빌드가 성공한다", async () => {
      // given
      const tokensDir = fileURLToPath(new URL("../tokens", import.meta.url));

      // when
      const { css } = await buildTokens(tokensDir);

      // then: 값은 Figma에서 바뀔 수 있으므로 이름만 확인한다
      expect(css).toMatch(/--gyeol-color-gray-900: \S+;/);
      expect(css).toMatch(/--gyeol-spacing-4: \S+;/);
      expect(css).toMatch(/--gyeol-radius-md: \S+;/);
      expect(css).toMatch(/--gyeol-bg-surface: var\(--gyeol-\S+\);/);
      expect(css).toContain("--gyeol-ring-offset: var(--gyeol-bg-surface);");
    });

    it("토큰 폴더에 primitive.json이 없으면 실패한다", async () => {
      // given, when
      const result = buildTokens(fixture("does-not-exist"));

      // then
      await expect(result).rejects.toThrow("primitive.json");
    });

    it("토큰 폴더에 Semantic 파일이 없으면 실패한다", async ({
      onTestFinished,
    }) => {
      // given: primitive.json만 있는 토큰 폴더
      const tokensDir = await mkdtemp(join(tmpdir(), "gyeol-tokens-"));
      onTestFinished(() => rm(tokensDir, { recursive: true, force: true }));
      await cp(
        fixture("valid/primitive.json"),
        join(tokensDir, "primitive.json"),
      );

      // when
      const result = buildTokens(tokensDir);

      // then
      await expect(result).rejects.toThrow("light.json");
    });
  });

  describe("전체 출력", () => {
    it("fixture의 CSS 출력 전체", async () => {
      // given, when
      const { css } = await buildTokens(fixture("valid"));

      // then
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

        :root[data-color-scheme="dark"] {
          color-scheme: dark;
          --gyeol-bg-surface: var(--gyeol-color-gray-900);
          --gyeol-fg-default: var(--gyeol-color-white);
          --gyeol-ring-offset: var(--gyeol-bg-surface);
        }
        "
      `);
    });
  });
});
