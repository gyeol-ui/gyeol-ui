// file://로 열어도 동작하도록 ES 모듈이 아닌 일반 스크립트로 둔다.

// 폴더와 폴더 안 문서 순서, 태그. 각 문서의 태그, 앞뒤 링크, index.html의 전체 목록을 여기서 만든다.
// 새 문서를 만들면 그 폴더의 documents에 한 줄 추가한다. 태그 이름은 README.md의 태그 목록을 따른다.
// folder가 빈 문자열이면 카테고리 폴더를 정하기 전의 문서로, docs/learning 바로 아래에 있다.
const learnFolders = [
  {
    folder: "",
    title: "분류 전",
    documents: [
      {
        file: "github-actions-concurrency.html",
        title: "GitHub Actions concurrency",
        tags: ["github-actions"],
      },
      {
        file: "squash-merge-and-release-please.html",
        title: "release-please의 다음 버전",
        tags: ["release"],
      },
      {
        file: "oxlint-categories.html",
        title: "oxlint 규칙 범주",
        tags: ["lint"],
      },
      {
        file: "figma-collection-and-mode.html",
        title: "Figma Variables의 collection과 mode",
        tags: ["figma", "design-token"],
      },
      {
        file: "style-dictionary-build.html",
        title: "Style Dictionary로 토큰을 CSS로 빌드하기",
        tags: ["design-token"],
      },
      {
        file: "color-scheme-blocks.html",
        title: "dark 블록이 두 개인 이유",
        tags: ["design-token"],
      },
      {
        file: "tailwind-theme-inline.html",
        title: "Tailwind @theme inline이 하는 일",
        tags: ["tailwind", "design-token"],
      },
    ],
  },
];

// 문서 하나하나에 폴더를 붙여 한 줄로 편다. 앞뒤 링크는 같은 폴더 안에서만 잇는다.
const learnDocuments = learnFolders.flatMap(({ folder, documents }) =>
  documents.map((doc) => ({
    ...doc,
    folder,
    path: folder ? `${folder}/${doc.file}` : doc.file,
  })),
);

// 폴더 안의 문서는 주소의 마지막 두 조각으로, 루트의 문서는 마지막 조각으로 찾는다.
// 루트 문서는 바로 위 조각이 알려진 폴더 이름이 아닐 때만 같은 문서로 본다.
const pathSegments = decodeURIComponent(location.pathname).split("/");
const knownFolders = new Set(
  learnFolders.map(({ folder }) => folder).filter(Boolean),
);
const current = learnDocuments.find((doc) =>
  doc.folder
    ? pathSegments.slice(-2).join("/") === doc.path
    : pathSegments.at(-1) === doc.file &&
      !knownFolders.has(pathSegments.at(-2)),
);
// 문서에서 루트(index.html, 다른 폴더)로 가는 상대 경로의 앞부분
const rootPrefix = current?.folder ? "../" : "";

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// 태그 하나를 전체 목록 페이지의 그 태그 보기로 가는 링크로 만든다.
function tagList(tags, hrefPrefix) {
  const list = element("ul", "tags");
  list.setAttribute("aria-label", "태그");
  for (const tag of tags) {
    const link = element("a", "", tag);
    link.href = `${hrefPrefix}#${tag}`;
    const item = element("li");
    item.append(link);
    list.append(item);
  }
  return list;
}

// 목록에 있는 문서면 제목 아래에 태그를 그린다.
function renderTags() {
  const heading = document.querySelector("main h1");
  if (!current || !heading) return;
  heading.after(tagList(current.tags, `${rootPrefix}index.html`));
}

function navItem(href, label, kind) {
  const item = element("li");
  const link = element("a");
  link.href = href;
  if (kind) link.append(element("span", "doc-nav-kind", kind));
  link.append(label);
  item.append(link);
  return item;
}

// 목록에 있는 문서면 목차 아래에 같은 폴더의 앞뒤 문서와 전체 목록 링크를 그린다.
function renderDocumentNav() {
  const nav = document.querySelector("nav");
  if (!nav || !current) return;

  const folder = learnFolders.find((f) => f.folder === current.folder);
  const index = folder.documents.findIndex((doc) => doc.file === current.file);
  const list = element("ol", "doc-nav");
  const previous = folder.documents[index - 1];
  const next = folder.documents[index + 1];
  if (previous) list.append(navItem(previous.file, previous.title, "이전"));
  if (next) list.append(navItem(next.file, next.title, "다음"));
  list.append(
    navItem(`${rootPrefix}index.html`, `전체 문서 (${learnDocuments.length})`),
  );
  nav.append(element("strong", "", folder.title), list);
}

// index.html의 [data-doc-index]에 태그 필터와 폴더별 목록을 그린다.
// 주소의 #태그로 고른 태그의 문서만 보여 주고, #이 없으면 전체를 보여 준다. 고른 태그의 문서가 없는 폴더는 숨긴다.
function renderDocumentIndex() {
  const container = document.querySelector("[data-doc-index]");
  if (!container) return;

  const allTags = [...new Set(learnDocuments.flatMap((doc) => doc.tags))];
  const filter = element("ul", "tags tag-filter");
  filter.setAttribute("aria-label", "태그로 고르기");
  const filterLinks = [["", `전체 ${learnDocuments.length}`]].concat(
    allTags.map((tag) => [
      tag,
      `${tag} ${learnDocuments.filter((doc) => doc.tags.includes(tag)).length}`,
    ]),
  );
  for (const [tag, label] of filterLinks) {
    const link = element("a", "", label);
    link.href = `#${tag}`;
    link.dataset.tag = tag;
    const item = element("li");
    item.append(link);
    filter.append(item);
  }
  container.append(filter);

  const groups = [];
  for (const { folder, title, documents } of learnFolders) {
    const group = element("section", "doc-group");
    const list = element("ol", "doc-index");
    for (const doc of documents) {
      const item = element("li");
      item.dataset.tags = doc.tags.join(" ");
      const link = element("a", "", doc.title);
      link.href = folder ? `${folder}/${doc.file}` : doc.file;
      item.append(link, tagList(doc.tags, ""));
      list.append(item);
    }
    group.append(element("h2", "", title), list);
    container.append(group);
    groups.push({ group, list });
  }

  function applyFilter() {
    const selected = decodeURIComponent(location.hash.slice(1));
    const tag = allTags.includes(selected) ? selected : "";
    for (const link of filter.querySelectorAll("a")) {
      if (link.dataset.tag === tag) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    }
    for (const { group, list } of groups) {
      for (const item of list.children) {
        item.hidden = tag !== "" && !item.dataset.tags.split(" ").includes(tag);
      }
      group.hidden = [...list.children].every((item) => item.hidden);
    }
  }
  window.addEventListener("hashchange", applyFilter);
  applyFilter();
}

// `language-*` 클래스가 있는 코드 블록만 강조한다. 클래스가 없는 블록은 그대로 둔다.
function highlightCode() {
  document
    .querySelectorAll('pre code[class*="language-"]')
    .forEach((codeElement) => {
      hljs.highlightElement(codeElement);
    });
  document.querySelectorAll("pre code[data-lines]").forEach(markLines);
}

// code의 data-lines="3-8 10"이 가리키는 줄(1부터)에 배경색을 칠한다. 범위는 공백으로 나눈다.
// 구문 강조가 만든 span이 여러 줄에 걸칠 수 있으므로, 줄마다 span을 새로 열고 닫아 줄 단위로 감싼다.
function markLines(codeElement) {
  const marked = new Set();
  for (const range of codeElement.dataset.lines.trim().split(/\s+/)) {
    const [start, end = start] = range.split("-").map(Number);
    for (let line = start; line <= end; line += 1) marked.add(line);
  }
  const lines = [document.createElement("span")];
  const appendText = (text, ancestors) => {
    let parent = lines.at(-1);
    for (const ancestor of ancestors) {
      const copy = ancestor.cloneNode(false);
      parent.append(copy);
      parent = copy;
    }
    parent.append(text);
  };
  const walk = (node, ancestors) => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        child.textContent.split("\n").forEach((part, index) => {
          if (index > 0) lines.push(document.createElement("span"));
          if (part !== "") appendText(part, ancestors);
        });
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child, [...ancestors, child]);
      }
    }
  };
  walk(codeElement, []);
  if (lines.length > 1 && lines.at(-1).textContent === "") lines.pop();
  // 줄바꿈은 줄 span 밖에 두어, 칠한 줄의 상자가 다음 줄까지 늘어나지 않게 한다.
  codeElement.replaceChildren(
    ...lines.flatMap((line, index) => {
      line.className = marked.has(index + 1) ? "code-line marked" : "code-line";
      return index === lines.length - 1 ? [line] : [line, "\n"];
    }),
  );
}

// .erd(테이블 관계도)의 외래 키 선을 그린다. 상자 배치는 CSS grid가 하고, 이 함수는 상자를 읽어 선만 얹는다.
// 칸(li)의 data-ref="테이블.칸"이 외래 키, data-ref-composite가 복합 외래 키의 한 칸이다. 여러 개면 공백으로 나눈다.
// 칸의 data-key="PK FK"는 칸 이름 앞의 배지가 된다.
const SVG_NS = "http://www.w3.org/2000/svg";

function svgElement(tag, attributes) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes))
    node.setAttribute(name, value);
  return node;
}

function erdColumnName(item) {
  return item.dataset.col ?? item.firstChild.textContent.trim();
}

// .erd의 선 하나가 칸(li)이나 상자에 닿는지. 칸이면 그 칸, 상자면 그 상자에서 나가거나 들어오는 선이다.
function erdTouches(link, target) {
  return target.matches("li")
    ? link.fromItem === target || link.toItem === target
    : link.from === target || link.to === target;
}

// 두 선이 같은 제약인지. 복합 외래 키는 칸 하나에 올려도 같은 제약의 선을 모두 강조한다.
function erdSameConstraint(a, b) {
  return (
    a === b ||
    (a.composite && b.composite && a.from === b.from && a.to === b.to)
  );
}

function setUpErd(erd) {
  const canvas = element("div", "erd-canvas");
  canvas.append(...erd.children);
  erd.append(canvas);

  const columns = new Map(); // '테이블.칸' → li
  const tables = [...canvas.querySelectorAll(".erd-table")];
  for (const table of tables) {
    table.tabIndex = 0;
    for (const item of table.querySelectorAll("li")) {
      const name = erdColumnName(item);
      columns.set(`${table.dataset.table}.${name}`, item);
      const keys = (item.dataset.key ?? "").split(" ").filter(Boolean);
      if (keys.length > 0) {
        const badges = element("span", "erd-keys");
        for (const key of keys)
          badges.append(element("span", `erd-key ${key.toLowerCase()}`, key));
        item.prepend(badges);
      }
    }
  }

  const links = [];
  for (const table of tables) {
    for (const item of table.querySelectorAll("li")) {
      for (const [attribute, composite] of [
        ["ref", false],
        ["refComposite", true],
      ]) {
        for (const target of (item.dataset[attribute] ?? "")
          .split(" ")
          .filter(Boolean)) {
          const targetItem = columns.get(target);
          if (!targetItem) {
            console.warn(
              `erd: ${table.dataset.table}.${erdColumnName(item)}의 대상 ${target}이 없다`,
            );
            continue;
          }
          const note = element(
            "span",
            composite ? "erd-ref composite" : "erd-ref",
            `→ ${target}`,
          );
          item.append(note);
          links.push({
            from: table,
            fromItem: item,
            to: targetItem.closest(".erd-table"),
            toItem: targetItem,
            composite,
          });
        }
      }
    }
  }

  const svg = svgElement("svg", { class: "erd-lines", "aria-hidden": "true" });
  // CSS가 늦게 오거나 빠져도 SVG가 흐름에 끼어 캔버스를 키우고, 그 크기로 다시 그리는 고리가 생기지 않게 위치를 직접 정한다.
  svg.style.cssText =
    "position: absolute; inset: 0; overflow: visible; pointer-events: none";
  canvas.prepend(svg);

  function draw() {
    svg.replaceChildren();
    const base = canvas.getBoundingClientRect();
    svg.setAttribute("width", base.width);
    svg.setAttribute("height", base.height);
    const box = (node) => {
      const rect = node.getBoundingClientRect();
      return {
        left: rect.left - base.left,
        right: rect.right - base.left,
        mid: rect.top - base.top + rect.height / 2,
      };
    };
    // 같은 열 안의 선은 상자 왼쪽 바깥으로 돌린다. 겹치지 않게 선마다 조금씩 더 바깥으로 민다.
    const sameColumnCount = new Map();
    for (const link of links) {
      const fromBox = box(link.from);
      const toBox = box(link.to);
      const y1 = box(link.fromItem).mid;
      const y2 = box(link.toItem).mid;
      let x1, x2, s1, s2, d;
      if (toBox.left >= fromBox.right - 1) {
        [x1, s1, x2, s2] = [fromBox.right, 1, toBox.left, -1];
      } else if (toBox.right <= fromBox.left + 1) {
        [x1, s1, x2, s2] = [fromBox.left, -1, toBox.right, 1];
      } else {
        [x1, s1, x2, s2] = [fromBox.left, -1, toBox.left, -1];
      }
      // 선은 상자에서 수평으로 STUB만큼 곧게 나온 뒤 휜다. 끝 표시가 그 곧은 구간에 놓여 선과 어긋나지 않는다.
      const STUB = 20;
      const a1 = x1 + s1 * STUB;
      const a2 = x2 + s2 * STUB;
      let curve;
      if (s1 === s2) {
        const key = Math.round(Math.min(x1, x2));
        const order = sameColumnCount.get(key) ?? 0;
        sameColumnCount.set(key, order + 1);
        const bend = Math.min(a1, a2) - 10 - order * 8;
        curve = `C${bend} ${y1} ${bend} ${y2} ${a2} ${y2}`;
      } else {
        const dx = Math.max(16, Math.abs(a2 - a1) / 2);
        curve = `C${a1 + s1 * dx} ${y1} ${a2 + s2 * dx} ${y2} ${a2} ${y2}`;
      }
      d = `M${x1} ${y1} L${a1} ${y1} ${curve} L${x2} ${y2}`;
      const group = svgElement("g", {
        class: link.composite ? "erd-link composite" : "erd-link",
      });
      group.append(svgElement("path", { d }));
      // 외래 키 쪽(N, 여러 개)은 세 갈래 까마귀 발, 가리키는 쪽(1, 하나)은 세로 막대다.
      const foot = x1 + s1 * 12;
      group.append(
        svgElement("path", {
          class: "erd-mark-line",
          d: `M${foot} ${y1} L${x1} ${y1 - 6} M${foot} ${y1} L${x1} ${y1} M${foot} ${y1} L${x1} ${y1 + 6}`,
        }),
      );
      const bar = x2 + s2 * 9;
      group.append(
        svgElement("path", {
          class: "erd-mark-line",
          d: `M${bar} ${y2 - 6} L${bar} ${y2 + 6}`,
        }),
      );
      const many = svgElement("text", {
        class: "erd-card",
        x: x1 + s1 * 16,
        y: y1 - 5,
        "text-anchor": s1 > 0 ? "start" : "end",
      });
      many.textContent = "N";
      const one = svgElement("text", {
        class: "erd-card",
        x: x2 + s2 * 13,
        y: y2 - 5,
        "text-anchor": s2 > 0 ? "start" : "end",
      });
      one.textContent = "1";
      group.append(many, one);
      link.group = group;
      svg.append(group);
    }
  }

  // 상자나 칸에 마우스를 올리거나 상자에 포커스가 가면, 그것과 이어진 선과 칸만 강조한다.
  function focus(target) {
    canvas.classList.toggle("is-focused", target !== null);
    for (const item of canvas.querySelectorAll("li.is-active"))
      item.classList.remove("is-active");
    for (const table of tables) table.classList.remove("is-related");
    for (const link of links) {
      const active =
        target !== null &&
        links.some(
          (hit) => erdTouches(hit, target) && erdSameConstraint(hit, link),
        );
      link.group.classList.toggle("is-active", active);
      if (!active) continue;
      svg.append(link.group); // 강조한 선을 다른 선 위에 그린다
      link.fromItem.classList.add("is-active");
      link.toItem.classList.add("is-active");
      link.from.classList.add("is-related");
      link.to.classList.add("is-related");
    }
  }
  for (const table of tables) {
    table.addEventListener("mouseenter", () => focus(table));
    table.addEventListener("focus", () => focus(table));
    table.addEventListener("mouseleave", () => focus(null));
    table.addEventListener("blur", () => focus(null));
    for (const item of table.querySelectorAll("li")) {
      item.addEventListener("mouseenter", () => focus(item));
      item.addEventListener("mouseleave", () => focus(table));
    }
  }

  draw();
  new ResizeObserver(draw).observe(canvas);
  // 웹 글꼴이 늦게 오면 상자 크기가 바뀌므로 한 번 더 그린다. 실패해도 이미 그린 선이 남는다.
  void document.fonts?.ready.then(draw);
}

function renderErds() {
  document.querySelectorAll(".erd").forEach(setUpErd);
}

// .seq(순서도)의 열 수, 생명선, 메시지의 열 범위와 번호를 정한다.
// 메시지는 data-from과 data-to(참여자 번호, 1부터), 한 참여자 안의 일은 data-at="2"나 data-at="2-3"이다.
function setUpSequence(seq) {
  const actors = seq.querySelectorAll(".seq-actors > li");
  const steps = seq.querySelector(".seq-steps");
  if (!steps) return;
  seq.style.setProperty("--seq-cols", actors.length);
  actors.forEach((_, index) => {
    const line = element("span", "seq-lifeline");
    line.style.setProperty("--i", index);
    line.setAttribute("aria-hidden", "true");
    steps.prepend(line);
  });
  let number = 0;
  for (const step of steps.querySelectorAll(":scope > li")) {
    const { from, to, at } = step.dataset;
    if (from && to) {
      const [a, b] = [Number(from), Number(to)];
      step.classList.add("seq-msg");
      if (b < a) step.classList.add("to-left");
      step.style.gridColumn = `${Math.min(a, b)} / ${Math.max(a, b) + 1}`;
      step.style.setProperty("--span", Math.abs(b - a) + 1);
    } else if (at) {
      const [start, end = start] = at.split("-").map(Number);
      step.classList.add("seq-self");
      step.style.gridColumn = `${start} / ${end + 1}`;
    } else {
      continue;
    }
    number += 1;
    step.prepend(element("span", "seq-num", String(number)));
  }
}

function renderSequences() {
  document.querySelectorAll(".seq").forEach(setUpSequence);
}

const overlaps = (a, b) => a.left < b.right && b.left < a.right;

// 요소 안 글자만 차지하는 상자. 요소 자체는 선 길이만큼 넓을 수 있다.
function textBox(node) {
  const range = document.createRange();
  range.selectNodeContents(node);
  return range.getBoundingClientRect();
}

// .timeline(시간 막대)의 마지막에 눈금 줄을 더한다. 축의 끝은 --tl-max, 단위는 data-unit, 간격은 data-tick이다.
function setUpTimeline(timeline) {
  const max = Number(getComputedStyle(timeline).getPropertyValue("--tl-max"));
  const tick = Number(timeline.dataset.tick ?? 1);
  const unit = timeline.dataset.unit ?? "";
  timeline.style.setProperty("--tl-tick", tick);
  const row = element("div", "tl-row tl-axis");
  row.setAttribute("aria-hidden", "true");
  const axisTrack = element("div", "tl-track");
  for (let at = 0; at <= max + 1e-9; at += tick) {
    const label = element("span", "tl-tick", `${Number(at.toFixed(2))}${unit}`);
    label.style.setProperty("--at", at);
    axisTrack.append(label);
  }
  row.append(element("span", "tl-label"), axisTrack);
  timeline.append(row);

  // 막대가 좁아 글이 잘리면 글을 막대 오른쪽 바깥으로 뺀다. 그 자리에 다른 막대가 있으면 글을 숨기고 마우스를 올릴 때만 보인다.
  for (const bar of timeline.querySelectorAll(".tl-bar")) {
    if (bar.scrollWidth <= bar.clientWidth + 1) continue;
    bar.classList.add("label-outside");
    bar.title = bar.textContent;
    const label = element("span", "tl-bar-label", bar.textContent);
    label.style.setProperty("--at", bar.style.getPropertyValue("--to"));
    bar.after(label);
    const box = label.getBoundingClientRect();
    const blocked = [...bar.parentElement.querySelectorAll(".tl-bar")].some(
      (other) => other !== bar && overlaps(box, other.getBoundingClientRect()),
    );
    if (blocked || box.right > timeline.getBoundingClientRect().right)
      label.remove();
  }
  // 사건 글을 span으로 감싸 다른 사건의 선보다 위에 그린다.
  for (const event of timeline.querySelectorAll(".tl-event")) {
    const label = element("span", "tl-event-label");
    label.append(...event.childNodes);
    event.append(label);
  }
  // 같은 줄의 사건 글이 앞 사건 글과 겹치면 한 줄 아래로 내린다.
  for (const track of timeline.querySelectorAll(".tl-track")) {
    const placed = [];
    for (const event of track.querySelectorAll(".tl-event")) {
      const box = textBox(event);
      if (
        placed.some(
          (other) => box.left < other.right + 4 && other.left < box.right + 4,
        )
      ) {
        event.classList.add("lower");
        track.classList.add("stacked");
      } else {
        placed.push(box);
      }
    }
  }
}

function renderTimelines() {
  document.querySelectorAll(".timeline").forEach(setUpTimeline);
}

// 0~(data-total - 1)의 값을 data-labels의 글자 수로 접어, 한 바퀴를 한 줄로 그린다.
// 마지막 줄의 남는 칸은 data-rest가 extra면 앞쪽 글자에 한 번 더 붙는 칸, reject면 버리는 칸으로 칠한다.
function setUpModGrid(modgrid) {
  const labels = [...modgrid.dataset.labels];
  const total = Number(modgrid.dataset.total);
  const rest = modgrid.dataset.rest;
  const cols = labels.length;
  const usable = rest === "reject" ? total - (total % cols) : total;
  const grid = element("div", "modgrid-grid");
  grid.style.setProperty("--modgrid-cols", cols);
  grid.setAttribute("aria-hidden", "true");

  grid.append(element("span", "modgrid-row-label", "글자"));
  for (const label of labels)
    grid.append(element("span", "modgrid-head", label));
  for (let start = 0; start < total; start += cols) {
    const end = Math.min(start + cols, total) - 1;
    const isRest = end - start + 1 < cols;
    grid.append(element("span", "modgrid-row-label", `${start}~${end}`));
    for (let value = start; value <= end; value += 1) {
      const cell = element(
        "span",
        isRest ? `modgrid-cell ${rest}` : "modgrid-cell",
      );
      cell.title =
        value < usable
          ? `${value} → ${labels[value % cols]}`
          : `${value} → 버림`;
      grid.append(cell);
    }
    if (isRest) {
      const note = element(
        "span",
        `modgrid-rest-note ${rest}`,
        modgrid.dataset.restNote ?? "",
      );
      note.style.gridColumn = `span ${cols - (end - start + 1)}`;
      grid.append(note);
    }
  }

  grid.append(element("span", "modgrid-row-label", "대응 수"));
  const counts = labels.map((_, column) => {
    let count = 0;
    for (let value = column; value < usable; value += cols) count += 1;
    return count;
  });
  const fewest = Math.min(...counts);
  for (const count of counts) {
    grid.append(
      element(
        "span",
        count > fewest ? "modgrid-count more" : "modgrid-count",
        String(count),
      ),
    );
  }
  modgrid.prepend(grid);
}

function renderModGrids() {
  document.querySelectorAll(".modgrid").forEach(setUpModGrid);
}

renderTags();
renderDocumentNav();
renderDocumentIndex();
highlightCode();
renderErds();
renderSequences();
renderTimelines();
renderModGrids();
