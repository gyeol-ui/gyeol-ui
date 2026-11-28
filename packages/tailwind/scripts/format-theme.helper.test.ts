import { describe, expect, it } from "vitest";
import { toThemeVariable } from "./format-theme.helper.ts";

describe("toThemeVariable", () => {
  it.each([
    ["bg-surface", "--background-color-bg-surface"],
    ["fg-on-accent", "--text-color-fg-on-accent"],
    ["border-default", "--border-color-border-default"],
    ["ring-offset", "--ring-offset-color-ring-offset"],
    ["alpha.90", "--background-color-alpha-90"],
  ])("색 %s → %s", (path, variable) => {
    // given, when, then
    expect(
      toThemeVariable({ path, type: "color", cssVariable: "--gyeol-x" }),
    ).toBe(variable);
  });

  it.each([
    ["spacing.4", "--spacing-4"],
    ["radius.md", "--radius-md"],
    ["radius.full", "--radius-full"],
  ])("dimension %s → %s", (path, variable) => {
    // given, when, then
    expect(
      toThemeVariable({ path, type: "dimension", cssVariable: "--gyeol-x" }),
    ).toBe(variable);
  });

  it.each([
    // 표에 없는 Role
    ["shadow-card", "color"],
    // Role로 시작하는 다른 단어
    ["background-muted", "color"],
    // 그룹이 아닌 alpha
    ["alpha", "color"],
    // 표에 없는 범주
    ["size.4", "dimension"],
    // 범주만 있고 이름이 없음
    ["spacing", "dimension"],
  ] as const)("%s(%s) → undefined", (path, type) => {
    // given, when, then
    expect(
      toThemeVariable({ path, type, cssVariable: "--gyeol-x" }),
    ).toBeUndefined();
  });
});
