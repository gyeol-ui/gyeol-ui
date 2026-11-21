# @gyeol-ui/tailwind

gyeol-ui의 Design Token을 Tailwind CSS v4 클래스로 쓰게 하는 테마 패키지입니다.

> 🚧 아직 npm에 배포하지 않았습니다.

## 사용법

Tailwind CSS v4(`tailwindcss` `^4`)가 필요합니다. CSS 진입 파일에서 Tailwind 다음에 import합니다.

```css
@import "tailwindcss";
@import "@gyeol-ui/tailwind";
```

이 두 줄로 토큰 CSS 변수(`--gyeol-*`)와 토큰 클래스를 함께 씁니다. `@gyeol-ui/tokens/tokens.css`는 이 패키지가 import하므로 따로 import하지 않습니다.

```html
<div class="bg-bg-surface text-fg-default border border-border-default p-4 rounded-md">
  …
</div>
```

## 클래스 이름 규칙

클래스 이름은 Tailwind 유틸리티 접두어 뒤에 **토큰 이름을 그대로** 붙인 것입니다. Figma Dev Mode에서 본 변수 이름(`bg-surface`)으로 코드를 쓰고 찾을 수 있습니다. 이유는 [ADR-0005](../../docs/adr/0005-tailwind-utilities-keep-token-names.md)에 있습니다.

### 색: Role별로 쓸 수 있는 유틸리티가 정해져 있다

Semantic 색 토큰 이름의 첫 조각은 Role(색이 칠해지는 자리)입니다. 토큰은 자기 Role에 맞는 유틸리티에서만 클래스가 됩니다.

| Role | 토큰 예 | 클래스 | 값 |
|---|---|---|---|
| `bg` | `bg-surface` | `bg-bg-surface` | `background-color: var(--gyeol-bg-surface)` |
| `fg` | `fg-default` | `text-fg-default` | `color: var(--gyeol-fg-default)` |
| `border` | `border-default` | `border-border-default`, `divide-border-default` | `border-color: var(--gyeol-border-default)` |
| `ring-offset` | `ring-offset` | `ring-offset-ring-offset` | `--tw-ring-offset-color: var(--gyeol-ring-offset)` |
| `alpha` 그룹 | `alpha.90` | `bg-alpha-90` | `background-color: var(--gyeol-alpha-90)` |

Role에 맞지 않는 조합(`text-bg-surface`, `bg-fg-default`)은 클래스가 없습니다. 배경색을 글자에 칠하는 실수를 막기 위해서입니다. `alpha` 그룹은 `bg-surface`의 투명도 단계이므로 배경에만 씁니다.

투명도 수식어(`bg-bg-surface/50`)는 `color-mix(in oklab, …)`로 나옵니다.

### 간격과 모서리

간격은 `spacing` 토큰의 단계 이름(4px의 배수)을, 모서리는 `radius` 토큰의 이름을 씁니다.

| 토큰 | 클래스 예 | 값 |
|---|---|---|
| `spacing.4` | `p-4`, `m-4`, `gap-4`, `w-4` | `var(--gyeol-spacing-4)` (16px) |
| `radius.md` | `rounded-md` | `border-radius: var(--gyeol-radius-md)` |

`p-0`처럼 `0`은 토큰이 아니지만 `0px`로 들어 있습니다.

## 토큰 밖의 값은 없습니다

토큰이 있는 범주(색, 간격, 모서리)에서는 Tailwind 기본값을 비웠습니다. 디자인 언어 밖의 값을 실수로 쓰지 않게 하려는 것입니다.

- 기본 팔레트 색이 없습니다: `bg-red-500`, `bg-white`, `text-black` 등.
- 토큰에 없는 간격 단계가 없습니다: `spacing.5` 토큰이 없으므로 `p-5`도 없습니다.
- 토큰에 없는 모서리가 없습니다: `rounded-lg` 등.

이런 클래스를 쓰면 Tailwind가 CSS를 만들지 않으므로 스타일이 적용되지 않습니다. 필요한 값이 없으면 Figma에 토큰을 추가하도록 디자이너와 이야기하세요.

다음은 Tailwind 동작상 남아 있습니다. 나중에 lint 규칙으로 막는 것을 검토합니다.

- 임의값: `p-[13px]`, `bg-[#fff]`
- 키워드: `bg-transparent`, `bg-current`, `w-full`, `p-px`

글자 크기, 그림자, breakpoint, 폰트는 아직 토큰이 없어 Tailwind 기본값을 그대로 씁니다.

## 개발

저장소 루트에서 의존성을 설치한 뒤 이 폴더에서 실행합니다. `@gyeol-ui/tokens`의 빌드 결과를 읽으므로, 저장소 루트의 `pnpm build`나 `pnpm test`처럼 turbo로 실행하면 tokens가 먼저 빌드됩니다.

| 명령 | 하는 일 |
|---|---|
| `pnpm build` | `@gyeol-ui/tokens/tokens.json`(공개 토큰 목록)으로 `dist/theme.css`를 만들고 publint로 패키지 모양을 검사한다 |
| `pnpm lint` | oxlint로 코드를 검사한다 |
| `pnpm test` | Vitest로 테스트를 실행한다 |
| `pnpm typecheck` | `tsc`로 타입을 검사한다 |

`dist/theme.css`는 손으로 쓰지 않고 생성합니다. 토큰이 바뀌면 다시 빌드하는 것만으로 클래스가 따라옵니다.

- 테마 텍스트를 쓰는 함수는 [`scripts/format-theme.ts`](./scripts/format-theme.ts)의 `formatTheme(공개 토큰 목록)`입니다. Role과 Tailwind namespace의 대응은 이 파일에만 있습니다. 대응을 정할 수 없는 토큰(표에 없는 Role이나 범주)이 있으면 그 토큰 경로를 모두 담아 실패합니다.
- [`scripts/build.ts`](./scripts/build.ts)가 이 함수를 실제 공개 토큰 목록으로 실행해 `dist/theme.css`에 씁니다.
- 테스트([`scripts/format-theme.test.ts`](./scripts/format-theme.test.ts))는 생성된 텍스트를 비교하지 않고, [`entry.css`](./entry.css)(배포하지 않는 진입 CSS, 위의 import 두 줄)와 함께 `@tailwindcss/node`로 컴파일해 어떤 클래스가 어떤 CSS로 나오는지 확인합니다. 실제 공개 토큰 목록의 모든 토큰도 확인하므로, Tailwind를 올렸을 때 Role별 namespace 동작이 깨지면 테스트가 실패합니다.
