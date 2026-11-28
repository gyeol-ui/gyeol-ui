import { describe, expect, it } from "vitest";
import { collectTokenSections } from "./token-sections.helper.ts";

describe("collectTokenSections", () => {
  it("type과 경로로 색, 간격, 모서리 구역에 나눈다", () => {
    // given, when
    const sections = collectTokenSections([
      { path: "bg-surface", type: "color", cssVariable: "--gyeol-bg-surface" },
      {
        path: "spacing.4",
        type: "dimension",
        cssVariable: "--gyeol-spacing-4",
      },
      { path: "fg-default", type: "color", cssVariable: "--gyeol-fg-default" },
      {
        path: "radius.md",
        type: "dimension",
        cssVariable: "--gyeol-radius-md",
      },
    ]);

    // then
    expect(sections).toEqual({
      color: [
        { path: "bg-surface", cssVariable: "--gyeol-bg-surface" },
        { path: "fg-default", cssVariable: "--gyeol-fg-default" },
      ],
      spacing: [{ path: "spacing.4", cssVariable: "--gyeol-spacing-4" }],
      radius: [{ path: "radius.md", cssVariable: "--gyeol-radius-md" }],
    });
  });

  it("alpha 그룹은 색 구역에 들어간다", () => {
    // given, when
    const sections = collectTokenSections([
      { path: "alpha.90", type: "color", cssVariable: "--gyeol-alpha-90" },
    ]);

    // then
    expect(sections).toEqual({
      color: [{ path: "alpha.90", cssVariable: "--gyeol-alpha-90" }],
      spacing: [],
      radius: [],
    });
  });

  it.each([
    // 모르는 type
    ["shadow.md", "shadow"],
    // 모르는 범주
    ["size.4", "dimension"],
    // 범주만 있고 이름이 없음
    ["spacing", "dimension"],
  ])("%s(%s)가 있으면 실패한다", (path, type) => {
    // given, when, then
    expect(() =>
      collectTokenSections([
        {
          path: "bg-surface",
          type: "color",
          cssVariable: "--gyeol-bg-surface",
        },
        { path, type, cssVariable: "--gyeol-x" },
      ]),
    ).toThrow(path);
  });

  it("새 토큰은 다른 코드를 고치지 않아도 해당 구역에 나타난다", () => {
    // given, when
    const sections = collectTokenSections([
      { path: "bg-danger", type: "color", cssVariable: "--gyeol-bg-danger" },
      { path: "alpha.50", type: "color", cssVariable: "--gyeol-alpha-50" },
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
    expect(sections).toEqual({
      color: [
        { path: "bg-danger", cssVariable: "--gyeol-bg-danger" },
        { path: "alpha.50", cssVariable: "--gyeol-alpha-50" },
      ],
      spacing: [{ path: "spacing.12", cssVariable: "--gyeol-spacing-12" }],
      radius: [{ path: "radius.lg", cssVariable: "--gyeol-radius-lg" }],
    });
  });
});
