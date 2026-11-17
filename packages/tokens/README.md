# @gyeol-ui/tokens

gyeol-ui의 Design Token 패키지입니다.

> 🚧 아직 npm에 배포하지 않았습니다. 지금은 모노레포의 빌드와 테스트를 확인하기 위한 자리 표시 함수 하나만 들어 있습니다. 실제 Design Token(CSS 변수, TS 상수)은 [로드맵](../../docs/roadmap.md)의 토큰 파이프라인 슬라이스에서 추가합니다.

## 사용법

ESM만 제공합니다.

```ts
import { packageName } from "@gyeol-ui/tokens";

packageName(); // "@gyeol-ui/tokens"
```

## 개발

저장소 루트에서 의존성을 설치한 뒤 이 폴더에서 실행합니다.

| 명령 | 하는 일 |
|---|---|
| `pnpm build` | tsdown으로 `dist/`에 ESM과 타입 선언을 만든다 |
| `pnpm test` | Vitest로 테스트를 실행한다 |
| `pnpm typecheck` | `tsc`로 타입을 검사한다 |
