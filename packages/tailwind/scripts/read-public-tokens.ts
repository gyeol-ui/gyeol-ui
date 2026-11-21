import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import type { PublicToken } from "./format-theme.ts";

const require = createRequire(import.meta.url);

/** `@gyeol-ui/tokens`의 빌드 결과인 공개 토큰 목록(`tokens.json`)을 읽는다 */
export async function readPublicTokens(): Promise<PublicToken[]> {
  const path = require.resolve("@gyeol-ui/tokens/tokens.json");
  return JSON.parse(await readFile(path, "utf8"));
}
