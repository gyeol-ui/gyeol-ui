// <merge-history>: 같은 PR을 merge commit, rebase, squash로 합쳤을 때 main 히스토리가 어떻게 달라지는지 그린다.
// 그 아래에 release-please가 읽게 될 main의 새 커밋 제목과, Conventional Commit으로 읽히는지를 보여 준다.
//
// attribute
// - pr-number: PR 번호. 기본 12
// - pr-title: PR 제목. 기본 "feat(react): Button 추가"
// - commits: PR 브랜치의 커밋 제목 배열(JSON). 기본 3개
// - method: 처음 고를 방식. merge | rebase | squash. 기본 squash

import {
  controlStyles,
  escapeHtml,
  parseConventional,
  readJsonAttribute,
} from "./shared.js";

const METHODS = {
  merge: {
    label: "Create a merge commit",
    summary:
      "브랜치 커밋이 모두 main 히스토리에 들어오고, 그 위에 merge commit이 하나 더 생긴다. merge commit 제목은 GitHub이 만든 문장이라 Conventional Commit 형식이 아니다.",
  },
  rebase: {
    label: "Rebase and merge",
    summary:
      "브랜치 커밋이 main 위에 하나씩 다시 쓰인다. 히스토리는 일직선이지만 PR 안에서만 의미 있던 커밋(wip, 오타 수정)도 main에 그대로 남는다.",
  },
  squash: {
    label: "Squash and merge",
    summary:
      "브랜치 커밋을 하나로 합쳐 main에 커밋 하나만 남긴다. 이 저장소는 그 커밋의 제목을 PR 제목으로 정했으므로, main의 커밋 제목은 곧 PR 제목이다.",
  },
};

const styles = new CSSStyleSheet();
styles.replaceSync(`
  svg {
    width: 100%;
    height: auto;
    display: block;
  }

  .line { stroke: var(--note-muted); stroke-width: 2; fill: none; }
  .branch { stroke: var(--note-accent); stroke-width: 2; fill: none; }
  .faded { opacity: 0.35; }
  .dashed { stroke-dasharray: 4 4; }
  .node-main { fill: var(--note-surface); stroke: var(--note-muted); stroke-width: 2; }
  .node-new { fill: var(--note-accent); stroke: var(--note-accent); stroke-width: 2; }
  .node-branch { fill: var(--note-surface); stroke: var(--note-accent); stroke-width: 2; }
  text { font-family: var(--font-mono); font-size: 11px; fill: var(--note-text); }
  text.caption { font-family: var(--font-sans); fill: var(--note-muted); }

  .summary { margin: 8px 0 12px; font-size: 0.92rem; }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }

  th, td {
    text-align: left;
    padding: 6px 8px;
    border-top: 1px solid var(--note-border);
    vertical-align: top;
  }

  th { font-weight: 600; color: var(--note-muted); font-size: 0.78rem; }
  td.title { font-family: var(--font-mono); font-size: 0.8rem; }
`);

class MergeHistory extends HTMLElement {
  #method = "squash";

  connectedCallback() {
    const root = this.shadowRoot ?? this.attachShadow({ mode: "open" });
    root.adoptedStyleSheets = [controlStyles, styles];
    const initial = this.getAttribute("method");
    if (initial && initial in METHODS) this.#method = initial;

    root.innerHTML = `
      <div class="panel">
        <div class="toolbar" role="group" aria-label="merge 방식">
          ${Object.entries(METHODS)
            .map(
              ([key, { label }]) =>
                `<button data-method="${key}">${label}</button>`,
            )
            .join("")}
        </div>
        <div data-graph></div>
        <p class="summary" data-summary></p>
        <table>
          <thead><tr><th>release-please가 읽는 main의 새 커밋</th><th>Conventional Commit</th></tr></thead>
          <tbody data-commits></tbody>
        </table>
      </div>
    `;
    root.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-method]");
      if (!button) return;
      this.#method = button.dataset.method;
      this.#render();
    });
    this.#render();
  }

  get #pr() {
    return {
      number: this.getAttribute("pr-number") ?? "12",
      title: this.getAttribute("pr-title") ?? "feat(react): Button 추가",
      commits: readJsonAttribute(this, "commits", [
        "feat(react): Button 뼈대",
        "wip",
        "fix(react): 앞 커밋의 오타 수정",
      ]),
    };
  }

  #render() {
    const root = this.shadowRoot;
    const pr = this.#pr;
    for (const button of root.querySelectorAll("button[data-method]")) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.method === this.#method),
      );
    }
    root.querySelector("[data-graph]").innerHTML = renderGraph(
      this.#method,
      pr,
    );
    root.querySelector("[data-summary]").textContent =
      METHODS[this.#method].summary;
    root.querySelector("[data-commits]").innerHTML = newMainCommits(
      this.#method,
      pr,
    )
      .map((title) => {
        const parsed = parseConventional(title);
        const verdict = parsed
          ? `<span class="badge running">${escapeHtml(parsed.type)}${parsed.breaking ? "!" : ""}</span>`
          : `<span class="badge cancelled">형식 아님</span>`;
        return `<tr><td class="title">${escapeHtml(title)}</td><td>${verdict}</td></tr>`;
      })
      .join("");
  }
}

/** merge 방식별로 main에 새로 생기는 커밋 제목(오래된 것부터). */
function newMainCommits(method, pr) {
  if (method === "merge") {
    return [
      ...pr.commits,
      `Merge pull request #${pr.number} from someone/button`,
    ];
  }
  if (method === "rebase") return [...pr.commits];
  return [`${pr.title} (#${pr.number})`];
}

const W = 640;
const MAIN_Y = 120;
const BRANCH_Y = 50;
const STEP = 80;
const R = 8;

function renderGraph(method, pr) {
  const base = [40, 40 + STEP]; // 원래 main에 있던 커밋 A, B
  const forkX = base[1];
  const branchXs = pr.commits.map((_, i) => forkX + STEP * (i + 1));
  const parts = [];

  // 원래 main
  parts.push(
    `<line class="line" x1="10" y1="${MAIN_Y}" x2="${forkX}" y2="${MAIN_Y}" />`,
  );

  // PR 브랜치. merge commit 방식에서만 main 히스토리의 일부가 되므로 진하게 그린다
  const branchFaded = method !== "merge";
  const branchClass = `branch${branchFaded ? " faded dashed" : ""}`;
  const lastBranchX = branchXs.at(-1);
  parts.push(
    `<path class="${branchClass}" d="M ${forkX} ${MAIN_Y} C ${forkX + 30} ${MAIN_Y}, ${forkX + 20} ${BRANCH_Y}, ${forkX + 50} ${BRANCH_Y} L ${lastBranchX} ${BRANCH_Y}" />`,
  );

  let newMain = [];
  if (method === "merge") {
    const mergeX = lastBranchX + STEP;
    parts.push(
      `<path class="branch" d="M ${lastBranchX} ${BRANCH_Y} C ${lastBranchX + 40} ${BRANCH_Y}, ${mergeX - 30} ${MAIN_Y}, ${mergeX} ${MAIN_Y}" />`,
      `<line class="line" x1="${forkX}" y1="${MAIN_Y}" x2="${mergeX}" y2="${MAIN_Y}" />`,
    );
    newMain = [{ x: mergeX, label: "M" }];
  } else if (method === "rebase") {
    const xs = pr.commits.map((_, i) => forkX + STEP * (i + 1));
    parts.push(
      `<line class="line" x1="${forkX}" y1="${MAIN_Y}" x2="${xs.at(-1)}" y2="${MAIN_Y}" />`,
    );
    newMain = xs.map((x, i) => ({ x, label: `${i + 1}'` }));
  } else {
    const squashX = forkX + STEP;
    parts.push(
      `<line class="line" x1="${forkX}" y1="${MAIN_Y}" x2="${squashX}" y2="${MAIN_Y}" />`,
      // 브랜치 커밋들이 하나로 모이는 모습
      ...branchXs.map(
        (x) =>
          `<line class="branch faded dashed" x1="${x}" y1="${BRANCH_Y + R}" x2="${squashX}" y2="${MAIN_Y - R}" />`,
      ),
    );
    newMain = [{ x: squashX, label: "S" }];
  }

  base.forEach((x, i) => {
    parts.push(
      `<circle class="node-main" cx="${x}" cy="${MAIN_Y}" r="${R}" />`,
      `<text x="${x}" y="${MAIN_Y + 26}" text-anchor="middle">${"AB"[i]}</text>`,
    );
  });

  branchXs.forEach((x, i) => {
    parts.push(
      `<circle class="node-branch${branchFaded ? " faded" : ""}" cx="${x}" cy="${BRANCH_Y}" r="${R}" />`,
      `<text x="${x}" y="${BRANCH_Y - 14}" text-anchor="middle"${branchFaded ? ' class="faded"' : ""}>${i + 1}</text>`,
    );
  });

  for (const { x, label } of newMain) {
    parts.push(
      `<circle class="node-new" cx="${x}" cy="${MAIN_Y}" r="${R}" />`,
      `<text x="${x}" y="${MAIN_Y + 26}" text-anchor="middle">${label}</text>`,
    );
  }

  parts.push(
    `<text class="caption" x="10" y="${BRANCH_Y - 30}">PR #${escapeHtml(pr.number)} 브랜치</text>`,
    `<text class="caption" x="10" y="${MAIN_Y + 50}">main (파란 점이 이번 merge로 생긴 커밋)</text>`,
  );

  return `<svg viewBox="0 0 ${W} 180" role="img" aria-label="${METHODS[method].label} 결과 히스토리">${parts.join("")}</svg>`;
}

customElements.define("merge-history", MergeHistory);
