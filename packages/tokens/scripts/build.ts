// `pnpm build`의 첫 단계다. 실제 토큰 폴더로 빌드 함수를 실행해 dist/에 쓴다.
// tsdown은 dist/를 지우지 않게 설정했으므로(clean: false), 지난 빌드 결과는 여기서 지운다.
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTokens } from "./build-tokens.ts";

const tokensDir = fileURLToPath(new URL("../tokens", import.meta.url));
const distDir = fileURLToPath(new URL("../dist", import.meta.url));

const { css } = await buildTokens(tokensDir);

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await writeFile(join(distDir, "tokens.css"), css);
