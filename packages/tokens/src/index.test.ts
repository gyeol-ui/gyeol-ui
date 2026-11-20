import { describe, expect, it } from "vitest";
import { getPackageName } from "./index.ts";

describe("getPackageName", () => {
  it("패키지 이름을 돌려준다", () => {
    // when
    const name = getPackageName();

    // then
    expect(name).toBe("@gyeol-ui/tokens");
  });
});
