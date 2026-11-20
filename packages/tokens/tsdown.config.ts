import { defineConfig, type UserConfig } from "tsdown";

const config: UserConfig = defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "neutral",
  dts: true,
  // dist/tokens.css를 먼저 쓰므로 지우지 않는다. 지난 결과는 scripts/build.ts가 지운다
  clean: false,
  publint: true,
});

export default config;
