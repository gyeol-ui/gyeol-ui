import { defineConfig, type UserConfig } from "tsdown";

const config: UserConfig = defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "neutral",
  dts: true,
  // scripts/build.ts가 generated/에 만든 CSS를 dist/로 복사한다. dist/는 기본 clean으로 비운 뒤 채운다
  copy: [{ from: "generated/tokens.css", to: "dist" }],
  publint: true,
});

export default config;
