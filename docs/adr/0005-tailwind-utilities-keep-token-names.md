# Tailwind 유틸리티는 Role별 namespace에 토큰 이름을 그대로 넣는다

Tailwind 테마는 Semantic Token을 `--color-*`가 아니라 Role별 namespace(`--background-color-*`, `--text-color-*`, `--border-color-*`, `--ring-offset-color-*`)에 넣는다. 이름은 토큰 이름 그대로 쓴다. 그래서 클래스는 `bg-bg-surface`, `text-fg-default`, `border-border-default`가 되고, `text-bg-surface`처럼 Role에 맞지 않는 조합은 만들어지지 않는다. Figma 변수 이름이 클래스 안에 그대로 들어가면 Dev Mode에서 본 이름으로 바로 코드를 찾을 수 있고, Drift 검사와 MCP 코드 생성 결과를 이름 변환 규칙 없이 1:1로 맞춰 볼 수 있다. 클래스가 길고 접두어가 겹쳐 보이는 비용은 받아들인다.

## 검토한 대안

- **`--color-*`에 전체 이름(`bg-bg-surface`)**: 공식 문서에 있는 namespace다. 하지만 모든 Semantic 색이 모든 색 유틸리티에 열려 `text-bg-surface`, `bg-fg-default`가 생긴다.
- **Role별 namespace에 Role을 뗀 이름(`bg-surface`, `text-default`)**: 클래스가 짧다. 하지만 코드 속 이름이 Figma 이름과 달라지고, `ring-offset`처럼 Role을 떼면 이름이 남지 않는 토큰은 이름을 바꿔야 한다.
- **두 방식을 함께**: 같은 색을 쓰는 방법이 두 가지가 된다.

## 결과

- Role별 namespace는 Tailwind(4.3)의 소스에만 있고 공식 문서에는 없다. 그래서 Tailwind를 올렸을 때 깨질 수 있다. 모든 공개 토큰이 기대한 클래스로 나오는지 확인하는 테스트로 이 위험을 잡는다.
- Semantic 이름의 첫 조각은 Role 표에 있는 값이어야 한다. tokens 빌드가 이를 검사한다.
- 클래스 이름이 공개 API다. 방식을 바꾸려면 major 버전과 codemod가 필요하다.
