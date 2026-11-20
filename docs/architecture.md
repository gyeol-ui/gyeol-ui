# 아키텍처

gyeol-ui를 어떻게 만들고, 검증하고, 내보내는지에 대한 현재 규칙이다. 어디로 가는지는 [로드맵](./roadmap.md)을, 용어는 [GLOSSARY.md](../GLOSSARY.md)를 따른다.

- 구조와 도구의 규칙은 이 문서 한 곳에 적는다. Phase를 시작할 때 정한 Phase 전체 규칙도 여기에 더한다. 함수 인자 같은 코드 작성 규칙은 [코딩 규칙](./coding-standards.md)에 적는다.
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

## 스타일과 토큰

- 컴포넌트 내부는 Tailwind v4로 작성한다. 배포할 때는 빌드된 CSS를 함께 내보내고, 색과 크기는 CSS 변수로 표현한다. Tailwind 사용자를 위해 `@theme` CSS도 제공한다.
- Theme(브랜드별 토큰 세트)은 지원하지 않는다. Color Scheme(light/dark)만 지원한다 ([ADR-0004](./adr/0004-no-theme-two-token-collections.md)).
- Token은 Primitive → Semantic → Component 계층이다. Component Token은 Semantic만으로 표현할 수 없을 때만 만든다.
- Figma Variables collection 구성:
  - `Primitive`: mode 1개. 실제 값만 둔다 (색 이름, 간격, 모서리 등)
  - `Semantic`: mode = Color Scheme. 칸은 Primitive나 같은 collection의 다른 Semantic Token을 가리킨다. Color Scheme에 따라 바뀌는 것만 둔다
  - `Component`: 필요할 때만 만든다
- 토큰 파일은 DTCG 2025.10 형식으로 쓰고 Style Dictionary로 빌드한다. collection의 mode 하나를 파일 하나로 두고(`packages/tokens/tokens/primitive.json`, `semantic/light.json`, `semantic/dark.json`), Color Scheme마다 따로 빌드한다.
- 토큰 빌드는 아래 규칙을 검사하고, 어기면 실패한다.
  - Primitive는 실제 값만 둔다. alias와 투명도 확장("alias + 투명도")을 쓰지 않는다. 색 값 자체의 `alpha`는 실제 값이므로 허용한다.
  - Semantic은 모든 칸이 Primitive나 다른 Semantic을 가리키는 alias다. 투명도는 허용하고, 타입은 색만 허용한다.
  - 경로는 최대 3단계, 이름은 kebab-case다. 모든 토큰의 CSS 변수 이름이 서로 다르다. 색은 `srgb`, dimension은 `px`다. 참조 대상이 존재한다.
- 토큰 원본은 플랫폼 중립으로 설계한다. 이름, 구조, 타입은 Figma와 DTCG 기준으로 정하고, 플랫폼 관례(CSS 변수 이름, Tailwind 네임스페이스 등)는 출력 변환에서만 다룬다.
  - 경로 규칙. Figma 변수 이름은 같은 경로를 `/`로 잇는다.
    - Primitive: 범주 / (그룹) / 이름 (예: `color.gray.900`, `spacing.4`, `radius.md`)
    - Semantic: (그룹) / 이름 (예: `bg-surface`, `alpha.90`). 색만 담으므로 범주를 쓰지 않는다
    - 이름은 kebab-case다. 그룹은 한 단계까지만 둔다.
    - 모든 토큰의 CSS 변수 이름은 서로 달라야 한다.
  - 색은 `srgb`로 쓰고 Figma 파일의 color profile도 sRGB로 둔다. dimension은 `px`로 쓴다.
  - 간격의 단계 이름은 4px의 배수로 한다 (예: `spacing.4` = 16px). 모서리는 크기 단계로 이름 짓는다 (예: `radius.sm`, `radius.md`, `radius.full`).
  - Semantic의 `alpha` 그룹은 `bg-surface`의 투명도 단계이고, 숫자는 불투명도다 (예: `alpha.90` = `bg-surface` 90%). 다른 색에 투명도를 건 토큰은 용도 이름을 붙인다.
  - Figma의 "alias + 투명도"는 허용한다. `$value`에는 계산한 색을, `$extensions`에는 참조 대상과 투명도를 적고, CSS에는 `color-mix(in srgb, var(--…) N%, transparent)`로 낸다.
- CSS 변수는 `--gyeol-` 접두사를 붙인다 (예: `--gyeol-bg-surface`). Primitive는 `:root`에, Semantic은 Primitive를 `var()`로 가리키는 Color Scheme 블록에 낸다.
  - 공개 API는 Semantic 변수와, 색이 아닌 Primitive 변수(`--gyeol-spacing-*`, `--gyeol-radius-*`)다. Primitive 색 변수는 출력되지만 공개 API가 아니다. 컴포넌트는 색에 Semantic만 쓴다.
- Color Scheme은 기본으로 `prefers-color-scheme`을 따르고, `<html>`에 `data-color-scheme` 속성이 있으면 그 값을 따른다. 속성은 `<html>`에서만 지원하고, 페이지 일부의 Color Scheme을 따로 바꾸는 것은 지원하지 않는다. 웹뷰에서는 네이티브 앱의 light/dark 설정이 `prefers-color-scheme`에 반영된다. Color Scheme 블록마다 CSS `color-scheme` 속성도 낸다.

확인한 사실(2026-11):

- DTCG 안정판은 2025.10이다. 색 값은 `colorSpace`와 `components`를 가진 객체이고, 테마는 Resolver 모듈(`.resolver.json`)로 정의한다.
- Style Dictionary(5.8)는 색 객체를 지원하지만 Resolver는 지원하지 않고(이슈 #1590), Tailwind `@theme` format이 내장되어 있지 않다. Terrazzo(2.10)는 둘 다 지원한다.
- Style Dictionary(5.8.0)에서 직접 빌드해 확인했다.
  - 기본 transform은 색 객체(5.3부터)와 dimension 객체(5.4부터)를 처리한다. color/size transform이 없으면 `[object Object]`가 나온다.
  - `color/css`는 sRGB로만 낸다.
  - `size/px`는 unit을 무시하고 px를 붙인다. 그래서 rem 값에는 쓰면 안 된다.
  - 기본 `css` transformGroup의 `size/rem`은 이름과 달리 px를 rem으로 바꾸지 않는다. unit이 적혀 있으면 그대로 붙이고(`{16, px}` → `16px`), unit 없는 숫자에만 `rem`을 붙인다.
  - 참조 대상을 `include`로 넣고 `outputReferences: true`로 빌드하면 Semantic을 `var(--…)` 참조로 낼 수 있다. `include`로 넣은 토큰도 기본으로 출력되므로, file `filter`를 `token.isSource`로 두어야 `source`의 토큰만 나온다.
  - `source`와 `include`는 경로 하나라도 glob 패턴으로 풀고, 맞는 파일이 0개여도 오류 없이 빈 결과를 낸다.
  - 파일 설정의 `format`은 타입 선언상 함수도 받지만, 실제로는 `hooks.formats`에 등록된 이름만 찾는다.
  - JS/TS 기본 format은 `outputReferences`를 지원하지 않는다.
  - `$type`이 없는 alias는 참조 대상의 타입을 물려받지 못한다(이슈 #1811).
- Figma는 DTCG import/export를 기본 기능으로 제공한다.
  - 단위는 collection의 mode 하나당 파일 하나다.
  - 색은 `srgb`/`hsl`만, dimension은 `px`만 받는다.
  - export 결과의 정확한 모양(파일 이름, 메타데이터)은 확인하지 못했다.
- Figma Plugin API의 색 값은 색공간 표시가 없는 0–1 float이다. 문서의 color profile에 따라 해석된다. FLOAT는 단위가 없다.
- 웹뷰의 `prefers-color-scheme`은 네이티브 앱의 테마를 따른다(공식 문서와 엔진 소스로 확인, 실기기 미확인).
  - iOS WKWebView는 웹뷰의 `traitCollection`(`overrideUserInterfaceStyle`)을 따르고, 바꾸면 리로드 없이 반영된다.
  - Android WebView는 targetSdk 33 이상에서 앱 테마의 `isLightTheme`를 따른다.
  - targetSdk 32 이하에서는 `<meta name="color-scheme" content="light dark">`가 없으면 dark media query가 무시될 수 있다.
- shadcn/ui Figma kit(2026-10)은 collection 세 개로 나눈다. `Tailwind`(mode 1개, 팔레트), `Style`(mode = 스타일, `color/light/*`와 `color/dark/*`를 모두 가짐, radius·shadow·font 포함), `Mode`(Light/Dark, 같은 이름의 `color/light/*` 또는 `color/dark/*`를 가리킴)다. "alias + 투명도"를 여러 곳에 쓰고, `Style` 안의 토큰끼리도 가리킨다(예: `color/dark/alpha/5` → `color/dark/background` 95%).
- DTCG 2025.10에는 "참조하면서 투명도만 바꾸기"를 적는 표준 방법이 없다. Style Dictionary(5.8)는 JSON Pointer `$ref`와 `color-mix()` 출력을 지원하지 않는다. `color-mix()`는 iOS Safari 16.2, Android WebView 111부터 쓸 수 있다.

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
