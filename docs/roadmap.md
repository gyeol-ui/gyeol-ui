# gyeol-ui 로드맵

## 목표

디자인 시스템 엔지니어로 성장하는 것이 목표다. 시중 디자인 시스템 규모(약 40개 컴포넌트)의 오픈소스를 직접 만들면서 배운다. 기간은 정해 두지 않고, Figma 연동을 가장 깊게 다룬다.

- 패키지 스코프는 `@gyeol-ui/*`, 라이선스는 MIT다.
- 문서는 한국어로 쓴다. 영어 병행은 나중에 검토한다.
- 용어는 [GLOSSARY.md](../GLOSSARY.md)를, 주요 결정은 [docs/adr/](./adr/)를 따른다.

## 기본 결정

### 구조

```
packages/
  tokens/          # DTCG JSON + Style Dictionary 빌드 → CSS 변수, TS 상수
  tailwind/        # Tailwind v4 @theme CSS
  react/           # 컴포넌트 + 빌드된 CSS (스토리, 테스트는 컴포넌트 옆에 둔다)
  figma-plugin/    # Variables 내보내기와 동기화
  eslint-plugin/   # (나중에) 사용 규칙과 deprecation 경고
apps/
  storybook/       # Storybook 설정과 앱. 모든 패키지의 *.stories.tsx를 모은다
  docs/            # (나중에) 문서 사이트
  example/         # 가상 서비스 예제 앱 (웹뷰 안의 예약 플로우 등)
tools/
  adoption/        # (나중에) 도입률 측정 CLI
```

- 모노레포는 pnpm과 Turborepo로 구성한다.
- `react` 빌드에서는 `*.stories.tsx`를 제외한다.

### 스타일과 테마

- 컴포넌트 내부는 Tailwind v4로 작성한다. 배포할 때는 빌드된 CSS를 함께 내보내고, 테마는 CSS 변수로 바꾼다. Tailwind 사용자를 위해 `@theme` CSS도 제공한다.
- Theme 1개 × Color Scheme(light/dark)로 시작하고, Theme을 늘릴 수 있게 설계한다.
- Token은 Primitive → Semantic → Component 3계층이다. Component Token은 Semantic만으로 표현할 수 없을 때만 만든다.
- Figma Variables collection 구성:
  - `Primitive`: mode = Theme
  - `Semantic`: mode = Color Scheme. Primitive를 alias로 참조한다
  - `Component`: 필요할 때만 만든다

### 컴포넌트

- 공개 API는 Compound Component, `render` prop, `data-*` 상태 속성으로 통일한다 ([ADR-0002](./adr/0002-compound-render-prop-public-api.md)).
- 기본 컴포넌트는 WAI-ARIA APG를 보며 직접 구현한다. 어려운 컴포넌트는 React Aria hooks와 `react-stately`로 구현하고, RAC는 예외적인 경우에만 이유를 기록하고 쓴다 ([ADR-0003](./adr/0003-react-aria-hooks-for-complex-components.md)).
- Base UI는 API 설계의 참고 자료로 계속 본다.

### Figma

- Professional Full seat를 기준으로 한다. Variables REST API는 Enterprise 전용이므로 동기화는 플러그인으로 한다.
- Figma가 원본(Source of Truth)이다. 플러그인이 내보낸 결과를 PR로 반영하고, 반대 방향의 어긋남은 Drift 검사로 잡는다 ([ADR-0001](./adr/0001-figma-as-source-of-truth.md)).
- Figma 라이브러리(Variables, 컴포넌트, variant)는 직접 만든다. 디자인 품질보다 구조에 집중한다.

### 범위

- 웹뷰 대응을 포함한다: safe-area, 가상 키보드, 터치 영역, 폰트 스케일, 앱 테마 동기화, 스크롤 잠금, 뒤로가기 연동(브리지는 주입받는다).
- 네이티브 크로스플랫폼(iOS/Android 토큰 결과물, 네이티브 컴포넌트)은 제외한다.

### 품질

- Storybook과 Vitest addon으로 상호작용을 테스트한다.
- 시각 회귀 테스트는 외부 SaaS 없이 Playwright 스크린샷을 GitHub Actions에서 직접 돌린다.
- 접근성은 세 겹으로 검증한다:
  - 개발 중에는 Storybook a11y addon으로 확인한다.
  - CI에서 모든 스토리에 axe를 돌리고, 위반이 있으면 실패 처리한다.
  - 컴포넌트마다 VoiceOver(macOS/iOS)와 TalkBack 수동 체크리스트를 만든다.

### 릴리스

- 0.x로 시작하고, Phase 2를 마치면 1.0을 출시한다.
- Conventional Commits를 쓰고, release-please manifest 모드로 패키지별 버전을 관리한다.
- deprecation은 minor에서 경고하고 major에서 제거한다. 제거할 때는 codemod를 제공한다.

### 학습 기록

- 결정은 `docs/adr/`에 남긴다.
- Phase마다 `docs/learning/`에 학습 노트(배운 개념, 참고한 오픈소스 코드, 막혔던 점)를 남긴다.

## 단계

| 단계 | 만드는 것 | 주로 배우는 것 |
|---|---|---|
| Phase 0 | 토큰 파이프라인, Tailwind 테마, 아이콘 파이프라인(Figma → SVG → React), Storybook, CI와 릴리스 기반 · Figma ① ② | DTCG, Style Dictionary, 토큰 계층 설계, Figma Plugin API, 모노레포, release-please |
| Phase 1 | Button, IconButton, Text/Heading, Checkbox, Radio, Switch, TextField, Tabs, Dialog, Menu, Tooltip (직접 구현) | WAI-ARIA APG, 포커스 관리, compound 구성과 `render` prop 구현, 접근성 CI |
| Phase 1~2 | Figma ③ ④ | Figma 컴포넌트 property와 TS 타입 매핑 |
| Phase 2 | Select, Combobox, Popover, Toast, NumberField, Slider (React Aria hooks) → **1.0** | React Aria hooks와 stately, 한국어 IME, 위치 계산 |
| Phase 3 | BottomSheet, safe-area, 키보드 대응, 뒤로가기 연동 | 웹뷰 경험을 디자인 시스템 관점으로 정리 |
| Phase 4 | DatePicker, Table, 가상화 List, Pagination | i18n, 가상화, 성능 |
| 전 단계에 걸쳐 | Figma ⑤ ⑥, 예제 앱, 도입률 측정, 문서 사이트와 문서 자동화, eslint-plugin, 1.0 이후 하위호환과 codemod | AI 생산물 검증, 디자인 시스템 거버넌스, DX |

## Figma 연동 단계

1. **토큰 내보내기 플러그인**: Variables를 DTCG JSON으로 바꾸고 GitHub에 PR을 올린다.
2. **Drift 검사**: CI에서 Figma와 코드를 비교한다(플러그인이 내보낸 스냅샷 기준).
3. **컴포넌트 명세 일치 검사**: Figma 컴포넌트의 property/variant와 React props 타입을 비교한다.
4. **Code Connect**: Dev Mode에서 gyeol-ui 컴포넌트 코드가 보이게 한다. Professional은 라이브러리 1개, 프레임워크 1개로 제한된다.
5. **MCP + Claude Code 코드 생성**: Figma 화면을 gyeol-ui 컴포넌트로 조립한 코드로 만들고, 그 결과를 검증한다.
6. **`LIBRARY_PUBLISH` webhook**: Figma에서 라이브러리를 배포하면 동기화 작업이 자동으로 시작된다.

## 참고: 2026-11 기준 확인한 사실

- Figma Variables REST API는 읽기와 쓰기 모두 Enterprise 전용이다. 플러그인 API로는 모든 요금제에서 Variables를 다룰 수 있고, Professional은 collection당 mode가 최대 10개다.
- Figma PAT는 최대 90일 후 만료된다.
- Base UI(1.9)에는 날짜 컴포넌트와 내장 가상화가 없고, Combobox의 IME 이슈가 아직 열려 있다. React Aria(RAC 1.22)는 ko-KR 문구와 CJK IME 수정 사항을 갖추고 있다.
