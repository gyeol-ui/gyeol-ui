import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, onTestFinished } from "vitest";
import { compileClasses } from "./compile-classes.ts";
import { findDeclarations } from "./css-rules.ts";

const tmpRoot = fileURLToPath(
  new URL("../../node_modules/.tmp", import.meta.url),
);

/** 손으로 쓴 테마. 토큰 CSS를 import하고 색 하나만 넣는다 */
const THEME = `@import "@gyeol-ui/tokens/tokens.css";
@theme inline {
  --color-brand: #ff0000;
}
`;

describe("compileClasses", () => {
  it("넘긴 테마 텍스트를 @gyeol-ui/tailwind 자리에 넣어 컴파일한다", async () => {
    // given, when
    const css = await compileClasses({ theme: THEME, classes: ["bg-brand"] });

    // then
    expect(findDeclarations({ css, className: "bg-brand" })).toEqual({
      "background-color": "#ff0000",
    });
  });

  it("테마 안의 @gyeol-ui/tokens/tokens.css를 실제 토큰 패키지로 푼다", async () => {
    // given, when
    const css = await compileClasses({ theme: THEME, classes: [] });

    // then
    expect(css).toMatch(/--gyeol-bg-surface:/);
  });

  it("앞서 부른 클래스가 다음 결과에 쌓이지 않는다", async () => {
    // given
    await compileClasses({ theme: THEME, classes: ["bg-brand"] });

    // when
    const css = await compileClasses({ theme: THEME, classes: ["p-4"] });

    // then
    expect(findDeclarations({ css, className: "bg-brand" })).toBeUndefined();
  });

  it("테스트가 끝나면 테마를 쓴 임시 폴더를 지운다", async () => {
    // given
    // 정리 hook은 등록의 역순으로 돌므로, 먼저 등록한 이 확인은 compileClasses의 정리 뒤에 돈다
    const theme = `${THEME}/* ${crypto.randomUUID()} */\n`;
    let themeDir: string | undefined;
    onTestFinished(async () => {
      await expect(access(themeDir!)).rejects.toThrow();
    });

    // when
    await compileClasses({ theme, classes: [] });

    // then
    for (const name of await readdir(tmpRoot)) {
      const dir = join(tmpRoot, name);
      const written = await readFile(join(dir, "theme.css"), "utf8").catch(
        () => undefined,
      );
      if (written === theme) themeDir = dir;
    }
    expect(themeDir).toBeDefined();
  });
});
