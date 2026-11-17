// <release-bump>: main에 쌓인 커밋 제목으로 release-please가 다음 버전을 어떻게 정하는지 계산해 본다.
//
// 규칙(release-please README와 manifest-releaser 문서):
// - feat → minor, fix → patch, type 뒤에 !가 붙으면 breaking → major
// - 릴리스를 만드는 커밋("releasable unit")은 feat, fix, deps다. chore, build 등만 있으면 릴리스 PR이 생기지 않는다
// - 1.0.0 미만에서 bump-minor-pre-major: true면 breaking이 minor만 올린다(기본 false)
// - 1.0.0 미만에서 bump-patch-for-minor-pre-major: true면 feat가 patch만 올린다(기본 false)
// 커밋 본문의 "BREAKING CHANGE:" footer와 changelog-sections 설정은 이 모듈에서 다루지 않는다.
//
// attribute
// - version: 현재 버전. 기본 0.1.0
// - commits: 처음 보여 줄 커밋 제목 배열(JSON)

import {
  controlStyles,
  escapeHtml,
  parseConventional,
  readJsonAttribute,
} from "./shared.js";

const LEVELS = ["none", "patch", "minor", "major"];

const styles = new CSSStyleSheet();
styles.replaceSync(`
  textarea {
    width: 100%;
    min-height: 120px;
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: inherit;
    background: var(--note-bg);
    border: 1px solid var(--note-border);
    border-radius: 6px;
    padding: 8px 10px;
    resize: vertical;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
    margin-top: 12px;
  }

  th, td {
    text-align: left;
    padding: 6px 8px;
    border-top: 1px solid var(--note-border);
  }

  th { font-weight: 600; color: var(--note-muted); font-size: 0.78rem; }
  td.title { font-family: var(--font-mono); font-size: 0.8rem; }

  .result {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-top: 14px;
    padding: 12px;
    border-radius: 6px;
    background: var(--note-bg);
  }

  .version {
    font-family: var(--font-mono);
    font-size: 1.3rem;
    font-weight: 700;
  }
`);

class ReleaseBump extends HTMLElement {
  connectedCallback() {
    const root = this.shadowRoot ?? this.attachShadow({ mode: "open" });
    root.adoptedStyleSheets = [controlStyles, styles];
    const commits = readJsonAttribute(this, "commits", [
      "feat(tokens): 색 토큰 추가",
      "fix(tokens): 간격 토큰 단위 수정",
      "chore: 의존성 정리",
    ]);

    root.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <label>현재 버전 <code>${escapeHtml(this.#version.join("."))}</code></label>
          <label><input type="checkbox" data-option="minorPreMajor" /> <code>bump-minor-pre-major</code></label>
          <label><input type="checkbox" data-option="patchForMinorPreMajor" /> <code>bump-patch-for-minor-pre-major</code></label>
        </div>
        <textarea data-input spellcheck="false" aria-label="main에 들어온 커밋 제목, 한 줄에 하나"></textarea>
        <div class="muted">한 줄에 커밋 제목 하나. 고쳐 보면 바로 다시 계산한다. 예: <code>feat(react)!: Button API 변경</code></div>
        <table>
          <thead><tr><th>커밋 제목</th><th>읽은 결과</th><th>올리는 자리</th></tr></thead>
          <tbody data-rows></tbody>
        </table>
        <div class="result" data-result></div>
      </div>
    `;
    root.querySelector("[data-input]").value = commits.join("\n");
    root.addEventListener("input", () => this.#render());
    this.#render();
  }

  get #version() {
    const parts = (this.getAttribute("version") ?? "0.1.0")
      .split(".")
      .map(Number);
    return parts.length === 3 && parts.every(Number.isInteger)
      ? parts
      : [0, 1, 0];
  }

  #render() {
    const root = this.shadowRoot;
    const options = {
      minorPreMajor: root.querySelector('[data-option="minorPreMajor"]')
        .checked,
      patchForMinorPreMajor: root.querySelector(
        '[data-option="patchForMinorPreMajor"]',
      ).checked,
    };
    const version = this.#version;
    const titles = root
      .querySelector("[data-input]")
      .value.split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const rows = titles.map((title) => {
      const parsed = parseConventional(title);
      const raw = commitLevel(parsed);
      return { title, parsed, level: adjustPreMajor(raw, version, options) };
    });

    root.querySelector("[data-rows]").innerHTML = rows.map(renderRow).join("");

    const highest = rows.reduce(
      (max, { level }) =>
        LEVELS.indexOf(level) > LEVELS.indexOf(max) ? level : max,
      "none",
    );
    const result = root.querySelector("[data-result]");
    if (highest === "none") {
      result.innerHTML = `<span class="badge done">릴리스 PR 없음</span>
        <span class="muted">feat, fix, deps, breaking 커밋이 하나도 없다</span>`;
      return;
    }
    result.innerHTML = `<span class="muted">다음 버전</span>
      <span class="version">${bump(version, highest).join(".")}</span>
      <span class="badge info">${highest}</span>
      <span class="muted">가장 큰 변경 하나가 버전을 정한다</span>`;
  }
}

function commitLevel(parsed) {
  if (!parsed) return "none";
  if (parsed.breaking) return "major";
  if (parsed.type === "feat") return "minor";
  if (parsed.type === "fix" || parsed.type === "deps") return "patch";
  return "none";
}

function adjustPreMajor(level, [major], options) {
  if (major > 0) return level;
  if (level === "major" && options.minorPreMajor) return "minor";
  if (level === "minor" && options.patchForMinorPreMajor) return "patch";
  return level;
}

function bump([major, minor, patch], level) {
  if (level === "major") return [major + 1, 0, 0];
  if (level === "minor") return [major, minor + 1, 0];
  return [major, minor, patch + 1];
}

function renderRow({ title, parsed, level }) {
  const read = parsed
    ? `<span class="badge running">${escapeHtml(parsed.type)}${parsed.breaking ? "!" : ""}</span>`
    : `<span class="badge cancelled">형식 아님</span>`;
  const effect =
    level === "none"
      ? `<span class="muted">없음</span>`
      : `<span class="badge info">${level}</span>`;
  return `<tr><td class="title">${escapeHtml(title)}</td><td>${read}</td><td>${effect}</td></tr>`;
}

customElements.define("release-bump", ReleaseBump);
