import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, onTestFinished } from "vitest";
import { buildTokens } from "./build-tokens.ts";
import { TokenValidationError } from "./validate-tokens.ts";

const resolveFixturePath = (name: string): string =>
  fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

const toSrgbColor = (...components: number[]) => ({
  colorSpace: "srgb",
  components,
});

/** 규칙을 지키는 가장 작은 토큰. 잘못된 fixture는 이 중 한 파일만 바꿔서 만든다 */
const MINIMAL = {
  primitive: {
    color: {
      $type: "color",
      white: { $value: toSrgbColor(1, 1, 1) },
      black: { $value: toSrgbColor(0, 0, 0) },
    },
    spacing: {
      $type: "dimension",
      "4": { $value: { value: 16, unit: "px" } },
    },
  },
  light: {
    "bg-surface": { $type: "color", $value: "{color.white}" },
  },
  dark: {
    "bg-surface": { $type: "color", $value: "{color.black}" },
  },
};

/**
 * 임시 토큰 폴더를 만든다. 넘기지 않은 파일은 MINIMAL의 것을 쓴다.
 * 폴더는 테스트가 끝나면 지운다.
 */
async function createTokensDir(
  files: Partial<Record<keyof typeof MINIMAL, unknown>>,
): Promise<string> {
  const { primitive, light, dark } = { ...MINIMAL, ...files };
  const tokensDir = await mkdtemp(join(tmpdir(), "gyeol-tokens-"));
  onTestFinished(() => rm(tokensDir, { recursive: true, force: true }));
  await mkdir(join(tokensDir, "semantic"));
  await writeFile(join(tokensDir, "primitive.json"), JSON.stringify(primitive));
  await writeFile(
    join(tokensDir, "semantic", "light.json"),
    JSON.stringify(light),
  );
  await writeFile(
    join(tokensDir, "semantic", "dark.json"),
    JSON.stringify(dark),
  );
  return tokensDir;
}

/** 생성된 TS 모듈의 모양. 테스트에서 값을 꺼내 보려고 느슨하게 적는다 */
interface TsModule {
  tokens: Record<string, any>;
  values: Record<"light" | "dark", Record<string, any>>;
}

/** 빌드가 돌려준 TS 소스를 임시 파일로 써서 import한다. 폴더는 테스트가 끝나면 지운다 */
async function importTsModule(ts: string): Promise<TsModule> {
  const dir = await mkdtemp(join(tmpdir(), "gyeol-tokens-ts-"));
  onTestFinished(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, "index.ts");
  await writeFile(file, ts);
  return import(file);
}

/** 빌드가 TokenValidationError로 실패하면 위반의 파일, 경로, 규칙을 돌려준다 */
async function collectViolations(
  tokensDir: string,
): Promise<{ file: string; path: string; rule: string }[]> {
  const error = await buildTokens(tokensDir).then(
    () => undefined,
    (e: unknown) => e,
  );
  if (!(error instanceof TokenValidationError)) {
    throw new Error(`TokenValidationError가 아니다: ${String(error)}`);
  }
  return error.violations.map(({ file, path, rule }) => ({ file, path, rule }));
}

describe("buildTokens", () => {
  describe("Primitive 블록", () => {
    it("Primitive를 :root에 --gyeol- 접두사 CSS 변수로 낸다", async () => {
      // given, when
      const { css } = await buildTokens(resolveFixturePath("valid"));

      // then
      expect(css).toContain(":root {");
      expect(css).toContain("--gyeol-color-white: #ffffff;");
      expect(css).toContain("--gyeol-color-gray-900: #18181b;");
      expect(css).toContain("--gyeol-spacing-4: 16px;");
      expect(css).toContain("--gyeol-radius-md: 6px;");
    });

    it("alpha가 있는 색은 rgba()로 낸다", async () => {
      // given, when
      const { css } = await buildTokens(resolveFixturePath("valid"));

      // then
      expect(css).toContain("--gyeol-color-overlay: rgba(0, 0, 0, 0.5);");
    });
  });

  describe("Semantic 블록", () => {
    it("light Semantic을 :root 블록에 color-scheme: light와 var() 참조로 낸다", async () => {
      // given, when
      const { css } = await buildTokens(resolveFixturePath("valid"));

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
      const { css } = await buildTokens(resolveFixturePath("valid"));

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
      const { css } = await buildTokens(resolveFixturePath("valid"));

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
      const { css } = await buildTokens(resolveFixturePath("valid"));

      // then
      expect(css).toContain("--gyeol-ring-offset: var(--gyeol-bg-surface);");
    });

    it("alias + 투명도가 Semantic을 가리키면 그 Semantic 변수를 color-mix()로 섞는다", async () => {
      // given, when
      const { css } = await buildTokens(resolveFixturePath("valid"));

      // then: light와 dark 블록 세 곳 모두에 나온다
      expect(
        css.match(
          /--gyeol-alpha-90: color-mix\(in srgb, var\(--gyeol-bg-surface\) 90%, transparent\);/g,
        ),
      ).toHaveLength(3);
    });

    it("alias + 투명도가 Primitive를 가리키면 그 Primitive 변수를 color-mix()로 섞는다", async () => {
      // given, when
      const { css } = await buildTokens(resolveFixturePath("valid"));

      // then: dark 블록 두 곳에 나온다
      expect(
        css.match(
          /--gyeol-border-default: color-mix\(in srgb, var\(--gyeol-color-white\) 10%, transparent\);/g,
        ),
      ).toHaveLength(2);
    });

    it("Semantic 블록에는 Primitive 변수를 다시 내지 않는다", async () => {
      // given, when
      const { css } = await buildTokens(resolveFixturePath("valid"));

      // then
      expect(css.match(/--gyeol-color-white:/g)).toHaveLength(1);
    });

    it("data-color-scheme 속성은 <html>에서만 Color Scheme을 바꾼다", async () => {
      // given, when
      const { css } = await buildTokens(resolveFixturePath("valid"));

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

  describe("TS tokens", () => {
    it("Semantic, spacing, radius를 camelCase 키의 CSS 변수 참조로 낸다", async () => {
      // when
      const { ts } = await buildTokens(resolveFixturePath("valid"));
      const { tokens } = await importTsModule(ts);

      // then
      expect(tokens.bgSurface).toBe("var(--gyeol-bg-surface)");
      expect(tokens.ringOffset).toBe("var(--gyeol-ring-offset)");
      expect(tokens.alpha[90]).toBe("var(--gyeol-alpha-90)");
      expect(tokens.spacing[4]).toBe("var(--gyeol-spacing-4)");
      expect(tokens.radius.md).toBe("var(--gyeol-radius-md)");
    });

    it("Primitive 색은 내지 않는다", async () => {
      // when
      const { ts } = await buildTokens(resolveFixturePath("valid"));
      const { tokens } = await importTsModule(ts);

      // then
      expect(tokens).not.toHaveProperty("color");
      expect(ts).not.toContain("--gyeol-color-");
    });
  });

  describe("TS values", () => {
    it("Color Scheme마다 Semantic의 실제 색을 낸다", async () => {
      // when
      const { ts } = await buildTokens(resolveFixturePath("valid"));
      const { values } = await importTsModule(ts);

      // then: Semantic → Semantic 참조도 실제 색으로 푼다
      expect(values.light.bgSurface).toBe("#ffffff");
      expect(values.light.ringOffset).toBe("#ffffff");
      expect(values.dark.bgSurface).toBe("#18181b");
      expect(values.dark.ringOffset).toBe("#18181b");
    });

    it("투명도가 있으면 원본에 적힌 계산된 색을 rgba()로 낸다", async () => {
      // when
      const { ts } = await buildTokens(resolveFixturePath("valid"));
      const { values } = await importTsModule(ts);

      // then
      expect(values.light.alpha[90]).toBe("rgba(255, 255, 255, 0.9)");
      expect(values.dark.alpha[90]).toBe("rgba(24, 24, 27, 0.9)");
      expect(values.dark.borderDefault).toBe("rgba(255, 255, 255, 0.1)");
    });

    it("spacing과 radius는 values에 넣지 않는다", async () => {
      // when
      const { ts } = await buildTokens(resolveFixturePath("valid"));
      const { values } = await importTsModule(ts);

      // then
      expect(values.light).not.toHaveProperty("spacing");
      expect(values.light).not.toHaveProperty("radius");
    });
  });

  describe("토큰 폴더", () => {
    it("실제 씨앗 토큰 폴더로 빌드가 성공한다", async () => {
      // given
      const tokensDir = fileURLToPath(new URL("../tokens", import.meta.url));

      // when
      const { css, ts } = await buildTokens(tokensDir);
      const { tokens, values } = await importTsModule(ts);

      // then: 값은 Figma에서 바뀔 수 있으므로 이름과 모양만 확인한다
      expect(css).toMatch(/--gyeol-color-gray-900: \S+;/);
      expect(css).toMatch(/--gyeol-spacing-4: \S+;/);
      expect(css).toMatch(/--gyeol-radius-md: \S+;/);
      expect(css).toMatch(/--gyeol-bg-surface: var\(--gyeol-\S+\);/);
      expect(css).toContain("--gyeol-ring-offset: var(--gyeol-bg-surface);");
      expect(css).toContain(
        "--gyeol-alpha-90: color-mix(in srgb, var(--gyeol-bg-surface) 90%, transparent);",
      );
      expect(css).toMatch(
        /--gyeol-border-default: color-mix\(in srgb, var\(--gyeol-color-\S+\) \d+%, transparent\);/,
      );
      expect(tokens.fgOnAccent).toBe("var(--gyeol-fg-on-accent)");
      expect(tokens.spacing[4]).toBe("var(--gyeol-spacing-4)");
      expect(tokens.radius.full).toBe("var(--gyeol-radius-full)");
      expect(values.light.bgSurface).toMatch(/^#[0-9a-f]{6}$/);
      expect(values.dark.alpha[90]).toMatch(/^rgba\(\d+, \d+, \d+, 0\.9\)$/);
    });

    it("토큰 폴더에 primitive.json이 없으면 실패한다", async () => {
      // given, when
      const result = buildTokens(resolveFixturePath("does-not-exist"));

      // then
      await expect(result).rejects.toThrow("primitive.json");
    });

    it("토큰 폴더에 Semantic 파일이 없으면 실패한다", async () => {
      // given: primitive.json만 있는 토큰 폴더
      const tokensDir = await mkdtemp(join(tmpdir(), "gyeol-tokens-"));
      onTestFinished(() => rm(tokensDir, { recursive: true, force: true }));
      await cp(
        resolveFixturePath("valid/primitive.json"),
        join(tokensDir, "primitive.json"),
      );

      // when
      const result = buildTokens(tokensDir);

      // then
      await expect(result).rejects.toThrow("light.json");
    });
  });

  describe("검증 오류", () => {
    it("여러 파일의 여러 위반을 한 번에 알리고, 메시지에 파일, 토큰 경로, 규칙을 적는다", async () => {
      // given: Primitive에 alias, light에 실제 값
      const tokensDir = await createTokensDir({
        primitive: {
          ...MINIMAL.primitive,
          color: {
            ...MINIMAL.primitive.color,
            ink: { $value: "{color.black}" },
          },
        },
        light: {
          "bg-surface": { $type: "color", $value: toSrgbColor(1, 1, 1) },
        },
      });

      // when
      const result = buildTokens(tokensDir);

      // then
      await expect(result).rejects.toThrow(
        [
          "토큰 JSON이 규칙을 2곳에서 어겼다.",
          "  primitive.json color.ink [primitive-real-value] Primitive는 실제 값만 둔다. alias {color.black}를 쓸 수 없다",
          '  semantic/light.json bg-surface [semantic-alias] Semantic은 Primitive나 다른 Semantic을 가리키는 alias(예: "{color.gray.900}")여야 한다',
        ].join("\n"),
      );
    });
  });

  describe("검증 규칙", () => {
    it("규칙을 지키는 가장 작은 토큰 폴더는 빌드가 성공한다", async () => {
      // given
      const tokensDir = await createTokensDir({});

      // when
      const result = buildTokens(tokensDir);

      // then
      await expect(result).resolves.toHaveProperty("css");
    });

    it("Primitive에 alias가 있으면 실패한다", async () => {
      // given
      const tokensDir = await createTokensDir({
        primitive: {
          ...MINIMAL.primitive,
          color: {
            ...MINIMAL.primitive.color,
            ink: { $value: "{color.black}" },
          },
        },
      });

      // when
      const violations = await collectViolations(tokensDir);

      // then
      expect(violations).toEqual([
        {
          file: "primitive.json",
          path: "color.ink",
          rule: "primitive-real-value",
        },
      ]);
    });

    it("Primitive에 alias + 투명도 확장이 있으면 실패한다", async () => {
      // given
      const tokensDir = await createTokensDir({
        primitive: {
          ...MINIMAL.primitive,
          color: {
            ...MINIMAL.primitive.color,
            shade: {
              $value: { ...toSrgbColor(0, 0, 0), alpha: 0.5 },
              $extensions: {
                gyeol: { alias: { ref: "{color.black}", alpha: 0.5 } },
              },
            },
          },
        },
      });

      // when
      const violations = await collectViolations(tokensDir);

      // then
      expect(violations).toEqual([
        {
          file: "primitive.json",
          path: "color.shade",
          rule: "primitive-real-value",
        },
      ]);
    });

    it("Primitive 색 값 자체의 alpha는 실제 값이므로 허용한다", async () => {
      // given
      const tokensDir = await createTokensDir({
        primitive: {
          ...MINIMAL.primitive,
          color: {
            ...MINIMAL.primitive.color,
            overlay: { $value: { ...toSrgbColor(0, 0, 0), alpha: 0.5 } },
          },
        },
      });

      // when
      const result = buildTokens(tokensDir);

      // then
      await expect(result).resolves.toHaveProperty("css");
    });

    it("Semantic 칸이 alias가 아니라 실제 값이면 실패한다", async () => {
      // given
      const tokensDir = await createTokensDir({
        light: {
          ...MINIMAL.light,
          "fg-default": { $type: "color", $value: toSrgbColor(0, 0, 0) },
        },
        dark: { ...MINIMAL.dark, "fg-default": MINIMAL.light["bg-surface"] },
      });

      // when
      const violations = await collectViolations(tokensDir);

      // then
      expect(violations).toEqual([
        {
          file: "semantic/light.json",
          path: "fg-default",
          rule: "semantic-alias",
        },
      ]);
    });

    it("Semantic의 alias + 투명도 확장에 참조가 없으면 실패한다", async () => {
      // given
      const tokensDir = await createTokensDir({
        light: {
          ...MINIMAL.light,
          "bg-scrim": {
            $type: "color",
            $value: { ...toSrgbColor(0, 0, 0), alpha: 0.5 },
            $extensions: { gyeol: { alias: { alpha: 0.5 } } },
          },
        },
        dark: {
          ...MINIMAL.dark,
          "bg-scrim": { $type: "color", $value: "{color.black}" },
        },
      });

      // when
      const violations = await collectViolations(tokensDir);

      // then
      expect(violations).toEqual([
        {
          file: "semantic/light.json",
          path: "bg-scrim",
          rule: "semantic-alias",
        },
      ]);
    });

    it("Semantic 타입이 색이 아니면 실패한다", async () => {
      // given
      const fgGap = { $type: "dimension", $value: "{spacing.4}" };
      const tokensDir = await createTokensDir({
        light: { ...MINIMAL.light, "fg-gap": fgGap },
        dark: { ...MINIMAL.dark, "fg-gap": fgGap },
      });

      // when
      const violations = await collectViolations(tokensDir);

      // then
      expect(violations).toEqual([
        { file: "semantic/light.json", path: "fg-gap", rule: "semantic-color" },
        { file: "semantic/dark.json", path: "fg-gap", rule: "semantic-color" },
      ]);
    });

    it("light와 dark의 Semantic 이름이 다르면 빠진 쪽 파일로 실패한다", async () => {
      // given: fg-default는 light에만, fg-muted는 dark에만 있다
      const tokensDir = await createTokensDir({
        light: { ...MINIMAL.light, "fg-default": MINIMAL.dark["bg-surface"] },
        dark: { ...MINIMAL.dark, "fg-muted": MINIMAL.light["bg-surface"] },
      });

      // when
      const violations = await collectViolations(tokensDir);

      // then
      expect(violations).toEqual([
        {
          file: "semantic/light.json",
          path: "fg-muted",
          rule: "semantic-names-match",
        },
        {
          file: "semantic/dark.json",
          path: "fg-default",
          rule: "semantic-names-match",
        },
      ]);
    });

    it("Primitive 경로가 3단계보다 깊으면 실패한다", async () => {
      // given
      const tokensDir = await createTokensDir({
        primitive: {
          ...MINIMAL.primitive,
          color: {
            ...MINIMAL.primitive.color,
            gray: { cool: { "900": { $value: toSrgbColor(0.1, 0.1, 0.1) } } },
          },
        },
      });

      // when
      const violations = await collectViolations(tokensDir);

      // then
      expect(violations).toEqual([
        {
          file: "primitive.json",
          path: "color.gray.cool.900",
          rule: "path-structure",
        },
      ]);
    });

    it("Primitive 토큰이 범주 그룹 밖에 있으면 실패한다", async () => {
      // given
      const tokensDir = await createTokensDir({
        primitive: {
          ...MINIMAL.primitive,
          white: { $type: "color", $value: toSrgbColor(1, 1, 1) },
        },
      });

      // when
      const violations = await collectViolations(tokensDir);

      // then
      expect(violations).toEqual([
        { file: "primitive.json", path: "white", rule: "path-structure" },
      ]);
    });

    it("Semantic 그룹이 두 단계면 실패한다", async () => {
      // given
      const alpha = {
        surface: { "90": { $type: "color", $value: "{color.white}" } },
      };
      const tokensDir = await createTokensDir({
        light: { ...MINIMAL.light, alpha },
        dark: { ...MINIMAL.dark, alpha },
      });

      // when
      const violations = await collectViolations(tokensDir);

      // then
      expect(violations).toEqual([
        {
          file: "semantic/light.json",
          path: "alpha.surface.90",
          rule: "path-structure",
        },
        {
          file: "semantic/dark.json",
          path: "alpha.surface.90",
          rule: "path-structure",
        },
      ]);
    });

    it("Semantic 이름의 첫 조각이 Role 표에 없으면 실패한다", async () => {
      // given: brand-primary는 Role이 없고, background-muted는 bg로 시작하지만 Role이 아니다
      const extra = {
        "brand-primary": { $type: "color", $value: "{color.black}" },
        "background-muted": { $type: "color", $value: "{color.white}" },
      };
      const tokensDir = await createTokensDir({
        light: { ...MINIMAL.light, ...extra },
        dark: { ...MINIMAL.dark, ...extra },
      });

      // when
      const violations = await collectViolations(tokensDir);

      // then
      expect(violations).toEqual([
        {
          file: "semantic/light.json",
          path: "brand-primary",
          rule: "semantic-role",
        },
        {
          file: "semantic/light.json",
          path: "background-muted",
          rule: "semantic-role",
        },
        {
          file: "semantic/dark.json",
          path: "brand-primary",
          rule: "semantic-role",
        },
        {
          file: "semantic/dark.json",
          path: "background-muted",
          rule: "semantic-role",
        },
      ]);
    });

    it("Role 표의 모든 Role과 alpha 그룹은 통과한다", async () => {
      // given
      const semantic = {
        "bg-surface": { $type: "color", $value: "{color.white}" },
        "fg-on-accent": { $type: "color", $value: "{color.black}" },
        "border-default": { $type: "color", $value: "{color.black}" },
        "ring-offset": { $type: "color", $value: "{bg-surface}" },
        alpha: { "90": { $type: "color", $value: "{bg-surface}" } },
      };
      const tokensDir = await createTokensDir({
        light: semantic,
        dark: semantic,
      });

      // when
      const result = buildTokens(tokensDir);

      // then
      await expect(result).resolves.toHaveProperty("css");
    });

    it("경로의 이름 칸이 kebab-case가 아니면 실패한다", async () => {
      // given
      const tokensDir = await createTokensDir({
        primitive: {
          ...MINIMAL.primitive,
          color: {
            ...MINIMAL.primitive.color,
            dark_gray: { $value: toSrgbColor(0.2, 0.2, 0.2) },
          },
        },
        light: {
          ...MINIMAL.light,
          "fg-Default": { $type: "color", $value: "{color.black}" },
        },
        dark: {
          ...MINIMAL.dark,
          "fg-Default": { $type: "color", $value: "{color.white}" },
        },
      });

      // when
      const violations = await collectViolations(tokensDir);

      // then
      expect(violations).toEqual([
        { file: "primitive.json", path: "color.dark_gray", rule: "kebab-case" },
        { file: "semantic/light.json", path: "fg-Default", rule: "kebab-case" },
        { file: "semantic/dark.json", path: "fg-Default", rule: "kebab-case" },
      ]);
    });

    it("Semantic끼리 CSS 변수 이름이 겹치면 실패한다", async () => {
      // given: MINIMAL의 bg-surface와 bg.surface는 모두 --gyeol-bg-surface가 된다
      const tokens = {
        bg: { surface: { $type: "color", $value: "{color.black}" } },
      };
      const tokensDir = await createTokensDir({
        light: { ...MINIMAL.light, ...tokens },
        dark: { ...MINIMAL.dark, ...tokens },
      });

      // when
      const violations = await collectViolations(tokensDir);

      // then
      expect(violations).toEqual([
        {
          file: "semantic/light.json",
          path: "bg.surface",
          rule: "css-name-unique",
        },
        {
          file: "semantic/dark.json",
          path: "bg.surface",
          rule: "css-name-unique",
        },
      ]);
    });

    it("Semantic과 Primitive의 CSS 변수 이름이 겹치면 실패한다", async () => {
      // given: color-white는 Primitive color.white와 같은 --gyeol-color-white가 된다.
      // Primitive 범주는 Role이 아니므로 Primitive와 겹치는 Semantic 이름은 semantic-role도 어긴다
      const tokens = {
        "color-white": { $type: "color", $value: "{color.white}" },
      };
      const tokensDir = await createTokensDir({
        light: { ...MINIMAL.light, ...tokens },
        dark: { ...MINIMAL.dark, ...tokens },
      });

      // when
      const violations = await collectViolations(tokensDir);

      // then
      expect(violations).toEqual([
        {
          file: "semantic/light.json",
          path: "color-white",
          rule: "semantic-role",
        },
        {
          file: "semantic/light.json",
          path: "color-white",
          rule: "css-name-unique",
        },
        {
          file: "semantic/dark.json",
          path: "color-white",
          rule: "semantic-role",
        },
        {
          file: "semantic/dark.json",
          path: "color-white",
          rule: "css-name-unique",
        },
      ]);
    });

    it("Primitive끼리 CSS 변수 이름이 겹치면 한 번만 알린다", async () => {
      // given
      const tokensDir = await createTokensDir({
        primitive: {
          ...MINIMAL.primitive,
          color: {
            ...MINIMAL.primitive.color,
            gray: { "900": { $value: toSrgbColor(0.1, 0.1, 0.1) } },
            "gray-900": { $value: toSrgbColor(0.1, 0.1, 0.1) },
          },
        },
      });

      // when
      const violations = await collectViolations(tokensDir);

      // then
      expect(violations).toEqual([
        {
          file: "primitive.json",
          path: "color.gray-900",
          rule: "css-name-unique",
        },
      ]);
    });

    it("색이 srgb 색 객체가 아니면 실패한다", async () => {
      // given: Primitive의 display-p3와 hex 문자열, Semantic의 alias + 투명도에 적은 계산된 색
      const bgScrim = {
        $type: "color",
        $value: { ...toSrgbColor(0, 0, 0), alpha: 0.5 },
        $extensions: {
          gyeol: { alias: { ref: "{color.black}", alpha: 0.5 } },
        },
      };
      const tokensDir = await createTokensDir({
        primitive: {
          ...MINIMAL.primitive,
          color: {
            ...MINIMAL.primitive.color,
            red: {
              $value: { colorSpace: "display-p3", components: [1, 0, 0] },
            },
            green: { $value: "#00ff00" },
          },
        },
        light: {
          ...MINIMAL.light,
          "bg-scrim": {
            ...bgScrim,
            $value: { ...bgScrim.$value, colorSpace: "hsl" },
          },
        },
        dark: { ...MINIMAL.dark, "bg-scrim": bgScrim },
      });

      // when
      const violations = await collectViolations(tokensDir);

      // then
      expect(violations).toEqual([
        { file: "primitive.json", path: "color.red", rule: "color-srgb" },
        { file: "primitive.json", path: "color.green", rule: "color-srgb" },
        { file: "semantic/light.json", path: "bg-scrim", rule: "color-srgb" },
      ]);
    });

    it("dimension unit이 px가 아니면 실패한다", async () => {
      // given
      const tokensDir = await createTokensDir({
        primitive: {
          ...MINIMAL.primitive,
          radius: {
            $type: "dimension",
            md: { $value: { value: 0.375, unit: "rem" } },
            sm: { $value: "4px" },
          },
        },
      });

      // when
      const violations = await collectViolations(tokensDir);

      // then
      expect(violations).toEqual([
        { file: "primitive.json", path: "radius.md", rule: "dimension-px" },
        { file: "primitive.json", path: "radius.sm", rule: "dimension-px" },
      ]);
    });

    it("참조 대상이 없으면 실패한다", async () => {
      // given: 없는 토큰, 토큰이 아닌 그룹, alias + 투명도의 없는 참조 대상
      const tokensDir = await createTokensDir({
        light: {
          ...MINIMAL.light,
          "fg-default": { $type: "color", $value: "{color.gray.500}" },
          "fg-muted": { $type: "color", $value: "{color}" },
          "bg-scrim": {
            $type: "color",
            $value: { ...toSrgbColor(1, 1, 1), alpha: 0.5 },
            $extensions: {
              gyeol: { alias: { ref: "{bg-missing}", alpha: 0.5 } },
            },
          },
        },
        dark: {
          ...MINIMAL.dark,
          "fg-default": { $type: "color", $value: "{color.white}" },
          "fg-muted": { $type: "color", $value: "{color.white}" },
          "bg-scrim": { $type: "color", $value: "{color.white}" },
        },
      });

      // when
      const violations = await collectViolations(tokensDir);

      // then
      expect(violations).toEqual([
        {
          file: "semantic/light.json",
          path: "fg-default",
          rule: "reference-exists",
        },
        {
          file: "semantic/light.json",
          path: "fg-muted",
          rule: "reference-exists",
        },
        {
          file: "semantic/light.json",
          path: "bg-scrim",
          rule: "reference-exists",
        },
      ]);
    });

    it("Semantic은 다른 Color Scheme 파일의 Semantic을 가리킬 수 없다", async () => {
      // given: bg-accent는 dark에만 있는 토큰이 아니라, light 파일 안에서 찾는다
      const tokensDir = await createTokensDir({
        light: {
          ...MINIMAL.light,
          "ring-offset": { $type: "color", $value: "{bg-accent}" },
        },
        dark: {
          ...MINIMAL.dark,
          "bg-accent": { $type: "color", $value: "{color.white}" },
          "ring-offset": { $type: "color", $value: "{bg-accent}" },
        },
      });

      // when
      const violations = await collectViolations(tokensDir);

      // then
      expect(violations).toEqual([
        {
          file: "semantic/light.json",
          path: "ring-offset",
          rule: "reference-exists",
        },
        {
          file: "semantic/light.json",
          path: "bg-accent",
          rule: "semantic-names-match",
        },
      ]);
    });

    it("참조가 순환하면 실패한다", async () => {
      // given: light에서 fg-default → fg-muted → fg-default, 그리고 alias + 투명도의 자기 참조
      const tokensDir = await createTokensDir({
        light: {
          ...MINIMAL.light,
          "fg-default": { $type: "color", $value: "{fg-muted}" },
          "fg-muted": { $type: "color", $value: "{fg-default}" },
          "bg-scrim": {
            $type: "color",
            $value: { ...toSrgbColor(1, 1, 1), alpha: 0.5 },
            $extensions: {
              gyeol: { alias: { ref: "{bg-scrim}", alpha: 0.5 } },
            },
          },
        },
        dark: {
          ...MINIMAL.dark,
          "fg-default": { $type: "color", $value: "{color.white}" },
          "fg-muted": { $type: "color", $value: "{fg-default}" },
          "bg-scrim": { $type: "color", $value: "{bg-surface}" },
        },
      });

      // when
      const violations = await collectViolations(tokensDir);

      // then
      expect(violations).toEqual([
        {
          file: "semantic/light.json",
          path: "fg-default",
          rule: "reference-no-cycle",
        },
        {
          file: "semantic/light.json",
          path: "bg-scrim",
          rule: "reference-no-cycle",
        },
      ]);
    });
  });

  describe("전체 출력", () => {
    it("fixture의 TS 출력 전체", async () => {
      // given, when
      const { ts } = await buildTokens(resolveFixturePath("valid"));

      // then: as const로 값의 리터럴 타입을 남긴다
      expect(ts).toMatchInlineSnapshot(`
        "/**
         * Do not edit directly, this file was auto-generated.
         */

        /** CSS 변수 참조. Semantic 색과 spacing, radius를 담는다 */
        export const tokens = {
          bgSurface: "var(--gyeol-bg-surface)",
          fgDefault: "var(--gyeol-fg-default)",
          borderDefault: "var(--gyeol-border-default)",
          ringOffset: "var(--gyeol-ring-offset)",
          alpha: {
            90: "var(--gyeol-alpha-90)",
          },
          spacing: {
            4: "var(--gyeol-spacing-4)",
          },
          radius: {
            md: "var(--gyeol-radius-md)",
          },
        } as const;

        /** Color Scheme별 Semantic의 실제 색. CSS 밖(예: 상태바 색을 브리지로 넘길 때)에서 쓴다 */
        export const values = {
          light: {
            bgSurface: "#ffffff",
            fgDefault: "#18181b",
            borderDefault: "#18181b",
            ringOffset: "#ffffff",
            alpha: {
              90: "rgba(255, 255, 255, 0.9)",
            },
          },
          dark: {
            bgSurface: "#18181b",
            fgDefault: "#ffffff",
            borderDefault: "rgba(255, 255, 255, 0.1)",
            ringOffset: "#18181b",
            alpha: {
              90: "rgba(24, 24, 27, 0.9)",
            },
          },
        } as const;
        "
      `);
    });

    it("fixture의 CSS 출력 전체", async () => {
      // given, when
      const { css } = await buildTokens(resolveFixturePath("valid"));

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
          --gyeol-border-default: var(--gyeol-color-gray-900);
          --gyeol-ring-offset: var(--gyeol-bg-surface);
          --gyeol-alpha-90: color-mix(in srgb, var(--gyeol-bg-surface) 90%, transparent);
        }

        @media (prefers-color-scheme: dark) {
          :root:not([data-color-scheme="light"]) {
            color-scheme: dark;
            --gyeol-bg-surface: var(--gyeol-color-gray-900);
            --gyeol-fg-default: var(--gyeol-color-white);
            --gyeol-border-default: color-mix(in srgb, var(--gyeol-color-white) 10%, transparent);
            --gyeol-ring-offset: var(--gyeol-bg-surface);
            --gyeol-alpha-90: color-mix(in srgb, var(--gyeol-bg-surface) 90%, transparent);
          }
        }

        :root[data-color-scheme="dark"] {
          color-scheme: dark;
          --gyeol-bg-surface: var(--gyeol-color-gray-900);
          --gyeol-fg-default: var(--gyeol-color-white);
          --gyeol-border-default: color-mix(in srgb, var(--gyeol-color-white) 10%, transparent);
          --gyeol-ring-offset: var(--gyeol-bg-surface);
          --gyeol-alpha-90: color-mix(in srgb, var(--gyeol-bg-surface) 90%, transparent);
        }
        "
      `);
    });
  });
});
