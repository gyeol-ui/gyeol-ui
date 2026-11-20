# @gyeol-ui/tokens

gyeol-ui의 Design Token 패키지입니다.

> 🚧 아직 npm에 배포하지 않았습니다.
>
> 지금 들어 있는 토큰은 Figma에서 내보낸 것이 아니라 **손으로 쓴 임시 씨앗 토큰**입니다. 값과 이름은 Figma 플러그인이 토큰을 내보내기 시작하면 바뀔 수 있습니다. 지금은 Primitive Token(색, 간격, 모서리)과 투명도 없는 Semantic Token만 있고, 투명도가 있는 Semantic Token과 TS 상수는 [토큰 파이프라인 스펙](https://github.com/gyeol-ui/gyeol-ui/issues/16)에서 이어서 추가합니다.

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
| Semantic 색 | `--gyeol-bg-surface`, `--gyeol-bg-subtle`, `--gyeol-fg-default`, `--gyeol-fg-muted`, `--gyeol-border-default`, `--gyeol-bg-accent`, `--gyeol-fg-on-accent`, `--gyeol-ring-offset` | 예 |
| 간격 | `--gyeol-spacing-{1, 2, 3, 4, 6, 8}` (4px의 배수, `spacing-4` = 16px) | 예 |
| 모서리 | `--gyeol-radius-{sm, md, full}` | 예 |
| 색 | `--gyeol-color-*` | 아니요 |

`--gyeol-color-*`는 Primitive 색이라 출력은 되지만 공개 API가 아닙니다. 색에는 Semantic 변수를 쓰세요. Semantic 변수의 값은 `var(--gyeol-color-gray-900)`처럼 Primitive나 다른 Semantic 변수를 가리킵니다.

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
| `data-color-scheme="dark"` | `[data-color-scheme="dark"]` (dark) |

블록마다 CSS `color-scheme` 속성도 함께 정의하므로 스크롤바와 폼 컨트롤 같은 브라우저 기본 UI도 같은 Color Scheme을 따릅니다.

> **Android 웹뷰(targetSdk 32 이하)**: 이 웹뷰는 페이지에 아래 meta 태그가 없으면 `prefers-color-scheme: dark`를 무시할 수 있습니다. 앱의 targetSdk가 32 이하라면 `<head>`에 넣으세요.
>
> ```html
> <meta name="color-scheme" content="light dark">
> ```

### TS

ESM만 제공합니다. 지금은 모노레포 확인용 자리 표시 함수만 있습니다.

```ts
import { packageName } from "@gyeol-ui/tokens";

packageName(); // "@gyeol-ui/tokens"
```

## 토큰 원본

토큰 원본은 [`tokens/`](./tokens/) 폴더의 DTCG 2025.10 JSON입니다. Figma Variables collection의 mode 하나가 파일 하나입니다.

- `tokens/primitive.json`: Primitive collection. `color`, `spacing`, `radius` 범주 그룹에 `$type`을 선언합니다.
- `tokens/semantic/light.json`, `tokens/semantic/dark.json`: Semantic collection의 light, dark mode. 두 파일에 같은 이름의 토큰이 있고, 값은 모두 `{color.gray.900}`이나 `{bg-surface}` 같은 참조입니다. 범주 그룹이 없으므로 `$type`은 토큰마다 적습니다.
- 색은 `srgb` 색 객체(`{ "colorSpace": "srgb", "components": [r, g, b] }`, 각 값은 0–1)로 쓰고, CSS에는 hex로 나옵니다. `alpha`가 있으면 `rgba()`로 나옵니다.
- dimension은 `{ "value": 16, "unit": "px" }`로 쓰고, CSS에는 px로 나옵니다.

## 개발

저장소 루트에서 의존성을 설치한 뒤 이 폴더에서 실행합니다.

| 명령 | 하는 일 |
|---|---|
| `pnpm build` | Style Dictionary로 `generated/tokens.css`를 만들고, tsdown으로 `dist/`에 ESM과 타입 선언을 만들며 `tokens.css`를 복사한다 |
| `pnpm lint` | oxlint로 코드를 검사한다 |
| `pnpm test` | Vitest로 테스트를 실행한다 |
| `pnpm typecheck` | `tsc`로 타입을 검사한다 |

빌드 함수는 [`scripts/build-tokens.ts`](./scripts/build-tokens.ts)의 `buildTokens(토큰 폴더)`입니다. 파일을 쓰지 않고 CSS 텍스트를 돌려주므로, 테스트는 [`scripts/fixtures/`](./scripts/fixtures/)의 fixture 토큰 폴더로 이 함수를 부릅니다. `pnpm build`는 [`scripts/build.ts`](./scripts/build.ts)에서 이 함수를 실제 `tokens/` 폴더로 실행해 결과를 git에 넣지 않는 `generated/`에 씁니다. 이어서 tsdown이 `dist/`를 비우고 빌드한 뒤 `generated/tokens.css`를 `dist/`로 복사합니다.
