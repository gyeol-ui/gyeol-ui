# 코딩 규칙

코드를 쓰고 리뷰할 때 따르는 규칙이다. 구조와 도구의 규칙은 [아키텍처](./architecture.md)를 따른다. lint, format, typecheck가 잡는 것은 여기에 적지 않는다.

## 함수 인자

인자가 둘 이상인 함수는 아래 두 모양 중 하나로 쓴다. 호출하는 코드만 읽어도 각 값이 무엇인지 보이게 하려는 것이다.

### 주 인자 + options

주 인자 하나가 함수 이름만으로 무엇인지 분명하고, 나머지가 모두 생략할 수 있는 설정일 때 쓴다. options는 객체이고 통째로 생략할 수 있다.

```ts
function buildTokens(tokensDir: string, options: { verbose?: boolean } = {}) {}

buildTokens("tokens/");
buildTokens("tokens/", { verbose: true });
```

### 객체 하나

반드시 넘겨야 하는 값이 둘 이상이면 이름 붙은 객체 하나로 받는다.

```ts
function hasTokenAt({ tokens, path }: { tokens: DesignTokens; path: readonly string[] }) {}

hasTokenAt({ tokens: semantic, path: token.path });
```

### 정하는 방법

| 인자 | 모양 |
|---|---|
| 하나 | 그대로 `f(value)` |
| 필수 하나 + 생략할 수 있는 설정 | 주 인자 + options `f(value, options?)` |
| 필수 둘 이상 | 객체 하나 `f({ a, b })` |

### 예외

시그니처를 바깥에서 정한 콜백은 그 시그니처를 따른다. 예: `Array.prototype.map`, `reduce`의 콜백, Style Dictionary의 `FormatFn`, Vitest의 테스트 함수.
