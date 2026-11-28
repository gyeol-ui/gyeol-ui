# 코딩 규칙

코드를 쓰고 리뷰할 때 따르는 규칙이다. 구조와 도구의 규칙은 [아키텍처](./architecture.md)를 따른다. lint, format, typecheck가 잡는 것은 여기에 적지 않는다.

대상은 `packages/`, `apps/`와 저장소 루트 `scripts/`의 코드다. 학습 노트의 공통 스크립트(`docs/learning/`)는 대상이 아니다.

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

## 함수를 만드는 함수

함수를 돌려주는 함수는 이름을 `create`로 시작한다. 호출하는 코드만 읽어도 돌려받는 것이 값이 아니라 함수라는 것이 보이게 하려는 것이다.

```ts
const createColorSchemeFormat =
  ({ colorScheme, selectors }: { … }): FormatFn =>
  ({ dictionary }) => …;
```

바깥에서 함수를 요구할 때(예: Style Dictionary의 format)만 함수를 만든다. 인자를 미리 받아 둘 이유가 없으면 커링하지 않고 인자를 한 번에 받는 함수로 쓴다. 콜백 자리에서는 화살표 함수로 감싸 부른다.

```ts
// 하지 않는다: map에 넘기려고 dictionary를 먼저 받는다
dictionary.allTokens.map(withColorMix(dictionary));

// 한다
dictionary.allTokens.map((token) => applyColorMix({ token, dictionary }));
```

## 함수 이름

함수 이름은 하는 일을 드러내는 동사로 시작한다. `colorMix`처럼 명사만 쓰거나 `aliasRefOf`처럼 `…Of`로 끝내지 않는다. 호출하는 코드에서 함수 이름과 값 이름이 헷갈리지 않고, 이름만 보고 함수가 무엇을 하는지 알게 하려는 것이다.

```ts
// 하지 않는다
const aliasRefOf = (token: Token): string | undefined => …;
function colorMix({ variable, alpha }: { … }): string {}

// 한다
const findAliasRef = (token: Token): string | undefined => …;
function formatColorMix({ variable, alpha }: { … }): string {}
```

모든 함수를 `get`으로 시작하지 않는다. `get`은 이미 있는 값을 그대로 꺼낼 때만 쓰고, 값을 만들거나 바꾸는 함수는 그 일을 드러내는 동사를 고른다.

| 하는 일 | 동사 | 예 |
|---|---|---|
| 없을 수도 있는 것을 찾는다 | `find` | `findAliasRef` |
| 여러 개를 모으거나 나열한다 | `collect`, `list` | `collectTokens`, `listReferences` |
| 문자열을 읽어 값으로 푼다 | `parse` | `parseReferencePath` |
| 값을 출력용 문자열로 쓴다 | `format` | `formatColorMix` |
| 한 모양을 다른 모양으로 바꾼다 | `to` | `toCssName`, `toViolation` |
| 경로나 참조를 실제 위치로 푼다 | `resolve` | `resolveTokenFilePaths` |
| 파일이나 원본에서 읽는다 | `read` | `readTokenFile` |
| 규칙을 검사해 위반을 돌려준다 | `check` | `checkKebabCase` |
| 참거짓을 돌려준다 | `is`, `has` | `isReference` |
| 함수를 돌려준다 | `create` | 아래 "함수를 만드는 함수" |

## 테스트

테스트는 Vitest로 쓰고, 소스 옆에 `*.test.ts`로 둔다.

### 구조

`describe`로 대상(함수나 모듈 이름)을 묶고, `it` 하나에 동작 하나를 쓴다. `it` 본문은 `// given`, `// when`, `// then` 주석으로 나눈다.

- 입력을 호출 안에 바로 쓸 수 있으면 `// given, when` 한 줄로 합치고 입력을 변수로 빼지 않는다.
- 임시 폴더를 만드는 것처럼 준비 과정이 있으면 `// given`을 따로 둔다.
- 준비할 것이 전혀 없으면 `// given`을 생략한다.

```ts
describe("resolveTokenFilePaths", () => {
  it("Primitive 하나와 Color Scheme마다 Semantic 하나", () => {
    // given, when
    const paths = resolveTokenFilePaths("/repo/tokens");

    // then
    expect(paths).toEqual({ … });
  });
});
```

### helper와 입출력 문서

입력을 받아 값을 돌려주는 순수 변환 함수는 `<모듈>.helper.ts`로 빼고, `<모듈>.helper.test.ts`에서 입력과 출력을 그대로 보여 준다. 이 테스트는 함수가 무엇을 무엇으로 바꾸는지 보여 주는 문서다. 기대값은 코드로 계산하지 않고 손으로 쓴 결과를 적는다.

모듈 자체의 테스트(`<모듈>.test.ts`)는 공개 함수의 바깥 동작만 본다.

### 테스트 전용 함수

여러 테스트가 쓰는 준비·검사 함수(컴파일해 보기, 결과에서 규칙 찾기 등)는 테스트 파일 안에 두지 않고, 테스트하는 코드 옆의 `__test__/` 폴더에 파일로 뺀다. 테스트를 읽는 사람이 그 함수가 무엇을 받아 무엇을 돌려주는지 따로 확인할 수 있게 하려는 것이다.

- 함수마다 JSDoc에 입력과 출력을 `@example`로 적는다.
- 테스트 전용 함수도 옆에 `*.test.ts`를 둔다. 순수 함수는 helper처럼 손으로 쓴 입력과 출력을 적고, 파일이나 외부 도구를 쓰는 함수는 그 함수가 맡은 일(예: 넘긴 입력이 쓰인다, 임시 파일을 지운다)만 확인한다.
- `__test__/`는 배포하지 않는다. 배포 코드에서 import하지 않는다.
