import publicTokens from "@gyeol-ui/tokens/tokens.json" with { type: "json" };
import type { Meta, StoryObj } from "@storybook/react-vite";
import { TokenSection } from "./TokenSection.tsx";
import { groupTokensByCategory } from "./group-tokens-by-category.helper.ts";

// 공개 토큰 목록을 범주별로 나눈다. 토큰이 추가되거나 바뀌어도 이 파일은 고치지 않는다
const groups = groupTokensByCategory(publicTokens);

const meta: Meta<typeof TokenSection> = {
  title: "Tokens",
  component: TokenSection,
  parameters: { controls: { disable: true } },
};

export default meta;

type Story = StoryObj<typeof TokenSection>;

/** Semantic 색 전부(`alpha` 그룹 포함). Primitive 색은 공개 API가 아니라 보여주지 않는다 */
export const Color: Story = {
  args: { category: "color", tokens: groups.color },
};

/** 간격(`spacing.*`). 막대 길이가 값이다 */
export const Spacing: Story = {
  args: { category: "spacing", tokens: groups.spacing },
};

/** 모서리(`radius.*`). 상자의 모서리 반경이 값이다 */
export const Radius: Story = {
  args: { category: "radius", tokens: groups.radius },
};
