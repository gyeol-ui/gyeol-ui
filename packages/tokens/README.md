# @gyeol-ui/tokens

gyeol-ui의 Design Token 패키지입니다.

> 🚧 아직 npm에 배포하지 않았습니다.
>
> 지금 들어 있는 토큰은 Figma에서 내보낸 것이 아니라 **손으로 쓴 임시 씨앗 토큰**입니다. 값과 이름은 Figma 플러그인이 토큰을 내보내기 시작하면 바뀔 수 있습니다. 지금은 Primitive Token(색, 간격, 모서리)과 Semantic Token만 있습니다.

## 사용법

### CSS 변수

CSS 파일 하나를 import하면 `:root`에 CSS 변수가 정의됩니다.

```ts
import "@gyeol-ui/tokens/tokens.css";
```

```css
.card {
  padding: var(--gyeol-spacing-4);
  border-radius: var(--gyeol-radius-md);
  background: var(--gyeol-bg-surface);
  color: var(--gyeol-fg-default);
}
```

변수 이름은 `--gyeol-` 뒤에 토큰 경로를 `-`로 이은 것입니다(`spacing.4` → `--gyeol-spacing-4`).

| 범주 | 변수 | 공개 API |
|---|---|---|
| Semantic 색 | `--gyeol-bg-surface`, `--gyeol-bg-subtle`, `--gyeol-fg-default`, `--gyeol-fg-muted`, `--gyeol-border-default`, `--gyeol-bg-accent`, `--gyeol-fg-on-accent`, `--gyeol-ring-offset`, `--gyeol-alpha-90` | 예 |
| 간격 | `--gyeol-spacing-{1, 2, 3, 4, 6, 8}` (4px의 배수, `spacing-4` = 16px) | 예 |
| 모서리 | `--gyeol-radius-{sm, md, full}` | 예 |
| 색 | `--gyeol-color-*` | 아니요 |

`--gyeol-color-*`는 Primitive 색이라 출력은 되지만 공개 API가 아닙니다. 색에는 Semantic 변수를 쓰세요. Semantic 변수의 값은 `var(--gyeol-color-gray-900)`처럼 Primitive나 다른 Semantic 변수를 가리킵니다.

투명도가 있는 Semantic 변수는 가리키는 변수를 `color-mix()`로 투명하게 섞습니다. 가리키는 변수의 색이 Color Scheme에 따라 바뀌면 함께 바뀝니다.

```css
--gyeol-alpha-90: color-mix(in srgb, var(--gyeol-bg-surface) 90%, transparent);
```

`alpha` 그룹은 `bg-surface`의 투명도 단계이고, 숫자는 불투명도입니다(`alpha-90` = `bg-surface`의 90%). `color-mix()`는 iOS Safari 16.2, Android WebView 111부터 쓸 수 있습니다.

### Color Scheme 고르기

Semantic 색은 Color Scheme(light/dark)에 따라 바뀝니다. 아무것도 하지 않으면 OS나 웹뷰의 설정(`prefers-color-scheme`)을 따릅니다. 웹뷰에서는 네이티브 앱의 light/dark 설정이 여기에 반영됩니다.

사이트 안에서 직접 고르려면 `<html>`에 `data-color-scheme` 속성을 붙입니다. 속성이 있으면 OS 설정보다 속성을 따릅니다.

```html
<html data-color-scheme="dark">  <!-- 항상 dark -->
<html data-color-scheme="light"> <!-- 항상 light -->
<html>                           <!-- OS 설정을 따른다 -->
```

| 조건 | 적용되는 블록 |
|---|---|
| 기본 | `:root` (light) |
| OS 설정이 dark이고 `data-color-scheme="light"`가 아님 | `@media (prefers-color-scheme: dark) { :root:not([data-color-scheme="light"]) }` (dark) |
| `data-color-scheme="dark"` | `:root[data-color-scheme="dark"]` (dark) |

`data-color-scheme`은 `<html>`에서만 동작합니다. 페이지 일부(`<section>` 등)에 붙이면 아무 효과가 없고, 그 요소는 `<html>`의 Color Scheme을 그대로 따릅니다. 페이지 안에서 영역마다 Color Scheme을 다르게 하는 것은 지원하지 않습니다.

블록마다 CSS `color-scheme` 속성도 함께 정의하므로 스크롤바와 폼 컨트롤 같은 브라우저 기본 UI도 같은 Color Scheme을 따릅니다.

> **Android 웹뷰(targetSdk 32 이하)**: 이 웹뷰는 페이지에 아래 meta 태그가 없으면 `prefers-color-scheme: dark`를 무시할 수 있습니다. 앱의 targetSdk가 32 이하라면 `<head>`에 넣으세요.
>
> ```html
> <meta name="color-scheme" content="light dark">
> ```

### TS

ESM만 제공합니다. `tokens`와 `values`를 내보냅니다. 키는 토큰 경로의 이름 칸을 camelCase로 바꾼 것이고(`bg-surface` → `bgSurface`), 그룹은 중첩 객체입니다(`alpha.90` → `alpha[90]`).

#### `tokens`: CSS 변수 참조

CSS 변수를 가리키는 `var()` 문자열입니다. 인라인 스타일처럼 TS에서 CSS 값을 쓸 때 이름을 틀리지 않게 해 줍니다. 값은 CSS 변수이므로 `tokens.css`를 함께 import해야 하고, Color Scheme이 바뀌면 CSS처럼 따라 바뀝니다.

```tsx
import "@gyeol-ui/tokens/tokens.css";
import { tokens } from "@gyeol-ui/tokens";

tokens.bgSurface; // "var(--gyeol-bg-surface)"
tokens.alpha[90]; // "var(--gyeol-alpha-90)"
tokens.spacing[4]; // "var(--gyeol-spacing-4)"
tokens.radius.md; // "var(--gyeol-radius-md)"

<div style={{ background: tokens.bgSurface, padding: tokens.spacing[4] }} />;
```

범위는 CSS의 공개 API와 같습니다: Semantic 색, `spacing`, `radius`. Primitive 색은 들어 있지 않습니다. 값은 리터럴 타입이라 `typeof tokens.bgSurface`는 `"var(--gyeol-bg-surface)"`입니다.

#### `values`: Color Scheme별 실제 색

CSS 밖에서 실제 색이 필요할 때 씁니다. 예를 들어 웹뷰에서 네이티브 앱의 상태바 색을 브리지로 넘길 때입니다. Semantic 색만 들어 있고, 값은 hex(`#rrggbb`)이거나, 투명도가 있으면 `rgba()`입니다.

```ts
import { values } from "@gyeol-ui/tokens";

const colorScheme = matchMedia("(prefers-color-scheme: dark)").matches
  ? "dark"
  : "light";

values[colorScheme].bgSurface; // light: "#ffffff", dark: "#09090b"
values.dark.alpha[90]; // "rgba(9, 9, 11, 0.9)"
```

투명도가 있는 값은 토큰 원본의 `$value`에 적힌 계산된 색("alias + 투명도", 아래 "토큰 원본" 참고)입니다. `values`는 빌드할 때 정해진 문자열이라 Color Scheme이 바뀌어도 스스로 바뀌지 않습니다. 지금 Color Scheme에 맞는 쪽을 직접 고르세요.

### 공개 토큰 목록

`@gyeol-ui/tokens/tokens.json`은 어떤 토큰이 있는지 담은 목록입니다. 다른 패키지(예: Tailwind 테마)가 토큰 이름을 하드코딩하지 않고 이 목록으로 토큰을 알게 하려는 것입니다.

```ts
import publicTokens from "@gyeol-ui/tokens/tokens.json" with { type: "json" };
```

```json
[
  { "path": "bg-surface", "type": "color", "cssVariable": "--gyeol-bg-surface" },
  { "path": "alpha.90", "type": "color", "cssVariable": "--gyeol-alpha-90" },
  { "path": "spacing.4", "type": "dimension", "cssVariable": "--gyeol-spacing-4" }
]
```

| 필드 | 값 |
|---|---|
| `path` | DTCG 경로. 그룹은 `.`으로 잇습니다(`alpha.90`) |
| `type` | `color` 또는 `dimension` |
| `cssVariable` | `tokens.css`가 정의하는 CSS 변수 이름 |

범위는 공개 API와 같습니다: Semantic 색 전부(`alpha` 그룹 포함), `spacing`, `radius`. Primitive 색은 들어 있지 않습니다.

## 토큰 원본

토큰 원본은 [`tokens/`](./tokens/) 폴더의 DTCG 2025.10 JSON입니다. Figma Variables collection의 mode 하나가 파일 하나입니다.

- `tokens/primitive.json`: Primitive collection. `color`, `spacing`, `radius` 범주 그룹에 `$type`을 선언합니다.
- `tokens/semantic/light.json`, `tokens/semantic/dark.json`: Semantic collection의 light, dark mode. 두 파일에 같은 이름의 토큰이 있고, 값은 `{color.gray.900}`이나 `{bg-surface}` 같은 참조이거나, 아래의 "alias + 투명도"입니다. 범주 그룹이 없으므로 `$type`은 토큰마다 적습니다.
- Figma의 "alias + 투명도"는 `$value`에 계산한 색(`alpha` 포함)을 적고, `$extensions`의 `gyeol.alias`에 참조 대상과 불투명도를 적습니다. CSS에는 `$value`가 아니라 `gyeol.alias`로 만든 `color-mix(in srgb, var(--gyeol-…) N%, transparent)`가 나옵니다. 참조 대상은 Primitive와 Semantic 모두 됩니다.

  ```json
  "90": {
    "$type": "color",
    "$value": { "colorSpace": "srgb", "components": [1, 1, 1], "alpha": 0.9 },
    "$extensions": { "gyeol": { "alias": { "ref": "{bg-surface}", "alpha": 0.9 } } }
  }
  ```

- 색은 `srgb` 색 객체(`{ "colorSpace": "srgb", "components": [r, g, b] }`, 각 값은 0–1)로 쓰고, CSS에는 hex로 나옵니다. `alpha`가 있으면 `rgba()`로 나옵니다.
- dimension은 `{ "value": 16, "unit": "px" }`로 쓰고, CSS에는 px로 나옵니다.

### 토큰 JSON을 고칠 때 지킬 규칙

빌드는 CSS를 만들기 전에 토큰 JSON을 검사하고, 규칙을 하나라도 어기면 실패합니다. 첫 위반에서 멈추지 않고 모든 위반을 한 번에 알립니다. 줄마다 파일, 토큰 경로, 어긴 규칙의 이름, 설명이 나옵니다.

```text
TokenValidationError: 토큰 JSON이 규칙을 2곳에서 어겼다.
  primitive.json color.ink [primitive-real-value] Primitive는 실제 값만 둔다. alias {color.black}를 쓸 수 없다
  semantic/dark.json fg-muted [semantic-names-match] semantic/light.json에 있는 Semantic이 이 파일에 없다
```

| 규칙 이름 | 규칙 |
|---|---|
| `primitive-real-value` | Primitive는 실제 값만 둡니다. 참조(`{…}`)와 "alias + 투명도"(`$extensions.gyeol.alias`)를 쓰지 않습니다. 색 값 자체의 `alpha`는 실제 값이므로 됩니다. |
| `semantic-alias` | Semantic은 모든 토큰이 Primitive나 같은 파일의 다른 Semantic을 가리키는 참조이거나, `ref`가 참조인 "alias + 투명도"입니다. |
| `semantic-color` | Semantic의 `$type`은 `color`만 됩니다. |
| `semantic-names-match` | `semantic/light.json`과 `semantic/dark.json`에 같은 이름의 토큰이 모두 있어야 합니다. 빠진 쪽 파일의 위반으로 나옵니다. |
| `path-structure` | 경로는 최대 3단계입니다. Primitive는 `범주/(그룹)/이름`(2–3단계, 예: `spacing.4`, `color.gray.900`), Semantic은 `(그룹)/이름`(1–2단계, 예: `bg-surface`, `alpha.90`)입니다. |
| `kebab-case` | 경로의 모든 이름 칸은 kebab-case(소문자, 숫자, `-`)입니다. |
| `css-name-unique` | 모든 토큰의 CSS 변수 이름이 서로 달라야 합니다. `alpha.90`과 `alpha-90`은 모두 `--gyeol-alpha-90`이 되어 겹칩니다. Semantic은 Primitive와도 겹치면 안 됩니다. |
| `color-srgb` | 색은 `srgb` 색 객체입니다. hex 문자열이나 다른 색 공간은 안 됩니다. "alias + 투명도"의 `$value`도 검사합니다. |
| `dimension-px` | dimension은 `unit`이 `px`인 객체입니다. |
| `reference-exists` | 참조 대상 토큰이 있어야 합니다. 그룹은 토큰이 아니므로 가리킬 수 없고, Semantic은 다른 Color Scheme 파일의 Semantic을 가리킬 수 없습니다. |
| `reference-no-cycle` | 참조가 순환하면 안 됩니다(`fg-default` → `fg-muted` → `fg-default`). 순환에 든 토큰 중 파일에서 가장 앞의 토큰에서 나옵니다. |

파일이 없거나 JSON 문법이 틀리면 규칙 검사 전에 일반 오류로 실패합니다.

## 개발

저장소 루트에서 의존성을 설치한 뒤 이 폴더에서 실행합니다.

| 명령 | 하는 일 |
|---|---|
| `pnpm build` | Style Dictionary로 `generated/tokens.css`, `generated/index.ts`, `generated/tokens.json`을 만들고, tsdown으로 `generated/index.ts`에서 `dist/`에 ESM과 타입 선언을 만들며 `tokens.css`와 `tokens.json`을 복사한다 |
| `pnpm lint` | oxlint로 코드를 검사한다 |
| `pnpm test` | Vitest로 테스트를 실행한다 |
| `pnpm typecheck` | `tsc`로 타입을 검사한다 |

빌드 함수는 [`scripts/build-tokens.ts`](./scripts/build-tokens.ts)의 `buildTokens(토큰 폴더)`입니다. 먼저 [`scripts/validate-tokens.ts`](./scripts/validate-tokens.ts)로 위의 규칙을 검사하고, 위반이 있으면 모든 위반을 담은 `TokenValidationError`를 던집니다. 규칙 하나하나를 검사하는 순수 함수는 [`scripts/validate-tokens.helper.ts`](./scripts/validate-tokens.helper.ts)에 있고, 함수마다 무엇을 받아 어떤 위반을 돌려주는지는 [`scripts/validate-tokens.helper.test.ts`](./scripts/validate-tokens.helper.test.ts)에서 볼 수 있습니다. 파일을 쓰지 않고 CSS 텍스트, TS 소스, 공개 토큰 목록 JSON을 돌려주므로, 테스트는 [`scripts/fixtures/`](./scripts/fixtures/)의 fixture 토큰 폴더로 이 함수를 부릅니다. `pnpm build`는 [`scripts/build.ts`](./scripts/build.ts)에서 이 함수를 실제 `tokens/` 폴더로 실행해 결과를 git에 넣지 않는 `generated/`에 씁니다. 이어서 tsdown이 `dist/`를 비우고 `generated/index.ts`를 패키지 진입점으로 빌드한 뒤 `generated/tokens.css`와 `generated/tokens.json`을 `dist/`로 복사합니다. TS 소스를 쓰는 순수 함수 `formatTsModule`은 [`scripts/build-tokens.helper.ts`](./scripts/build-tokens.helper.ts)에 있습니다.
