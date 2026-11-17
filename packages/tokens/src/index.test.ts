import { expect, test } from "vitest";
import { packageName } from "./index.ts";

test("패키지 이름을 돌려준다", () => {
  expect(packageName()).toBe("@gyeol-ui/tokens");
});
