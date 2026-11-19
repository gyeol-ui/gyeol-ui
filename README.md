# gyeol-ui

Figma의 디자인 언어와 코드의 **결**을 맞추는 오픈소스 React 디자인 시스템입니다.

> 🚧 초기 단계입니다. 아직 배포된 패키지가 없습니다.

## 특징 (계획)

- **Figma가 원본(Source of Truth)**: 플러그인으로 Figma Variables를 DTCG 토큰으로 내보내고, PR로 코드에 반영합니다.
- **CSS 변수 기반 테마**: Theme × Color Scheme(light/dark). Tailwind CSS v4를 지원합니다.
- **Compound Component + `render` prop**: 일관된 컴포넌트 API를 제공합니다.
- **접근성 우선**: WAI-ARIA APG를 따르고, 복잡한 컴포넌트는 React Aria 위에 만듭니다.
- **모바일 웹뷰 대응**: safe-area, 가상 키보드, 뒤로가기 연동을 지원합니다.

## 개발

Node 26과 pnpm 12가 필요합니다. Node 버전은 `.node-version`에, pnpm 버전은 `package.json`의 `packageManager`에 고정되어 있습니다.

```sh
pnpm install
pnpm check
```

| 명령 | 하는 일 |
|---|---|
| `pnpm check` | 모든 패키지의 lint, format 검사, typecheck, test, build를 한 번에 실행한다 |
| `pnpm lint` | oxlint로 코드를 검사한다 |
| `pnpm format` | Prettier로 형식을 고친다 |
| `pnpm format:check` | 형식이 맞는지 검사만 한다 |
| `pnpm typecheck` | 타입을 검사한다 |
| `pnpm test` | 테스트를 실행한다 |
| `pnpm build` | 패키지를 빌드한다 |
| `pnpm learning` | 학습 노트(`docs/learning`)를 로컬 서버로 띄운다 |

명령은 Turborepo가 패키지별로 실행합니다. 패키지 하나만 실행하려면 `pnpm --filter @gyeol-ui/tokens test`처럼 씁니다. `format`과 `format:check`는 저장소 루트에서 전체 파일을 대상으로 실행합니다. Markdown 파일은 Prettier가 건드리지 않습니다.

lint 규칙은 루트의 `.oxlintrc.json`에 있습니다. `pnpm install`을 하면 pre-commit hook이 설치되어, 커밋할 때 staged 파일에 Prettier와 oxlint가 실행됩니다. 형식은 자동으로 고쳐지고, lint error가 있으면 커밋이 막힙니다.

## 문서

- [로드맵](./docs/roadmap.md)
- [아키텍처](./docs/architecture.md)
- [용어집](./GLOSSARY.md)
- [의사결정 기록 (ADR)](./docs/adr/)

## 라이선스

[MIT](./LICENSE)
