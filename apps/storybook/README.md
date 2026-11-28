# @gyeol-ui/storybook

gyeol-ui의 Design Token과 컴포넌트를 보여 주는 Storybook 앱입니다. 배포하지 않는 private 패키지입니다.

## 실행

`@gyeol-ui/tokens`의 빌드 결과(`tokens.css`, `tokens.json`)를 읽으므로, 처음에는 저장소 루트에서 한 번 빌드합니다.

```sh
pnpm build
pnpm --filter @gyeol-ui/storybook dev
```

http://localhost:6006 에서 봅니다.

| 스크립트 | 하는 일 |
|---|---|
| `dev` | 로컬 Storybook을 6006 포트로 띄운다 |
| `build` | 정적 Storybook을 `storybook-static/`에 만든다 |
| `test` | 토큰을 범주별로 나누는 함수의 Vitest 테스트를 돌린다 |
| `typecheck` | 타입 검사 |

## 토큰 스토리

`Tokens` 아래에 범주마다 스토리가 하나씩 있습니다.

| 스토리 | 보여 주는 Token | 미리보기 |
|---|---|---|
| Color | Semantic 색 전부(`alpha` 그룹 포함) | 견본 |
| Spacing | `spacing.*` | 해당 길이의 막대 |
| Radius | `radius.*` | 해당 반경의 상자 |

Token마다 이름(경로), CSS 변수, `getComputedStyle`로 읽은 계산된 값이 보입니다. 공개 API가 아닌 Primitive 색은 보여 주지 않습니다.

스토리는 공개 토큰 목록(`@gyeol-ui/tokens/tokens.json`)에서 생성하므로, 토큰이 추가되거나 바뀌어도 스토리를 고치지 않습니다. 범주를 정할 수 없는 토큰(모르는 `type`이나 범주)이 생기면 `src/tokens/group-tokens-by-category.helper.ts`가 실패하고, `src/tokens/public-tokens.test.ts`가 CI에서 이를 잡습니다.

## 스토리 위치

앱 안의 `src/**/*.stories.tsx`와 모든 패키지의 `packages/*/src/**/*.stories.tsx`를 모읍니다.
