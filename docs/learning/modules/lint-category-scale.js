// <lint-category-scale>: oxlint 규칙 범주를 "확실히 틀린 코드"부터 "팀의 정책"까지 한 줄에 놓고,
// 주어진 설정에서 범주마다 켜져 있는지 보여 준다. 범주를 누르면 설명과 예시 규칙이 열린다.
//
// 범주 설명은 oxc.rs 설정 문서, 규칙 수와 예시는 oxlint 1.94.0의 `oxlint --rules --format=json` 출력에서 가져왔다.
// 규칙 수는 기본으로 꺼진 플러그인(react, import 등)의 규칙까지 포함한 등록 규칙 수다.
//
// attribute
// - config: .oxlintrc.json의 categories 객체(JSON). 없는 범주는 oxlint 기본값을 따른다(correctness만 켜짐)

import { controlStyles, escapeHtml, readJsonAttribute } from "./shared.js";

const CATEGORIES = [
  {
    name: "correctness",
    description: "확실히 틀렸거나 쓸모없는 코드",
    count: 272,
    examples: [
      "eslint/no-debugger",
      "eslint/for-direction",
      "eslint/no-unsafe-finally",
      "typescript/no-floating-promises",
    ],
  },
  {
    name: "suspicious",
    description: "틀렸거나 쓸모없을 가능성이 높은 코드",
    count: 68,
    examples: [
      "eslint/no-extend-native",
      "eslint/no-new",
      "eslint/no-useless-concat",
    ],
  },
  {
    name: "perf",
    description: "실행 성능을 개선하려는 규칙",
    count: 15,
    examples: ["eslint/no-await-in-loop", "oxc/no-accumulating-spread"],
  },
  {
    name: "pedantic",
    description: "더 엄격한 규칙. 오탐이 있을 수 있다",
    count: 126,
    examples: [
      "eslint/eqeqeq",
      "eslint/array-callback-return",
      "eslint/max-lines",
    ],
  },
  {
    name: "style",
    description: "관용적이고 일관된 스타일 규칙",
    count: 279,
    examples: ["eslint/prefer-const", "eslint/curly", "eslint/func-style"],
  },
  {
    name: "restriction",
    description: "특정 패턴이나 기능을 금지하는 규칙",
    count: 101,
    examples: ["eslint/no-console", "eslint/no-var", "eslint/no-plusplus"],
  },
  {
    name: "nursery",
    description: "개발 중이라 바뀔 수 있는 규칙",
    count: 11,
    examples: ["eslint/no-undef", "typescript/prefer-optional-chain"],
    offAxis: true,
  },
];

const DEFAULTS = { correctness: "warn" };
const MAX_COUNT = Math.max(...CATEGORIES.map((c) => c.count));

const styles = new CSSStyleSheet();
styles.replaceSync(`
  .axis {
    display: flex;
    justify-content: space-between;
    font-size: 0.78rem;
    color: var(--note-muted);
    margin-bottom: 6px;
  }

  .arrow {
    height: 2px;
    background: linear-gradient(to right, var(--state-cancelled), var(--note-border));
    margin-bottom: 12px;
    position: relative;
  }

  .list {
    display: grid;
    gap: 6px;
  }

  .category {
    display: grid;
    grid-template-columns: 110px 64px 1fr;
    gap: 10px;
    align-items: center;
    width: 100%;
    text-align: left;
    padding: 8px 10px;
  }

  .category.off-axis {
    margin-top: 10px;
    border-style: dashed;
  }

  .category[data-on="false"] .name,
  .category[data-on="false"] .bar > span {
    opacity: 0.45;
  }

  .name {
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 0.85rem;
  }

  .bar {
    height: 8px;
    background: var(--note-border);
    border-radius: 4px;
    overflow: hidden;
  }

  .bar > span {
    display: block;
    height: 100%;
    background: var(--note-accent);
  }

  .detail {
    padding: 8px 12px 12px;
    font-size: 0.88rem;
  }

  .detail ul {
    margin: 6px 0 0;
    padding-left: 18px;
  }
`);

class LintCategoryScale extends HTMLElement {
  #open = null;

  connectedCallback() {
    const root = this.shadowRoot ?? this.attachShadow({ mode: "open" });
    root.adoptedStyleSheets = [controlStyles, styles];
    root.innerHTML = `
      <div class="panel">
        <div class="axis"><span>확실한 버그</span><span>팀의 정책과 취향</span></div>
        <div class="arrow"></div>
        <div class="list" data-list></div>
        <p class="muted">막대 길이는 oxlint 1.94.0에 등록된 범주별 규칙 수. 범주를 누르면 예시 규칙이 열린다.</p>
      </div>
    `;
    root.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-name]");
      if (!button) return;
      this.#open =
        this.#open === button.dataset.name ? null : button.dataset.name;
      this.#render();
    });
    this.#render();
  }

  #render() {
    const config = { ...DEFAULTS, ...readJsonAttribute(this, "config", {}) };
    this.shadowRoot.querySelector("[data-list]").innerHTML = CATEGORIES.map(
      (category) => {
        const severity = normalize(config[category.name]);
        const on = severity !== "off";
        const open = this.#open === category.name;
        const badgeClass = { error: "cancelled", warn: "pending", off: "done" }[
          severity
        ];
        return `
        <button class="category${category.offAxis ? " off-axis" : ""}" data-name="${category.name}"
          data-on="${on}" aria-expanded="${open}">
          <span class="name">${category.name}</span>
          <span class="badge ${badgeClass}">${severity}</span>
          <span class="bar"><span style="width:${(category.count / MAX_COUNT) * 100}%"></span></span>
        </button>
        ${
          open
            ? `<div class="detail">
                <div>${escapeHtml(category.description)}. 등록 규칙 ${category.count}개.</div>
                <ul>${category.examples
                  .map((rule) => `<li><code>${rule}</code></li>`)
                  .join("")}</ul>
              </div>`
            : ""
        }
      `;
      },
    ).join("");
  }
}

/** oxlint는 "deny"/"allow"와 "error"/"off"를 같은 뜻으로 받는다. */
function normalize(value) {
  if (value === "error" || value === "deny") return "error";
  if (value === "warn") return "warn";
  return "off";
}

customElements.define("lint-category-scale", LintCategoryScale);
