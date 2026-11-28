import publicTokens from "@gyeol-ui/tokens/tokens.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import { collectTokenSections } from "./token-sections.helper.ts";

// storybook build는 스토리를 실행하지 않는다. 구역을 정할 수 없는 토큰이 공개 토큰 목록에 생기면 여기서 CI가 실패한다
describe("공개 토큰 목록", () => {
  it("모든 토큰이 토큰 스토리의 구역에 들어간다", () => {
    // given, when, then
    expect(() => collectTokenSections(publicTokens)).not.toThrow();
  });
});
