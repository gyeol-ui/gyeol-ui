// <concurrency-sim>: GitHub Actions concurrency group의 동작을 직접 눌러 보는 시뮬레이터.
//
// 규칙(GitHub 문서 "Workflow syntax > concurrency", queue: single 기본값):
// - 한 그룹에는 실행 중(running) 최대 1개, 대기(pending) 최대 1개가 있다.
// - 새 실행이 오면 대기 중이던 실행은 취소되고 새 실행이 그 자리를 차지한다.
// - cancel-in-progress가 true면 실행 중인 것도 취소되고 새 실행이 바로 돈다.
// - 이름이 다른 그룹은 서로 상관없이 병렬로 돈다.
//
// attribute
// - run-seconds: 실행 하나가 끝나는 데 걸리는 시간(초). 기본 6

import { controlStyles } from "./shared.js";

const TICK_MS = 100;

const GROUP_MODES = {
  repo: {
    label: "ci-${{ github.event.pull_request.number || github.sha }}",
    note: "이 저장소의 설정",
    name: (event) =>
      event.type === "pull_request" ? `ci-${event.pr}` : `ci-${event.sha}`,
  },
  ref: {
    label: "ci-${{ github.ref }}",
    note: "비교용: main push가 한 그룹을 공유한다",
    name: (event) =>
      event.type === "pull_request"
        ? `ci-refs/pull/${event.pr}/merge`
        : "ci-refs/heads/main",
  },
};

const CANCEL_MODES = {
  repo: {
    label: "${{ github.event_name == 'pull_request' }}",
    note: "이 저장소의 설정",
    cancels: (event) => event.type === "pull_request",
  },
  always: { label: "true", note: "비교용", cancels: () => true },
  never: { label: "false", note: "비교용(기본값)", cancels: () => false },
};

const styles = new CSSStyleSheet();
styles.replaceSync(`
  .yaml {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.82rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 12px;
    margin: 0 0 12px;
    white-space: pre;
    overflow-x: auto;
  }

  .groups {
    display: grid;
    gap: 10px;
  }

  .group {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 12px;
  }

  .group-name {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.82rem;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .slots {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .slot {
    border: 1px dashed var(--border);
    border-radius: 6px;
    padding: 6px 8px;
    min-height: 54px;
  }

  .slot-title {
    font-size: 0.72rem;
    color: var(--muted);
    margin-bottom: 4px;
  }

  .run {
    font-size: 0.85rem;
  }

  .bar {
    height: 4px;
    margin-top: 6px;
    background: var(--border);
    border-radius: 2px;
    overflow: hidden;
  }

  .bar > span {
    display: block;
    height: 100%;
    background: var(--green);
  }

  .history {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 8px;
  }

  .history .badge {
    font-weight: 400;
  }

  .log {
    margin: 12px 0 0;
    padding-left: 20px;
    font-size: 0.85rem;
  }

  .empty {
    color: var(--muted);
    font-size: 0.85rem;
    padding: 8px 0;
  }
`);

class ConcurrencySim extends HTMLElement {
  #groupMode = "repo";
  #cancelMode = "repo";
  /** @type {Map<string, {running: object | null, pending: object | null, history: object[]}>} */
  #groups = new Map();
  #log = [];
  #seq = 0;
  #paused = false;
  #timer = 0;

  connectedCallback() {
    const root = this.shadowRoot ?? this.attachShadow({ mode: "open" });
    root.adoptedStyleSheets = [controlStyles, styles];
    root.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <button data-action="pr" data-pr="7">PR #7에 push</button>
          <button data-action="pr" data-pr="9">PR #9에 push</button>
          <button data-action="main">main에 merge</button>
          <span style="flex:1"></span>
          <button data-action="pause" aria-pressed="false">일시정지</button>
          <button data-action="reset">초기화</button>
        </div>
        <div class="toolbar">
          <label>group
            <select data-select="group">${options(GROUP_MODES)}</select>
          </label>
          <label>cancel-in-progress
            <select data-select="cancel">${options(CANCEL_MODES)}</select>
          </label>
        </div>
        <div class="yaml" data-yaml></div>
        <div class="groups" data-groups></div>
        <ol class="log" data-log reversed></ol>
      </div>
    `;

    root.addEventListener("click", (event) => this.#onClick(event));
    root.addEventListener("change", (event) => this.#onChange(event));
    this.#timer = setInterval(() => this.#tick(), TICK_MS);
    this.#render();
  }

  disconnectedCallback() {
    clearInterval(this.#timer);
  }

  get #runMs() {
    const seconds = Number(this.getAttribute("run-seconds"));
    return (Number.isFinite(seconds) && seconds > 0 ? seconds : 6) * 1000;
  }

  #onClick(event) {
    const button = event.target.closest("button");
    if (!button) return;
    const { action } = button.dataset;
    if (action === "pr")
      this.#trigger({ type: "pull_request", pr: button.dataset.pr });
    if (action === "main") this.#trigger({ type: "push", sha: randomSha() });
    if (action === "pause") {
      this.#paused = !this.#paused;
      button.setAttribute("aria-pressed", String(this.#paused));
    }
    if (action === "reset") this.#reset();
  }

  #onChange(event) {
    const select = event.target.closest("select");
    if (!select) return;
    if (select.dataset.select === "group") this.#groupMode = select.value;
    if (select.dataset.select === "cancel") this.#cancelMode = select.value;
    // 설정이 바뀌면 이전 그룹 이름이 의미를 잃으므로 처음부터 다시 본다
    this.#reset();
  }

  #reset() {
    this.#groups.clear();
    this.#log = [];
    this.#seq = 0;
    this.#render();
  }

  #trigger(event) {
    const groupName = GROUP_MODES[this.#groupMode].name(event);
    const cancelInProgress = CANCEL_MODES[this.#cancelMode].cancels(event);
    const run = {
      id: ++this.#seq,
      label:
        event.type === "pull_request"
          ? `#${this.#seq} PR #${event.pr} push`
          : `#${this.#seq} main ${event.sha}`,
      progress: 0,
    };

    let group = this.#groups.get(groupName);
    if (!group) {
      group = { running: null, pending: null, history: [] };
      this.#groups.set(groupName, group);
    }

    if (!group.running) {
      group.running = run;
      this.#write(
        `${run.label}: 그룹 ${groupName}이 비어 있어 바로 실행한다`,
        "running",
      );
    } else if (cancelInProgress) {
      this.#finish(group, group.running, "cancelled");
      if (group.pending) this.#finish(group, group.pending, "cancelled");
      group.pending = null;
      group.running = run;
      this.#write(
        `${run.label}: cancel-in-progress가 true라 실행 중이던 것을 취소하고 바로 실행한다`,
        "cancelled",
      );
    } else {
      if (group.pending) {
        this.#finish(group, group.pending, "cancelled");
        this.#write(
          `${run.label}: 대기 중이던 ${group.pending.label}을 취소하고 대기 자리를 차지한다`,
          "cancelled",
        );
      } else {
        this.#write(`${run.label}: 실행 중인 것이 있어 대기한다`, "pending");
      }
      group.pending = run;
    }
    this.#render();
  }

  #finish(group, run, state) {
    group.history.unshift({ label: run.label, state });
    group.history.length = Math.min(group.history.length, 8);
  }

  #tick() {
    if (this.#paused) return;
    let changed = false;
    for (const [name, group] of this.#groups) {
      if (!group.running) continue;
      changed = true;
      group.running.progress += TICK_MS / this.#runMs;
      if (group.running.progress < 1) continue;
      this.#finish(group, group.running, "done");
      this.#write(`${group.running.label}: 끝났다`, "done");
      group.running = group.pending;
      group.pending = null;
      if (group.running)
        this.#write(
          `${group.running.label}: 그룹 ${name}의 대기에서 실행으로 넘어간다`,
          "running",
        );
    }
    if (changed) this.#render();
  }

  #write(message, state) {
    this.#log.unshift({ message, state });
    this.#log.length = Math.min(this.#log.length, 8);
  }

  #render() {
    const root = this.shadowRoot;
    const group = GROUP_MODES[this.#groupMode];
    const cancel = CANCEL_MODES[this.#cancelMode];
    root.querySelector("[data-yaml]").textContent =
      `concurrency:\n  group: ${group.label}\n  cancel-in-progress: ${cancel.label}`;

    // 최근에 만들어진 그룹이 위에 오게 한다
    const groups = [...this.#groups].toReversed().slice(0, 6);
    root.querySelector("[data-groups]").innerHTML = groups.length
      ? groups.map(([name, g]) => renderGroup(name, g)).join("")
      : `<div class="empty">위 버튼으로 이벤트를 보내 보자.</div>`;

    root.querySelector("[data-log]").innerHTML = this.#log
      .map(({ message, state }) => `<li class="${state}">${message}</li>`)
      .join("");
  }
}

function options(modes) {
  return Object.entries(modes)
    .map(
      ([value, mode]) =>
        `<option value="${value}">${mode.label} (${mode.note})</option>`,
    )
    .join("");
}

function renderGroup(name, group) {
  const running = group.running
    ? `<div class="run running">${group.running.label}</div>
       <div class="bar"><span style="width:${Math.min(group.running.progress, 1) * 100}%"></span></div>`
    : "";
  const pending = group.pending
    ? `<div class="run pending">${group.pending.label}</div>`
    : "";
  const history = group.history
    .map(
      ({ label, state }) =>
        `<span class="badge ${state}">${label} ${STATE_TEXT[state]}</span>`,
    )
    .join("");
  return `
    <div class="group">
      <div class="group-name">${name}</div>
      <div class="slots">
        <div class="slot"><div class="slot-title">실행 중 (최대 1)</div>${running}</div>
        <div class="slot"><div class="slot-title">대기 (최대 1)</div>${pending}</div>
      </div>
      ${history ? `<div class="history">${history}</div>` : ""}
    </div>
  `;
}

const STATE_TEXT = { done: "완료", cancelled: "취소" };

function randomSha() {
  return Math.floor(Math.random() * 0xfffffff)
    .toString(16)
    .padStart(7, "0");
}

customElements.define("concurrency-sim", ConcurrencySim);
