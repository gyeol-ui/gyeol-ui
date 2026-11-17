// 인터랙티브 모듈이 함께 쓰는 스타일과 도구.
// 색은 learn.css의 테마 변수를 쓴다. CSS 변수와 글꼴은 shadow DOM 안으로 상속된다.

export const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export const controlStyles = new CSSStyleSheet();
controlStyles.replaceSync(`
  /* learn.css의 * 선택자는 shadow DOM 안에 닿지 않으므로 다시 정한다 */
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  :host {
    display: block;
    margin: 1.25rem 0;
    color: var(--text);
  }

  /* learn.css의 순서도, 시간 막대와 같은 틀 */
  .panel {
    padding: 1rem 1.1rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--code-bg);
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  button,
  select {
    padding: 0.25rem 0.65rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    color: inherit;
    background: var(--surface);
    font: inherit;
    font-size: 0.85rem;
    cursor: pointer;
  }

  button:hover {
    border-color: var(--accent);
  }

  button[aria-pressed="true"] {
    border-color: var(--blue);
    color: var(--blue);
    background: var(--blue-bg);
    font-weight: 600;
  }

  label {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.85rem;
  }

  code {
    padding: 0.1em 0.35em;
    border-radius: 4px;
    background: var(--surface);
    font: 0.85em/1.5 ${MONO};
  }

  .muted {
    color: var(--muted);
    font-size: 0.8rem;
  }

  /* learn.css의 badge와 같은 모양. 색은 상태 클래스가 정한다 */
  .badge {
    display: inline-block;
    padding: 0.05rem 0.5rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .badge.running { color: var(--green); background: var(--green-bg); }
  .badge.pending { color: var(--warn); background: var(--warn-bg); }
  .badge.cancelled { color: var(--accent); background: var(--diff-del-bg); }
  .badge.done { color: var(--muted); background: var(--surface); }
  .badge.info { color: var(--blue); background: var(--blue-bg); }

  .running { color: var(--green); }
  .pending { color: var(--warn); }
  .cancelled { color: var(--accent); }
  .done { color: var(--muted); }
  .info { color: var(--blue); }
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
