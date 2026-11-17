# 학습 노트

슬라이스를 진행하며 배운 개념을 브라우저에서 읽는 HTML 노트로 정리한다. 무엇을 적을지, 어느 카테고리에 넣을지는 [워크플로우](../workflow.md) "7. 학습 노트"를 따른다.

## 보는 방법

```sh
pnpm learning
```

`http://localhost:4321/`에서 전체 목록이 열린다. 노트는 빌드 없는 정적 파일이라 `index.html`을 브라우저로 바로 열어도 된다.

## 폴더

노트는 카테고리 폴더(`docs/learning/<카테고리>/`)에 둔다. 카테고리와 파일 이름은 사람이 정한다. 카테고리를 정하기 전의 노트는 이 폴더 바로 아래에 두고, `learn.js`의 `learnFolders`에서 `folder: ''` 묶음에 적는다.

공통 파일(`learn.css`, `learn.js`, `vendor/`, `index.html`, `template.html`)은 이 폴더 바로 아래에 둔다. 카테고리 폴더를 새로 만들면 `learn.js`의 `learnFolders`에 먼저 추가한다.

## 새 노트 만들기

1. `template.html`을 카테고리 폴더에 복사한다. 카테고리를 정하기 전이면 이 폴더 바로 아래에 복사하고, 공통 파일 경로 앞의 `../`를 지운다.
2. 제목, 목차, 본문을 바꾸고 쓰지 않는 예시를 지운다.
3. `learn.js`의 `learnFolders`에서 그 폴더의 `documents`에 파일 이름, 목록에 보일 이름, 태그를 한 줄 추가한다. 제목 아래 태그, 같은 폴더 앞뒤 노트의 이전/다음 링크, 전체 목록 `index.html`에 나타난다.

노트마다 개념 설명, 이 저장소에서 그 개념이 쓰인 코드 위치, 참고한 자료의 출처를 적는다. 모듈이 보여 주는 동작과 수치는 출처나 직접 실행으로 확인한 것만 쓴다.

스타일과 스크립트는 노트에 직접 넣지 않고 템플릿이 불러오는 공통 파일을 쓴다. 테마나 모듈을 바꾸면 모든 노트에 적용되니, 기존 노트가 깨지지 않는지 확인한다.

## 태그

카테고리가 주제를 크게 나누고, 태그는 카테고리를 넘나드는 주제로 노트를 거를 때 쓴다. 태그는 HTML에 쓰지 않고 `learn.js`의 `learnFolders`에 적으며, 아래 목록의 이름을 글자 그대로 쓴다. 맞는 태그가 없으면 소문자 영어로 된 새 이름을 이 목록에 먼저 추가한다.

| 태그 | 대상 |
|---|---|
| `github-actions` | GitHub Actions 워크플로의 문법과 동작 |
| `git` | git과 GitHub의 브랜치, merge, 저장소 설정 |
| `release` | 버전, CHANGELOG, 배포 자동화 |
| `lint` | lint와 형식 검사 도구의 설정과 동작 |

## 모듈

사용 예시는 `template.html`에 있다.

모듈이 표현하려는 내용에 맞지 않으면 내용을 줄이거나 문서 안에서 스타일로 피해 가지 않는다. 기존 모듈을 고쳐 그 경우를 지원하거나 새 모듈을 만든다. 예를 들어 트리가 깊이 제한에 걸리면 단계를 합치지 않고 트리 모듈이 더 깊은 단계를 지원하게 고친다. 모듈을 고치거나 추가하면 `learn.css`, 아래 표, `template.html` 예시를 함께 바꾼다.

버튼이나 입력으로 값을 바꿔 보게 하는 인터랙션은 만들지 않는다. 설정값이나 입력에 따라 결과가 달라지는 개념은 경우의 수를 모두 펼쳐서, 같은 상황을 경우마다 나란히 그린다(시간 막대 여러 개, 경우마다 한 줄인 표, 비교 카드). 읽는 사람이 눌러 보지 않아도 모든 경우를 한 번에 견줄 수 있게 하려는 것이다.

| 모듈 | 클래스 | 용도 |
|---|---|---|
| 문서 틀 | `layout`, `lead` | 목차와 본문 배치, 제목 아래 요약 |
| 소제목 | `h3`, `h4` | 절 안을 나눌 때 `h3`, `h3` 안을 다시 나눌 때 `h4` |
| 문서 탐색 | `doc-nav`, `doc-nav-kind` | 목차 아래의 같은 폴더 이전/다음 문서와 전체 목록 링크. `learn.js`가 그리므로 문서에 직접 쓰지 않는다 |
| 전체 목록 | `layout single`, `doc-group`, `doc-index` | `index.html`의 한 열 배치와 폴더별로 묶은, 태그로 거를 수 있는 전체 문서 목록. 목록은 `learn.js`가 채운다 |
| 태그 | `tags`, `tag-filter` | 문서 주제 표시와 `index.html`의 태그 필터. `learn.js`가 그린다 |
| 흐름도 | `flow`, `lane`, `lane-title`, `chain` | 전체 흐름을 한눈에 보여 주기 |
| 단계 | `steps` | 번호를 매긴 순서 설명. 항목의 첫 `strong`이 단계 제목이 되고, 본문 안의 `strong`은 문장 속 강조로 남는다 |
| 트리 | `tree`, `tree-row`, `tree-node`, `tree-note` | 연결선이 있는 계층 구조와 오른쪽 설명. 설명 열은 깊이와 상관없이 맞춰진다. 이름이 길면 `style="--tree-col: 17rem"`처럼 이름 열을 넓힌다 |
| 순서도 | `seq`, `seq-actors`, `seq-steps`, `seq-note`, `reply`, `stop` | 참여자(브라우저, API, DB) 사이에 요청과 응답이 오가는 순서. 아래 "순서도" 참고 |
| 시간 막대 | `timeline`, `tl-row`, `tl-label`, `tl-track`, `tl-bar`, `tl-event` | 만료와 연장처럼 시간축 위에서 일어나는 일. 아래 "시간 막대" 참고 |
| 요청 장면 | `scenes`, `scene`, `scene-url`, `scene-req`, `scene-server`, `scene-chips` | 사용자가 보고 있는 페이지에서 어떤 요청이 어디로 가고, 브라우저가 어떻게 판정하는지. SameSite, CORS처럼 "어디서 보낸 요청인가"가 갈림길인 규칙. 아래 "요청 장면" 참고 |
| 변환 줄 | `pipe`, `pipe-row`, `pipe-val`, `pipe-fn`, `pipe-label`, `pipe-note` | 값이 함수(해시, 암호화, 서명)를 지나 어떻게 바뀌는지. 아래 "변환 줄" 참고 |
| 해부도 | `anatomy`, `part`, `anatomy-caption` | URL, 쿠키 값, 토큰처럼 한 값을 부분으로 나눠 이름 달기. 아래 "해부도" 참고 |
| 비교 카드 | `compare`, `compare-card`, `compare-title`, `compare-facts`, `compare-result` | 같은 항목을 가진 선택지 두세 개(정책, 설정값)를 나란히 놓고 견주기. 아래 "비교 카드" 참고 |
| 유출 표 | `table.breach`, `has`, `lacks`, `pass`, `fail`, `bad`, `safe`, `group-start` | 상황마다 공격자가 가진 것, 그것으로 통과할 수 있는 확인, 결과를 한 줄로 비교하기(서명과 해시가 각각 무엇을 막는지). 아래 "유출 표" 참고 |
| 나머지 격자 | `modgrid`, `modgrid-caption` | 값의 범위를 나머지(`%`)로 접었을 때 결과마다 몇 번 대응하는지(모듈로 편향, 거부 샘플링). 아래 "나머지 격자" 참고 |
| 관문 | `gates`, `gate-check`, `gate-fail`, `pass` | 차례로 확인하다 하나라도 걸리면 옆으로 빠지는 흐름(가드, 검증). 아래 "관문" 참고 |
| 테이블 관계도 | `erd`, `erd-table`, `erd-title`, `erd-constraints`, `erd-mark`, `erd-note` | 테이블을 칸 목록 상자로 그리고 외래 키를 선으로 잇는 ERD. 아래 "테이블 관계도" 참고 |
| 표 | `table-wrap` | 좁은 화면에서 가로로 스크롤되는 표. 칸 안의 `small`은 다음 줄에 흐리게 보이는 보충 설명이다 |
| 배지 | `badge`, `blue`, `green`, `warn`, `muted` | 표나 문장 안의 짧은 분류. `muted`는 해당 없음, 결과 없음 |
| 강조 상자 | `callout`, `callout warn` | 핵심 정의, 주의할 점 |
| 접는 본문 | `details.fold`, `fold-body` | 코드나 표가 든 선택 읽기 내용 |
| 문제 | `quiz`, `quiz-q`, `quiz-context`, `quiz-answer` | 맥락(관련 절, 바꾸는 코드, 데이터)이 필요한 자가 점검 문제. 질문과 맥락은 펼쳐 두고 답만 접는다 |

`lane`, `steps`, `badge`에는 색을 정하는 클래스를 함께 붙인다. `blue`와 `green`이 있다.

코드 블록에 `<pre><code class="language-ts">`처럼 언어를 지정하면 highlight.js가 구문을 강조한다. 오류 메시지처럼 코드가 아닌 블록에는 붙이지 않는다. 코드 블록의 긴 줄은 가로 스크롤 없이 줄바꿈되므로, 읽기 좋게 하려고 일부러 짧게 자르지 않아도 된다.

쿼리를 한 단계씩 쌓아 설명할 때처럼 블록 안에서 지금 보는 줄을 표시하려면 `<code class="language-ts" data-lines="2-8 10">`처럼 줄 번호(1부터)를 적는다. 범위는 `-`로, 여러 범위는 공백으로 나눈다. 그 줄에 파란 배경과 왼쪽 선이 칠해진다.

테이블 관계도(`erd`)는 상자 배치만 HTML로 정하고 선은 `learn.js`가 그린다.

- `.erd`에 `style="--erd-cols: 3"`으로 열 수를 정하고, 상자(`.erd-table`)마다 `style="grid-area: 행 / 열"`로 자리를 정한다. 여러 행에 걸치려면 `grid-area: 2 / 3 / 4 / 4`처럼 쓴다.
- 상자에 `data-table="테이블 이름"`을 단다. 칸(`li`)의 첫 글자가 칸 이름이다.
- 칸의 `data-key="PK FK"`는 칸 이름 앞의 배지가 된다.
- 외래 키는 칸에 `data-ref="테이블.칸"`, 복합 외래 키의 칸은 `data-ref-composite="테이블.칸"`을 단다. 하나의 칸이 여러 곳을 가리키면 공백으로 나눈다. 외래 키 쪽에는 까마귀 발과 `N`, 가리키는 쪽에는 막대와 `1`이 그려진다. 복합 외래 키는 초록 점선이다.
- 여러 칸에 걸친 제약(`PRIMARY KEY (a, b)`, `UNIQUE (a, b)`)은 상자 안 `p.erd-constraints`에 적는다. 강조할 칸이나 제약에는 `erd-mark`를 붙인다.
- 관계도 바로 아래의 `p.erd-note`에 선과 표시를 읽는 법을 적는다.
- 상자가 본문 폭(760px)을 넘으면 가로로 스크롤된다. 넘지 않게 열 수와 배치를 고른다.

순서도(`seq`)는 참여자와 순서만 HTML로 적고 열 배치, 화살표, 번호, 생명선은 `learn.js`가 그린다.

- `ol.seq-actors`에 참여자를 왼쪽부터 `li`로 적는다. 참여자 번호는 1부터다.
- `ol.seq-steps`에 순서대로 `li`를 적는다. 참여자 사이의 메시지는 `data-from="1" data-to="2"`, 한 참여자 안에서 일어나는 일은 `data-at="2"`(여러 열에 걸치면 `data-at="2-3"`)이다. 둘 다 번호가 자동으로 붙는다.
- 응답은 `reply`(초록 점선), 실패나 거절은 `stop`(빨강)을 붙인다. 보충 설명은 안에 `small`로 쓴다.
- 구간 이름이나 순서 사이의 설명은 `li.seq-note`로 쓴다. 전체 폭에 걸치고 번호가 붙지 않는다.
- 참여자는 3~4개로 둔다. 한 열이 8.5rem보다 좁아지면 가로로 스크롤된다.

시간 막대(`timeline`)는 축의 끝을 `style="--tl-max: 9"`, 단위를 `data-unit="일"`, 눈금 간격을 `data-tick`(기본 1)으로 정한다. 눈금 줄은 `learn.js`가 마지막에 더한다.

- 줄마다 `div.tl-row` 안에 `span.tl-label`(줄 이름)과 `div.tl-track`을 둔다. 이름이 길면 `.timeline`에 `style="--tl-label: 9rem"`을 준다.
- 기간은 `span.tl-bar`에 `style="--from: 0; --to: 7"`, 한 시점의 사건은 `span.tl-event`에 `style="--at: 1.5"`를 준다. 축 끝 가까이의 사건은 `end`를 붙여 글을 선 왼쪽에 둔다. 다른 사건의 선이 글을 지나가도 글이 선보다 위에 보인다.
- 막대 색은 `blue`, `green`, 대체되거나 지나간 기간은 `faded`(점선)를 붙인다.
- 여러 줄을 한 묶음(예: 같은 정책)으로 보이려면 `tl-label`에 막대와 같은 색 `blue`, `green`을 붙인다. 다른 묶음이 시작하는 `tl-row`에는 `tl-split`을 붙여 위에 선을 긋는다.

요청 장면(`scene`)은 `div.scenes` 안에 장면마다 `div.scene`을 둔다. 그리는 일은 CSS만 하므로 `learn.js`가 필요 없다.

- 장면 안에 차례로 `scene-title`(장면 이름), `scene-browser`(안에 `scene-url` 주소창과 `scene-page` 페이지에서 일어나는 일), `scene-req`(화살표 위 요청), `scene-server`(받는 곳, 보충 설명은 `small`)를 둔다.
- 주소와 받는 곳에서 비교할 부분은 `b`로 칠한다. 기본은 파랑이다.
- 장면 테두리와 판정 색은 기본이 초록(허용되는 경우)이고, `cross`는 주황(다른 곳에서 왔지만 정상), `danger`는 빨강(막아야 할 경우)이다. `cross`와 `danger`에서는 주소창의 `b`가 주황으로 바뀐다.
- 아래 줄 `scene-foot`에 `scene-verdict`(판정 문장, 결론은 `strong`)와 `ul.scene-chips`(설정값마다의 결과, `li.yes`는 ✓, `li.no`는 ✕)를 둔다. ✓/✕가 무엇을 뜻하는지 `data-legend="쿠키가 실리나"`처럼 질문으로 적으면 표시 줄 맨 앞에 보인다. 표시 이름만으로 뜻이 분명하면(`서버에 닿음`, `응답 읽음`) 생략한다. 색과 ✓/✕를 읽는 법을 본문에서 다시 설명하지 않는다. 그림만으로 읽히지 않으면 `data-legend`나 표시 이름을 고친다.
- 640px보다 좁으면 세로로 쌓인다.

변환 줄(`pipe`)은 줄마다 `div.pipe-row`를 두고 값(`span.pipe-val`)과 함수(`span.pipe-fn`)를 번갈아 적는다. 함수 양옆의 화살표는 CSS가 그린다.

- 줄 이름은 줄 맨 앞의 `span.pipe-label`, 줄 끝의 보충 설명은 `span.pipe-note`, 값 아래 설명은 값 안의 `small`이다.
- 값 색은 비밀인 값 `secret`(주황), 통과 `ok`(초록), 거절 `bad`(빨강)이다.
- 함수 색은 기본 파랑, `green`이 있고, 할 수 없는 변환(해시를 거꾸로 돌리기)은 `blocked`(빨간 취소선과 ✕)다.

해부도(`anatomy`)는 값을 `span.part`로 나눠 이어 적고, 부분마다 `data-label`에 이름을 단다. 이름은 부분 아래에 그려진다. 색은 `blue`, `green`, `warn`, 덜 중요한 부분은 `dim`이다. 맨 끝의 `span.anatomy-caption`에 읽는 법을 적는다.

비교 카드(`compare`)는 선택지마다 `div.compare-card`를 하나씩 둔다. 카드는 본문 폭에 맞춰 나란히 놓이고, 좁으면 아래로 쌓인다.

- 카드 맨 위 `div.compare-title`에 선택지 이름을, 그 안 `small`에 코드 이름을 적는다. 카드 색은 `blue`, `green`이다.
- `dl.compare-facts`에 항목을 `dt`(항목 이름, 코드 이름은 `code`)와 `dd`(값과 짧은 설명, 핵심 값은 `strong`)로 적는다. 카드끼리 항목 순서를 맞춘다.
- 맨 아래 `p.compare-result`에 그 선택지를 고르면 사용자에게 무슨 일이 생기는지 한 문장으로 적는다. 카드 높이가 달라도 결과는 바닥에 맞춰진다.

유출 표(`table.breach`)는 `table-wrap` 안의 표에 `breach`를 붙인다.

- 열은 세 묶음이다. 공격자가 가질 수 있는 것(값마다 한 열, 머리글의 `small`에 그 값이 있는 곳), 공격에 필요한 확인(확인마다 한 열, 머리글의 `small`에 통과에 필요한 것), 결과다. 묶음 이름은 첫 머리글 줄에 `colspan`으로 적고, 묶음의 첫 열에는 `group-start`를 붙여 굵은 선으로 나눈다.
- 가진 것 칸은 `has`(● 주황, 가졌다)와 `lacks`(○ 회색, 없다), 확인 칸은 `pass`(✓ 빨강, 공격자가 통과한다)와 `fail`(✕ 초록, 막힌다), 결과 칸은 `bad`(빨강, 뚫린다)와 `safe`(초록, 막힌다)이고, 막는 장치나 이유는 결과 칸 안의 `small`에 적는다. 기호는 CSS가 그리므로 칸에는 `가짐`, `막힘`처럼 짧은 글만 쓴다.
- 줄 이름 칸의 `small`에 상황의 예(백업 유출 등)를 적는다.

나머지 격자(`modgrid`)는 데이터 속성만 적고 칸은 `learn.js`가 그린다.

- `data-total`은 값의 개수(0부터), `data-labels`는 나머지마다 대응하는 글자를 이어 쓴 문자열이다. 글자 수가 나누는 수가 된다. 예: `data-total="256" data-labels="ABC…789"`(62글자)면 0~255를 62로 접는다.
- 한 바퀴가 한 줄이다. 줄 이름은 값의 범위(`0~61`), 맨 위 줄은 글자, 맨 아래 줄은 글자마다 대응하는 값의 수다. 다른 글자보다 많이 대응하는 수는 주황으로 칠한다.
- 마지막 줄의 남는 칸은 `data-rest`로 칠한다. `extra`는 앞쪽 글자에 한 번 더 붙는 칸(주황), `reject`는 버리는 칸(빨간 점선)이고 대응 수에서 뺀다. 남는 칸 옆에 보일 설명은 `data-rest-note`에 적는다.
- 안의 `p.modgrid-caption`에 읽는 법을 적는다. 칸에 마우스를 올리면 값과 대응하는 글자가 보인다.

관문(`gates`)은 `ol.gates` 안에 확인 하나마다 `li`를 둔다. `li` 안에 `div.gate-check`(확인할 내용, 예시 값은 `small`)와 `div.gate-fail`(걸렸을 때 일어나는 일, 결과는 `strong`)을 둔다. 번호와 "↓ 통과" 화살표는 CSS가 그린다. 마지막 통과 단계는 `li.pass`로 두고 `gate-fail`을 생략한다.

자가 점검 문제는 `quiz`로 쓴다. `quiz-q`에 질문을, `quiz-context`에 어느 절의 무엇을 묻는지를 적고, 바꾸는 코드는 `language-diff` 코드 블록으로, 필요한 데이터는 표로 질문 아래에 둔다. 답만 `<details class="quiz-answer">` 안의 `fold-body`에 접는다. 질문 한 줄만으로 무엇을 묻는지 분명할 때만 클래스 없는 `<details>`를 쓴다. 그 밖에 문단만 접어 둘 때도 클래스 없이 `<details>`를 쓴다. 코드나 표가 든 선택 읽기 내용을 접을 때는 `<details class="fold">` 안에 `<div class="fold-body">`를 두고, 접어도 흐름이 이어지도록 결론은 접기 밖에 적는다.

## 외부 라이브러리

`vendor/highlightjs/`는 npm 패키지 `@highlightjs/cdn-assets` 11.12.0의 `highlight.min.js`와 `LICENSE`를 그대로 복사한 것이다. 빌드 없이 열기 위해 저장소에 포함하고, Prettier와 oxlint 검사에서 뺀다. 파일을 직접 고치지 말고, 올릴 때는 패키지의 파일로 교체한다.
