# gyeol-ui 로드맵

## 목표

디자인 시스템 엔지니어로 성장하는 것이 목표다. 시중 디자인 시스템 규모(약 40개 컴포넌트)의 오픈소스를 직접 만들면서 배운다. 기간은 정해 두지 않고, Figma 연동을 가장 깊게 다룬다.

- 패키지 스코프는 `@gyeol-ui/*`, 라이선스는 MIT다.
- 문서는 한국어로 쓴다. 영어 병행은 나중에 검토한다.
- 만드는 방법(구조, 도구, 스타일, 컴포넌트, Figma, 품질, 릴리스)은 [아키텍처](./architecture.md)를, 용어는 [GLOSSARY.md](../GLOSSARY.md)를, 주요 결정의 이유는 [docs/adr/](./adr/)를 따른다.
- 작업 절차는 [워크플로우](./workflow.md)를 따른다.

## 범위

- 웹뷰 대응을 포함한다: safe-area, 가상 키보드, 터치 영역, 폰트 스케일, 앱 테마 동기화, 스크롤 잠금, 뒤로가기 연동(브리지는 주입받는다).
- 네이티브 크로스플랫폼(iOS/Android 토큰 결과물, 네이티브 컴포넌트)은 제외한다.

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

## Phase 0 스펙

순서대로 진행한다. CI는 1번에서 뼈대를 만들고, 각 스펙이 자기 검사를 추가한다.

1. **모노레포 기반** (완료, 노트: [concurrency](./learning/github-actions-concurrency.html), [release-please 다음 버전](./learning/squash-merge-and-release-please.html), [oxlint 범주](./learning/oxlint-categories.html)): 루트 도구 설정, 최소 CI, `packages/tokens` 껍데기(자명한 함수 하나와 테스트 하나). 다른 패키지와 앱은 각자의 스펙에서 만든다. TS 7에서 tsdown의 타입 선언 생성과 oxlint 타입 인식 lint가 도는지 여기서 검증하고, 막히면 TS 6으로 내리고 타입 인식 lint를 끈다.
2. **토큰 파이프라인**: `packages/tokens`, DTCG JSON → CSS 변수와 TS 상수. 입력은 손으로 쓴 **임시 씨앗 토큰**(색과 간격 몇 개, Figma collection 구조를 따름)이다.
3. **Tailwind 테마**: `packages/tailwind`, `@theme` CSS. `prettier-plugin-tailwindcss`를 추가한다.
4. **Storybook**: `apps/storybook`, 토큰을 보여주는 스토리.
5. **릴리스 기반**: release-please, `@gyeol-ui/tokens`와 `@gyeol-ui/tailwind`를 npm에 0.x로 실제 배포한다. `react`는 Phase 1에서 첫 컴포넌트와 함께 배포하고, `figma-plugin`은 private으로 둔다.
6. **Figma ① 토큰 내보내기 플러그인**: 씨앗 토큰을 Figma에 한 번 옮겨 적고, 플러그인이 내보낸 결과로 교체한다. 그 뒤로 토큰 JSON을 손으로 편집하지 않는다([ADR-0001](./adr/0001-figma-as-source-of-truth.md)).
7. **Figma ② Drift 검사**
8. **아이콘 파이프라인**: Figma → SVG → React.

## Figma 연동 단계

1. **토큰 내보내기 플러그인**: Variables를 DTCG JSON으로 바꾸고 GitHub에 PR을 올린다.
2. **Drift 검사**: CI에서 Figma와 코드를 비교한다(플러그인이 내보낸 스냅샷 기준).
3. **컴포넌트 명세 일치 검사**: Figma 컴포넌트의 property/variant와 React props 타입을 비교한다.
4. **Code Connect**: Dev Mode에서 gyeol-ui 컴포넌트 코드가 보이게 한다. Professional은 라이브러리 1개, 프레임워크 1개로 제한된다.
5. **MCP + Claude Code 코드 생성**: Figma 화면을 gyeol-ui 컴포넌트로 조립한 코드로 만들고, 그 결과를 검증한다.
6. **`LIBRARY_PUBLISH` webhook**: Figma에서 라이브러리를 배포하면 동기화 작업이 자동으로 시작된다.
