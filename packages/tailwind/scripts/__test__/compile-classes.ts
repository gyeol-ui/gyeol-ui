import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "@tailwindcss/node";
import { onTestFinished } from "vitest";

const packageDir = fileURLToPath(new URL("../..", import.meta.url));
const entryPath = join(packageDir, "entry.css");

/**
 * 테마 텍스트를 진입 CSS(`entry.css`)와 함께 Tailwind로 컴파일해, 클래스들이 만든 CSS 텍스트를 돌려준다.
 * 사용자가 `@import "tailwindcss"; @import "@gyeol-ui/tailwind";`로 쓸 때와 같은 결과다.
 * 없는 클래스는 아무 규칙도 만들지 않는다.
 *
 * - 진입 CSS의 `@gyeol-ui/tailwind`는 임시 파일에 쓴 테마로 바꿔 읽는다.
 * - 임시 폴더는 패키지의 node_modules 아래에 두어, 테마 안의 `@gyeol-ui/tokens/tokens.css`가 실제 패키지로 풀리게 한다. 테스트가 끝나면 지운다.
 * - Tailwind의 build()는 앞서 넣은 클래스를 계속 쌓으므로 부를 때마다 컴파일러를 새로 만든다.
 *
 * Vitest 테스트 안에서만 부른다(`onTestFinished`를 쓴다).
 *
 * @example
 * await compileClasses({ theme: formatTheme(tokens), classes: ["p-4", "p-5"] });
 * // "…@layer utilities {\n  .p-4 {\n    padding: var(--gyeol-spacing-4);\n  }\n}…"
 */
export async function compileClasses({
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
