import { describe, expect, it } from "vitest";
import { packageName } from "./index.ts";

describe("packageName", () => {
  it("패키지 이름을 돌려준다", () => {
    expect(packageName()).toBe("@gyeol-ui/tokens");
  });
});
