import { describe, expect, it } from "vitest";
import { groupTokensByCategory } from "./group-tokens-by-category.helper.ts";

describe(groupTokensByCategory.name, () => {
  it("color는 색, dimension은 경로의 첫 조각(spacing, radius)으로 나눈다", () => {
    // given, when
    // 지금 공개 토큰 목록에 없는 이름(bg-danger, spacing.12, radius.lg)을 섞는다.
    // 토큰 이름을 코드에 적지 않고 type과 경로만 보고 나눈다는 것을 보이기 위해서다
    const groups = groupTokensByCategory([
      { path: "bg-surface", type: "color", cssVariable: "--gyeol-bg-surface" },
      {
        path: "spacing.4",
        type: "dimension",
        cssVariable: "--gyeol-spacing-4",
      },
      { path: "bg-danger", type: "color", cssVariable: "--gyeol-bg-danger" },
      {
        path: "spacing.12",
        type: "dimension",
        cssVariable: "--gyeol-spacing-12",
      },
      {
        path: "radius.lg",
        type: "dimension",
        cssVariable: "--gyeol-radius-lg",
      },
    ]);

    // then
    expect(groups).toEqual({
      color: [
        { path: "bg-surface", cssVariable: "--gyeol-bg-surface" },
        { path: "bg-danger", cssVariable: "--gyeol-bg-danger" },
      ],
      spacing: [
        { path: "spacing.4", cssVariable: "--gyeol-spacing-4" },
        { path: "spacing.12", cssVariable: "--gyeol-spacing-12" },
      ],
      radius: [{ path: "radius.lg", cssVariable: "--gyeol-radius-lg" }],
    });
  });

  it("Role로 시작하지 않는 alpha 그룹도 색에 들어간다", () => {
    // given, when
    // alpha.90은 bg, fg 같은 Role로 시작하지 않는다.
    // 색을 Role 이름으로 거르게 바뀌면 빠지기 쉬워 따로 확인한다
    const groups = groupTokensByCategory([
      { path: "alpha.90", type: "color", cssVariable: "--gyeol-alpha-90" },
    ]);

    // then
    expect(groups).toEqual({
      color: [{ path: "alpha.90", cssVariable: "--gyeol-alpha-90" }],
      spacing: [],
      radius: [],
    });
  });

  // 범주를 정할 수 없는 토큰을 조용히 빼면 스토리에서 사라진다. 실패해야 토큰 스토리를 고칠 수 있다
  it.each([
    // 모르는 type
    ["shadow.md", "shadow"],
    // 모르는 범주
    ["size.4", "dimension"],
    // 범주만 있고 이름이 없음
    ["spacing", "dimension"],
  ])("%s(%s)가 있으면 그 경로를 담아 실패한다", (path, type) => {
    // given, when, then
    expect(() =>
      groupTokensByCategory([
        {
          path: "bg-surface",
          type: "color",
          cssVariable: "--gyeol-bg-surface",
        },
        { path, type, cssVariable: "--gyeol-x" },
      ]),
    ).toThrow(path);
  });
});
