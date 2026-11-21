// `pnpm build`의 첫 단계다. 실제 토큰 폴더로 빌드 함수를 실행해 결과를 generated/에 쓴다.
// dist/는 tsdown이 맡는다. tsdown이 dist/를 지운 뒤 generated/index.ts를 빌드하고 generated/tokens.css와 generated/tokens.json을 dist/로 복사한다.
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTokens } from "./build-tokens.ts";

const tokensDir = fileURLToPath(new URL("../tokens", import.meta.url));
const generatedDir = fileURLToPath(new URL("../generated", import.meta.url));

const { css, ts, json } = await buildTokens(tokensDir);

// 지난 결과가 남지 않도록 생성 폴더를 비우고 다시 쓴다
await rm(generatedDir, { recursive: true, force: true });
await mkdir(generatedDir, { recursive: true });
await writeFile(join(generatedDir, "tokens.css"), css);
await writeFile(join(generatedDir, "index.ts"), ts);
await writeFile(join(generatedDir, "tokens.json"), json);
