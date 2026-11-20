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
  // 파일 경로를 Style Dictionary의 source 옵션으로 넘기지 않고 직접 읽는다.
  // source의 항목은 경로 하나라도 glob 패턴으로 풀리고, 맞는 파일이 0개여도 오류가 아니다.
  // 그러면 토큰 없이 빌드가 끝나 빈 ":root {}"가 나온다. 직접 읽으면 파일이 없을 때 ENOENT로 실패한다.
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
        // 실제로 일하는 transform은 name/kebab(이름), color/css(hex, rgba()), size/rem(dimension)이다.
        //
        // size/rem은 이름과 달리 px를 rem으로 바꾸지 않는다. unit이 적혀 있으면 그대로 붙이고
        // ({16, "px"} → "16px"), unit 없는 숫자에만 "rem"을 붙인다. 토큰은 모두 px로 쓰므로 px로 나온다.
        // size/px를 직접 고르지 않는 이유: size/px는 unit을 무시해 {1.5, "rem"}도 "1.5px"로 낸다.
        transformGroup: "css",
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
