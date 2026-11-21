import { defineConfig, type UserConfig } from "tsdown";

const config: UserConfig = defineConfig({
  // scripts/build.ts가 generated/에 만든 TS 소스가 패키지 진입점이다. dist/index.js로 나온다
  entry: { index: "generated/index.ts" },
  format: "esm",
  platform: "neutral",
  dts: true,
  // scripts/build.ts가 generated/에 만든 CSS와 공개 토큰 목록을 dist/로 복사한다. dist/는 기본 clean으로 비운 뒤 채운다
  copy: [
    { from: "generated/tokens.css", to: "dist" },
    { from: "generated/tokens.json", to: "dist" },
  ],
  publint: true,
});

export default config;
