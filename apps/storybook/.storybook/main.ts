import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  // 앱 안의 토큰 스토리와, 모든 패키지의 컴포넌트 스토리를 모은다
  stories: [
    "../src/**/*.stories.tsx",
    "../../../packages/*/src/**/*.stories.tsx",
  ],
  framework: "@storybook/react-vite",
};

export default config;
