import publicTokens from "@gyeol-ui/tokens/tokens.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import { groupTokensByCategory } from "./group-tokens-by-category.helper.ts";

// groupTokensByCategory는 범주를 정할 수 없는 토큰이 있으면 실패하지만, 그 실패는 브라우저에서 스토리를 열 때 일어난다.
// storybook build는 스토리를 실행하지 않으므로, @gyeol-ui/tokens에 새 범주가 생겨도 CI는 통과하고 Storybook만 깨진다.
// 이 테스트는 실제 공개 토큰 목록을 넣어 그 경우를 CI에서 잡는다
describe("@gyeol-ui/tokens의 공개 토큰 목록", () => {
  it("모든 토큰의 범주를 정할 수 있다. 실패하면 토큰 스토리가 새 범주를 모른다는 뜻이다", () => {
    // given, when, then
    expect(() => groupTokensByCategory(publicTokens)).not.toThrow();
  });
});
