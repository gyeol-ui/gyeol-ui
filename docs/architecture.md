# 아키텍처

gyeol-ui를 어떻게 만들고, 검증하고, 내보내는지에 대한 현재 규칙이다. 어디로 가는지는 [로드맵](./roadmap.md)을, 용어는 [GLOSSARY.md](../GLOSSARY.md)를 따른다.

- 규칙은 이 문서 한 곳에 적는다. Phase를 시작할 때 정한 Phase 전체 규칙도 여기에 더한다.
- 되돌리기 어렵고, 맥락 없이는 의아하고, 실제 trade-off가 있었던 결정은 이유를 [ADR](./adr/)로 남기고 여기서 링크한다.
- 결정의 근거가 된 사실은 그 결정 바로 아래 "확인한 사실"에 확인 시점과 함께 적는다. 사실이 바뀌면 바로 위의 규칙을 다시 본다.

## 구조

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
- 패키지 의존 방향은 `tokens` → `tailwind` → `react` 한쪽이다. 내부 의존은 `workspace:*`로 선언하고, 소스가 아니라 빌드 결과(`dist`)를 참조한다. 순서는 turbo의 `dependsOn: ["^build"]`로 보장하고 TS `paths` 별칭은 쓰지 않는다.
- 공용 설정은 루트 파일(`tsconfig.base.json`, 루트 oxlint 설정)로 두고, 설정 전용 내부 패키지는 만들지 않는다.
- `eslint-plugin`은 gyeol-ui 사용자를 위한 패키지다. 이 저장소는 oxlint를 쓰므로 규칙 단위 테스트와 `apps/example`에서 검증한다.

## 도구

- Node 26(Active LTS), pnpm 12, Turborepo 2, TypeScript 7을 쓴다. Node는 `.node-version`, pnpm은 `packageManager` 필드로 고정한다.
- lint는 oxlint, format은 Prettier를 쓴다.
  - oxlint는 `correctness`와 `suspicious` 범주를 error로 두고 타입 인식 lint를 켠다. 나머지 범주는 끄고, 필요한 규칙만 골라 error로 켠다. warn 단계는 두지 않는다.
  - `react`와 `jsx-a11y` 플러그인은 Phase 1 첫 스펙에서 켠다.
- TypeScript는 `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedDeclarations`를 켠다.
- TS 패키지 빌드는 tsdown으로 통일한다. `tokens`의 주 빌드는 Style Dictionary 스크립트다.
- 배포 패키지는 ESM만 내보낸다.
- pre-commit hook(husky, lint-staged)은 staged 파일에 Prettier와 oxlint만 돌린다. typecheck와 test는 CI에서만 돌린다.
- CI는 GitHub Actions 워크플로 하나에서 lint, format 검사, typecheck, test, build를 turbo로 실행한다. turbo 원격 캐시는 쓰지 않는다. PR 제목 형식은 별도 워크플로에서 검사해, 제목만 고쳤을 때 전체 검사를 다시 돌리지 않는다.

확인한 사실(2026-11):

- oxlint(1.94)의 타입 인식 lint는 TypeScript 7 이상이 필요하다. TypeScript 7(Go 네이티브 컴파일러)이 `latest`다.
- oxlint(1.94.0)의 타입 인식 lint는 `oxlint-tsgolint`(7.0.2007)를 설치하고 설정의 `options.typeAware`를 켜면 TypeScript 7.0.2에서 동작한다. 처리하지 않은 Promise가 `typescript/no-floating-promises` error로 잡히는 것을 확인했다.
- tsup은 유지보수가 중단되었고, tsup과 Vite 문서 모두 tsdown(0.23)을 권한다.
- tsdown(0.23.7)의 타입 선언 생성은 TypeScript 7.0.2에서 동작한다. `isolatedDeclarations`를 켜면 TypeScript 컴파일러를 거치지 않는 빠른 경로로 만들고, 끄면 TypeScript 7로 만든다. 두 경로 모두 확인했다.

## 스타일과 테마

- 컴포넌트 내부는 Tailwind v4로 작성한다. 배포할 때는 빌드된 CSS를 함께 내보내고, 테마는 CSS 변수로 바꾼다. Tailwind 사용자를 위해 `@theme` CSS도 제공한다.
- Theme 1개 × Color Scheme(light/dark)로 시작하고, Theme을 늘릴 수 있게 설계한다.
- Token은 Primitive → Semantic → Component 3계층이다. Component Token은 Semantic만으로 표현할 수 없을 때만 만든다.
- 토큰 파일은 DTCG 2025.10 형식으로 쓰고 Style Dictionary로 빌드한다. Style Dictionary가 DTCG Resolver를 지원하지 않으므로 Theme과 Color Scheme 조합은 파일 분리와 다중 빌드로 처리한다. 구조는 토큰 파이프라인 스펙에서 정하고 ADR로 남긴다.
- Figma Variables collection 구성:
  - `Primitive`: mode = Theme
  - `Semantic`: mode = Color Scheme. Primitive를 alias로 참조한다
  - `Component`: 필요할 때만 만든다

확인한 사실(2026-11):

- DTCG 안정판은 2025.10이다. 색 값은 `colorSpace`와 `components`를 가진 객체이고, 테마는 Resolver 모듈(`.resolver.json`)로 정의한다.
- Style Dictionary(5.8)는 색 객체를 지원하지만 Resolver는 지원하지 않고(이슈 #1590), Tailwind `@theme` format이 내장되어 있지 않다. Terrazzo(2.10)는 둘 다 지원한다.

## 컴포넌트

- 공개 API는 Compound Component, `render` prop, `data-*` 상태 속성으로 통일한다 ([ADR-0002](./adr/0002-compound-render-prop-public-api.md)).
- 기본 컴포넌트는 WAI-ARIA APG를 보며 직접 구현한다. 어려운 컴포넌트는 React Aria hooks와 `react-stately`로 구현하고, RAC는 예외적인 경우에만 이유를 기록하고 쓴다 ([ADR-0003](./adr/0003-react-aria-hooks-for-complex-components.md)).
- Base UI는 API 설계의 참고 자료로 계속 본다.
- `react`의 peer는 `react >=18`이다. 개발과 Storybook은 React 19로 하고, React 18 테스트는 Phase 1 첫 스펙에서 CI에 추가한다. 18을 지원하므로 Part는 `forwardRef`로 감싸고 19 전용 API는 쓰지 않는다.

확인한 사실(2026-11):

- Base UI(1.9)에는 날짜 컴포넌트와 내장 가상화가 없고, Combobox의 IME 이슈가 아직 열려 있다. React Aria(RAC 1.22)는 ko-KR 문구와 CJK IME 수정 사항을 갖추고 있다.

## Figma

- Professional Full seat를 기준으로 한다. Variables REST API는 Enterprise 전용이므로 동기화는 플러그인으로 한다.
- Figma가 원본(Source of Truth)이다. 플러그인이 내보낸 결과를 PR로 반영하고, 반대 방향의 어긋남은 Drift 검사로 잡는다 ([ADR-0001](./adr/0001-figma-as-source-of-truth.md)).
- Figma 라이브러리(Variables, 컴포넌트, variant)는 직접 만든다. 디자인 품질보다 구조에 집중한다.

확인한 사실(2026-11):

- Figma Variables REST API는 읽기와 쓰기 모두 Enterprise 전용이다. 플러그인 API로는 모든 요금제에서 Variables를 다룰 수 있고, Professional은 collection당 mode가 최대 10개다.
- Figma PAT는 최대 90일 후 만료된다.
- Figma 플러그인은 manifest의 `networkAccess.allowedDomains`에 적은 도메인으로만 `fetch`할 수 있다. `api.github.com`은 CORS를 허용하므로 사용자 토큰으로 PR을 열 수 있다.

## 품질

- Storybook과 Vitest addon으로 상호작용을 테스트한다.
- 시각 회귀 테스트는 외부 SaaS 없이 Playwright 스크린샷을 GitHub Actions에서 직접 돌린다.
- 접근성은 세 겹으로 검증한다:
  - 개발 중에는 Storybook a11y addon으로 확인한다.
  - CI에서 모든 스토리에 axe를 돌리고, 위반이 있으면 실패 처리한다.
  - 컴포넌트마다 VoiceOver(macOS/iOS)와 TalkBack 수동 체크리스트를 만든다.

## 릴리스

- 0.x로 시작하고, Phase 2를 마치면 1.0을 출시한다.
- Conventional Commits를 쓰고, release-please manifest 모드로 패키지별 버전을 관리한다.
- deprecation은 minor에서 경고하고 major에서 제거한다. 제거할 때는 codemod를 제공한다.

확인한 사실(2026-11):

- npm trusted publishing(OIDC)은 정식 기능이다. 쓰기 가능한 granular token은 최대 90일이다.
- `@gyeol-ui` 스코프에 배포된 패키지는 없다. org 이름의 등록 여부는 확인하지 못했다.
