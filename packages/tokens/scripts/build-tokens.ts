import { readFile } from "node:fs/promises";
import { join } from "node:path";
import StyleDictionary from "style-dictionary";
import type { DesignTokens } from "style-dictionary/types";

export interface BuildResult {
  /** `tokens.css`의 내용 */
  css: string;
}

const PREFIX = "gyeol";

/**
 * 토큰 폴더(`primitive.json`이 들어 있는 폴더)를 읽어 CSS 텍스트를 돌려준다.
 * 파일을 쓰지 않는다. 쓰는 일은 `build.ts`가 한다.
 */
export async function buildTokens(tokensDir: string): Promise<BuildResult> {
  // source glob은 파일이 없으면 조용히 빈 결과를 내므로, 직접 읽어 없을 때 실패시킨다
  const primitivePath = join(tokensDir, "primitive.json");
  const primitive: DesignTokens = JSON.parse(
    await readFile(primitivePath, "utf8"),
  );

  const sd = new StyleDictionary({
    tokens: primitive,
    log: { verbosity: "silent" },
    platforms: {
      css: {
        prefix: PREFIX,
        // 기본 css transformGroup의 size/rem은 px 값을 rem으로 바꾸므로 쓰지 않는다
        transforms: ["name/kebab", "color/css", "size/px"],
        files: [
          {
            destination: "tokens.css",
            format: "css/variables",
            options: { showFileHeader: false },
          },
        ],
      },
    },
  });

  const [file] = await sd.formatPlatform("css");
  if (typeof file?.output !== "string") {
    throw new Error("Style Dictionary가 tokens.css를 만들지 못했다");
  }
  return { css: file.output };
}
