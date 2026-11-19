// docs/learning을 로컬 정적 서버로 띄운다. `pnpm learning`으로 실행한다.
// 노트는 file://로 바로 열어도 되지만, 서버로 열면 주소 하나로 목록과 노트를 오갈 수 있다.
// 의존성 없이 Node 내장 모듈만 쓴다.

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../docs/learning/", import.meta.url));
const PORT = Number(process.env.PORT ?? 4321);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

async function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const path = normalize(join(ROOT, decoded));
  // ROOT 밖의 파일은 내주지 않는다
  if (path !== ROOT.slice(0, -1) && !path.startsWith(ROOT)) return null;
  const info = await stat(path).catch(() => null);
  if (!info) return null;
  if (info.isDirectory()) return resolveFile(join(decoded, "index.html"));
  return path;
}

const server = createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? "/", "http://localhost");
  const file = await resolveFile(pathname);
  if (!file) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  response.writeHead(200, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    "cache-control": "no-store",
  });
  createReadStream(file).pipe(response);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`학습 노트: http://localhost:${PORT}/`);
  console.log(
    `(${ROOT.split(sep).slice(-3).join("/")}을 보여 준다. 끝내려면 Ctrl+C)`,
  );
});
