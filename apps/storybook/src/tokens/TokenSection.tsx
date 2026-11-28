import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import type { SectionToken, TokenCategory } from "./token-sections.helper.ts";

/** 범주마다 Token 값을 칠해 보이는 시각화. 모두 `var(--gyeol-…)`를 inline style로 칠한다 */
const PREVIEWS: Record<TokenCategory, (variable: string) => ReactNode> = {
  color: (variable) => (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 6,
        border: "1px solid var(--gyeol-border-default)",
        background: variable,
      }}
    />
  ),
  spacing: (variable) => (
    <div
      style={{
        width: variable,
        height: 16,
        background: "var(--gyeol-bg-accent)",
      }}
    />
  ),
  radius: (variable) => (
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: variable,
        border: "2px solid var(--gyeol-bg-accent)",
        background: "var(--gyeol-bg-subtle)",
      }}
    />
  ),
};

const CELL_STYLE: CSSProperties = {
  padding: "12px 16px",
  borderBottom: "1px solid var(--gyeol-border-default)",
  textAlign: "left",
  verticalAlign: "middle",
};

const CODE_STYLE: CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 13,
};

/** `<html>`에서 CSS 변수의 계산된 값을 읽는다 */
function readComputedValue(cssVariable: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(cssVariable)
    .trim();
}

/** 한 범주의 Token마다 시각화, 이름, CSS 변수, 계산된 값을 보이는 표 */
export function TokenSection({
  category,
  tokens,
}: {
  category: TokenCategory;
  tokens: readonly SectionToken[];
}): ReactNode {
  const [computedValues, setComputedValues] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    setComputedValues(
      Object.fromEntries(
        tokens.map((token) => [
          token.cssVariable,
          readComputedValue(token.cssVariable),
        ]),
      ),
    );
  }, [tokens]);

  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontFamily: "system-ui, sans-serif",
        fontSize: 14,
        color: "var(--gyeol-fg-default)",
        background: "var(--gyeol-bg-surface)",
      }}
    >
      <thead>
        <tr>
          <th style={CELL_STYLE}>미리보기</th>
          <th style={CELL_STYLE}>이름</th>
          <th style={CELL_STYLE}>CSS 변수</th>
          <th style={CELL_STYLE}>계산된 값</th>
        </tr>
      </thead>
      <tbody>
        {tokens.map((token) => (
          <tr key={token.cssVariable}>
            <td style={CELL_STYLE}>
              {PREVIEWS[category](`var(${token.cssVariable})`)}
            </td>
            <td style={{ ...CELL_STYLE, ...CODE_STYLE }}>{token.path}</td>
            <td style={{ ...CELL_STYLE, ...CODE_STYLE }}>
              {token.cssVariable}
            </td>
            <td
              style={{
                ...CELL_STYLE,
                ...CODE_STYLE,
                color: "var(--gyeol-fg-muted)",
              }}
            >
              {computedValues[token.cssVariable]}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
