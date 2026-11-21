// `pnpm build`의 첫 단계다. `@gyeol-ui/tokens`의 공개 토큰 목록으로 Tailwind 테마를 만들어 dist/theme.css에 쓴다.
// `@gyeol-ui/tokens`가 먼저 빌드되어 있어야 한다. turbo의 `^build`가 순서를 보장한다.
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatTheme } from "./format-theme.ts";
import { readPublicTokens } from "./read-public-tokens.ts";

const distDir = fileURLToPath(new URL("../dist", import.meta.url));

const theme = formatTheme(await readPublicTokens());

// 지난 결과가 남지 않도록 dist/를 비우고 다시 쓴다
await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await writeFile(join(distDir, "theme.css"), theme);
