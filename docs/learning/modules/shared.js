// 시각화 모듈이 함께 쓰는 스타일과 도구.
// 색과 간격은 base.css의 CSS 변수를 쓴다. 변수는 shadow DOM 안으로 상속된다.

export const controlStyles = new CSSStyleSheet();
controlStyles.replaceSync(`
  :host {
    display: block;
    margin: 20px 0;
    font-family: var(--font-sans);
    color: var(--note-text);
  }

  .panel {
    border: 1px solid var(--note-border);
    border-radius: var(--radius);
    background: var(--note-surface);
    padding: 16px;
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-bottom: 12px;
  }

  button,
  select {
    font: inherit;
    font-size: 0.88rem;
    color: inherit;
    background: var(--note-bg);
    border: 1px solid var(--note-border);
    border-radius: 6px;
    padding: 4px 10px;
    cursor: pointer;
  }

  button:hover {
    border-color: var(--note-accent);
  }

  button[aria-pressed="true"] {
    background: var(--note-accent);
    border-color: var(--note-accent);
    color: #fff;
  }

  label {
    font-size: 0.88rem;
    display: inline-flex;
    gap: 6px;
    align-items: center;
  }

  code {
    font-family: var(--font-mono);
    font-size: 0.85em;
    background: var(--note-code-bg);
    padding: 0.1em 0.35em;
    border-radius: 4px;
  }

  .muted {
    color: var(--note-muted);
    font-size: 0.85rem;
  }

  .badge {
    display: inline-block;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 1px 8px;
    border-radius: 999px;
    border: 1px solid currentColor;
    white-space: nowrap;
  }

  .running { color: var(--state-running); }
  .pending { color: var(--state-pending); }
  .cancelled { color: var(--state-cancelled); }
  .done { color: var(--state-done); }
  .info { color: var(--state-info); }
`);

/** HTML 특수문자를 이스케이프한다. 모듈이 attribute로 받은 문자열을 그릴 때 쓴다. */
export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** JSON attribute를 읽는다. 없거나 깨졌으면 fallback을 돌려준다. */
export function readJsonAttribute(element, name, fallback) {
  const raw = element.getAttribute(name);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    console.warn(
      `<${element.localName}> ${name} attribute가 JSON이 아니다:`,
      raw,
    );
    return fallback;
  }
}

const CONVENTIONAL =
  /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<bang>!)?: (?<description>.+)$/;

/** Conventional Commit 제목을 나눈다. 형식이 아니면 null. */
export function parseConventional(title) {
  const match = CONVENTIONAL.exec(title.trim());
  if (!match?.groups) return null;
  const { type, scope, bang, description } = match.groups;
  return { type, scope: scope ?? null, breaking: bang === "!", description };
}
