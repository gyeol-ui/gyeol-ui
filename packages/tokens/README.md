# @gyeol-ui/tokens

gyeol-ui의 Design Token 패키지입니다.

> 🚧 아직 npm에 배포하지 않았습니다.
>
> 지금 들어 있는 토큰은 Figma에서 내보낸 것이 아니라 **손으로 쓴 임시 씨앗 토큰**입니다. 값과 이름은 Figma 플러그인이 토큰을 내보내기 시작하면 바뀔 수 있습니다. 지금은 Primitive Token(색, 간격, 모서리)만 있고, Semantic Token과 TS 상수는 [토큰 파이프라인 스펙](https://github.com/gyeol-ui/gyeol-ui/issues/16)에서 이어서 추가합니다.

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
}
```

변수 이름은 `--gyeol-` 뒤에 토큰 경로를 `-`로 이은 것입니다(`spacing.4` → `--gyeol-spacing-4`).

| 범주 | 변수 | 공개 API |
|---|---|---|
| 간격 | `--gyeol-spacing-{1, 2, 3, 4, 6, 8}` (4px의 배수, `spacing-4` = 16px) | 예 |
| 모서리 | `--gyeol-radius-{sm, md, full}` | 예 |
| 색 | `--gyeol-color-*` | 아니요 |

`--gyeol-color-*`는 Primitive 색이라 출력은 되지만 공개 API가 아닙니다. 색은 앞으로 추가될 Semantic 변수를 쓰세요.

### TS

ESM만 제공합니다. 지금은 모노레포 확인용 자리 표시 함수만 있습니다.

```ts
import { packageName } from "@gyeol-ui/tokens";

packageName(); // "@gyeol-ui/tokens"
```

## 토큰 원본

토큰 원본은 [`tokens/`](./tokens/) 폴더의 DTCG 2025.10 JSON입니다. Figma Variables collection의 mode 하나가 파일 하나입니다.

- `tokens/primitive.json`: Primitive collection. `color`, `spacing`, `radius` 범주 그룹에 `$type`을 선언합니다.
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
