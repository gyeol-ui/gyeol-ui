import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "@tailwindcss/node";
import postcss, { AtRule } from "postcss";
import { describe, expect, it, onTestFinished } from "vitest";
import { formatTheme, type PublicToken } from "./format-theme.ts";
import { readPublicTokens } from "./read-public-tokens.ts";

const packageDir = fileURLToPath(new URL("..", import.meta.url));
const entryPath = join(packageDir, "entry.css");

/**
 * 테마 텍스트와 진입 CSS를 Tailwind로 컴파일해 클래스들의 CSS를 돌려준다.
 * 진입 CSS의 `@gyeol-ui/tailwind`는 임시 파일에 쓴 테마로 바꿔 읽는다.
 * 임시 폴더는 패키지의 node_modules 아래에 두어, 테마 안의 `@gyeol-ui/tokens/tokens.css`가 실제 패키지로 풀리게 한다.
 * build()는 앞서 넣은 클래스를 계속 쌓으므로 부를 때마다 컴파일러를 새로 만든다.
 */
async function compileClasses({
  theme,
  classes,
}: {
  theme: string;
  classes: string[];
}): Promise<string> {
  const tmpRoot = join(packageDir, "node_modules", ".tmp");
  await mkdir(tmpRoot, { recursive: true });
  const dir = await mkdtemp(join(tmpRoot, "theme-"));
  onTestFinished(() => rm(dir, { recursive: true, force: true }));
  const themePath = join(dir, "theme.css");
  await writeFile(themePath, theme);

  const compiler = await compile(await readFile(entryPath, "utf8"), {
    base: packageDir,
    from: entryPath,
    onDependency: () => {},
    customCssResolver: async (id) =>
      id === "@gyeol-ui/tailwind" ? themePath : undefined,
  });
  return compiler.build(classes);
}

/** CSS에서 클래스를 선택하는 규칙들의 선언을 모은다. 규칙이 없으면 undefined */
function findDeclarations({
  css,
  className,
}: {
  css: string;
  className: string;
}): Record<string, string> | undefined {
  const selector = new RegExp(`\\.${className}(?![\\w-])`);
  let declarations: Record<string, string> | undefined;
  postcss.parse(css).walkRules((rule) => {
    if (!selector.test(rule.selector)) return;
    declarations ??= {};
    rule.walkDecls((decl) => {
      declarations![decl.prop] = decl.value;
    });
  });
  return declarations;
}

/** 클래스를 선택하는 규칙마다 감싼 @media 조건, 선택자, 선언을 모은다 */
function findRules({ css, className }: { css: string; className: string }): {
  media: string | undefined;
  selector: string;
  declarations: Record<string, string>;
}[] {
  const escaped = className
    .replaceAll(":", "\\:")
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const selector = new RegExp(`\\.${escaped}(?![\\w-])`);
  const rules: ReturnType<typeof findRules> = [];
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

const FIXTURE: PublicToken[] = [
  { path: "bg-surface", type: "color", cssVariable: "--gyeol-bg-surface" },
  { path: "fg-default", type: "color", cssVariable: "--gyeol-fg-default" },
  {
    path: "border-default",
    type: "color",
    cssVariable: "--gyeol-border-default",
  },
  { path: "ring-offset", type: "color", cssVariable: "--gyeol-ring-offset" },
  { path: "alpha.90", type: "color", cssVariable: "--gyeol-alpha-90" },
  { path: "spacing.4", type: "dimension", cssVariable: "--gyeol-spacing-4" },
  { path: "radius.md", type: "dimension", cssVariable: "--gyeol-radius-md" },
  {
    path: "radius.full",
    type: "dimension",
    cssVariable: "--gyeol-radius-full",
  },
];

/**
 * 실제 공개 토큰이 나와야 할 클래스. docs/architecture.md의 Role 표와 ADR-0005를 손으로 옮겼다.
 * 토큰 경로 패턴 → (유틸리티 접두어, CSS 속성) 목록. dropCategory면 클래스 이름에서 범주를 뗀다(`spacing.4` → `p-4`)
 */
const EXPECTED_UTILITIES: {
  pattern: RegExp;
  utilities: [prefix: string, property: string][];
  dropCategory?: boolean;
}[] = [
  { pattern: /^bg-/, utilities: [["bg", "background-color"]] },
  { pattern: /^fg-/, utilities: [["text", "color"]] },
  {
    pattern: /^border-/,
    utilities: [
      ["border", "border-color"],
      ["divide", "border-color"],
    ],
  },
  {
    pattern: /^ring-offset$/,
    utilities: [["ring-offset", "--tw-ring-offset-color"]],
  },
  { pattern: /^alpha\./, utilities: [["bg", "background-color"]] },
  {
    pattern: /^spacing\./,
    utilities: [
      ["p", "padding"],
      ["gap", "gap"],
    ],
    dropCategory: true,
  },
  {
    pattern: /^radius\./,
    utilities: [["rounded", "border-radius"]],
    dropCategory: true,
  },
];

describe("formatTheme", () => {
  it("bg Role 토큰은 bg- 클래스의 배경색이 된다", async () => {
    // given, when
    const css = await compileClasses({
      theme: formatTheme(FIXTURE),
      classes: ["bg-bg-surface"],
    });

    // then
    expect(findDeclarations({ css, className: "bg-bg-surface" })).toEqual({
      "background-color": "var(--gyeol-bg-surface)",
    });
  });

  it("fg Role 토큰은 text- 클래스의 글자색이 된다", async () => {
    // given, when
    const css = await compileClasses({
      theme: formatTheme(FIXTURE),
      classes: ["text-fg-default"],
    });

    // then
    expect(findDeclarations({ css, className: "text-fg-default" })).toEqual({
      color: "var(--gyeol-fg-default)",
    });
  });

  it("Role에 맞지 않는 조합은 클래스가 없다", async () => {
    // given, when
    const css = await compileClasses({
      theme: formatTheme(FIXTURE),
      classes: ["text-bg-surface", "bg-fg-default"],
    });

    // then
    expect(
      findDeclarations({ css, className: "text-bg-surface" }),
    ).toBeUndefined();
    expect(
      findDeclarations({ css, className: "bg-fg-default" }),
    ).toBeUndefined();
  });

  it("border Role 토큰은 border-와 divide- 클래스의 테두리색이 된다", async () => {
    // given, when
    const css = await compileClasses({
      theme: formatTheme(FIXTURE),
      classes: ["border-border-default", "divide-border-default"],
    });

    // then
    expect(
      findDeclarations({ css, className: "border-border-default" }),
    ).toEqual({ "border-color": "var(--gyeol-border-default)" });
    expect(
      findDeclarations({ css, className: "divide-border-default" }),
    ).toEqual({ "border-color": "var(--gyeol-border-default)" });
  });

  it("ring-offset Role 토큰은 ring-offset- 클래스의 색이 된다", async () => {
    // given, when
    const css = await compileClasses({
      theme: formatTheme(FIXTURE),
      classes: ["ring-offset-ring-offset"],
    });

    // then
    expect(
      findDeclarations({ css, className: "ring-offset-ring-offset" }),
    ).toEqual({ "--tw-ring-offset-color": "var(--gyeol-ring-offset)" });
  });

  it("alpha 그룹 토큰은 bg- 클래스의 배경색이 된다", async () => {
    // given, when
    const css = await compileClasses({
      theme: formatTheme(FIXTURE),
      classes: ["bg-alpha-90", "text-alpha-90"],
    });

    // then
    expect(findDeclarations({ css, className: "bg-alpha-90" })).toEqual({
      "background-color": "var(--gyeol-alpha-90)",
    });
    expect(
      findDeclarations({ css, className: "text-alpha-90" }),
    ).toBeUndefined();
  });

  it("Tailwind 기본 팔레트 색은 클래스가 없다", async () => {
    // given, when
    const css = await compileClasses({
      theme: formatTheme(FIXTURE),
      classes: ["bg-red-500", "bg-white", "text-black"],
    });

    // then
    expect(findDeclarations({ css, className: "bg-red-500" })).toBeUndefined();
    expect(findDeclarations({ css, className: "bg-white" })).toBeUndefined();
    expect(findDeclarations({ css, className: "text-black" })).toBeUndefined();
  });

  it("spacing 토큰은 간격 클래스가 된다", async () => {
    // given, when
    const css = await compileClasses({
      theme: formatTheme(FIXTURE),
      classes: ["p-4", "gap-4"],
    });

    // then
    expect(findDeclarations({ css, className: "p-4" })).toEqual({
      padding: "var(--gyeol-spacing-4)",
    });
    expect(findDeclarations({ css, className: "gap-4" })).toEqual({
      gap: "var(--gyeol-spacing-4)",
    });
  });

  it("토큰이 없는 간격은 클래스가 없고, 0만 토큰 없이 있다", async () => {
    // given, when
    const css = await compileClasses({
      theme: formatTheme(FIXTURE),
      classes: ["p-5", "p-0"],
    });

    // then
    expect(findDeclarations({ css, className: "p-5" })).toBeUndefined();
    expect(findDeclarations({ css, className: "p-0" })).toEqual({
      padding: "0px",
    });
  });

  it("radius 토큰은 모서리 클래스가 되고, 토큰이 없는 모서리는 클래스가 없다", async () => {
    // given, when
    const css = await compileClasses({
      theme: formatTheme(FIXTURE),
      classes: ["rounded-md", "rounded-full", "rounded-lg"],
    });

    // then
    expect(findDeclarations({ css, className: "rounded-md" })).toEqual({
      "border-radius": "var(--gyeol-radius-md)",
    });
    expect(findDeclarations({ css, className: "rounded-full" })).toEqual({
      "border-radius": "var(--gyeol-radius-full)",
    });
    expect(findDeclarations({ css, className: "rounded-lg" })).toBeUndefined();
  });

  it('dark:는 OS가 dark이고 <html>에 data-color-scheme="light"가 없을 때 켜진다', async () => {
    // given, when
    const css = await compileClasses({
      theme: formatTheme(FIXTURE),
      classes: ["dark:bg-bg-surface"],
    });

    // then
    const mediaRules = findRules({
      css,
      className: "dark:bg-bg-surface",
    }).filter(({ media }) => media === "(prefers-color-scheme: dark)");
    expect(mediaRules).toEqual([
      {
        media: "(prefers-color-scheme: dark)",
        selector:
          '.dark\\:bg-bg-surface:where(:root:not([data-color-scheme="light"]), :root:not([data-color-scheme="light"]) *)',
        declarations: { "background-color": "var(--gyeol-bg-surface)" },
      },
    ]);
  });

  it('dark:는 <html data-color-scheme="dark">이면 OS 설정과 상관없이 켜진다', async () => {
    // given, when
    const css = await compileClasses({
      theme: formatTheme(FIXTURE),
      classes: ["dark:bg-bg-surface"],
    });

    // then
    const attributeRules = findRules({
      css,
      className: "dark:bg-bg-surface",
    }).filter(({ media }) => media === undefined);
    expect(attributeRules).toEqual([
      {
        media: undefined,
        selector:
          '.dark\\:bg-bg-surface:where(:root[data-color-scheme="dark"], :root[data-color-scheme="dark"] *)',
        declarations: { "background-color": "var(--gyeol-bg-surface)" },
      },
    ]);
  });

  it("표에 없는 Role이나 범주의 토큰이 있으면 모든 토큰 경로를 담아 실패한다", () => {
    // given, when, then
    expect(() =>
      formatTheme([
        ...FIXTURE,
        {
          path: "shadow-card",
          type: "color",
          cssVariable: "--gyeol-shadow-card",
        },
        { path: "size.4", type: "dimension", cssVariable: "--gyeol-size-4" },
      ]),
    ).toThrow(/shadow-card[\s\S]*size\.4/);
  });

  it("실제 공개 토큰 목록의 모든 토큰이 기대한 클래스로 나온다", async () => {
    // given
    const tokens = await readPublicTokens();
    const expectations = tokens.flatMap((token) => {
      const entry = EXPECTED_UTILITIES.find(({ pattern }) =>
        pattern.test(token.path),
      );
      if (entry === undefined) {
        throw new Error(`${token.path}: 기대할 클래스를 표에 적지 않은 토큰`);
      }
      const name = (
        entry.dropCategory ? token.path.split(".").slice(1) : [token.path]
      )
        .join("-")
        .replaceAll(".", "-");
      return entry.utilities.map(([prefix, property]) => ({
        path: token.path,
        className: `${prefix}-${name}`,
        declarations: { [property]: `var(${token.cssVariable})` },
      }));
    });

    // when
    const css = await compileClasses({
      theme: formatTheme(tokens),
      classes: expectations.map(({ className }) => className),
    });

    // then
    expect(expectations.length).toBeGreaterThan(0);
    for (const { path, className, declarations } of expectations) {
      expect(
        findDeclarations({ css, className }),
        `${path} → ${className}`,
      ).toEqual(declarations);
    }
  });
});
