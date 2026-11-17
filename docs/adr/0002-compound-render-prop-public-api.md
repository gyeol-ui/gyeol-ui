# 공개 컴포넌트 API는 Compound Component와 `render` prop으로 통일한다

모든 컴포넌트의 공개 API는 Base UI 스타일로 통일한다. Part 단위의 Compound Component로 구성하고, 다른 요소로 바꿔 렌더링할 때는 `render` prop을 쓰며, 상태는 `data-*` 속성으로 노출한다. 내부를 직접 구현했는지 React Aria로 구현했는지 사용자가 구분할 수 없어야 한다.

## 검토한 대안

- **`asChild` (Radix 방식)**: 자식 요소를 `cloneElement`로 바꿔치는 방식이라 타입 추론과 디버깅이 불투명하고, 상태를 넘겨받을 방법이 없다. 그래서 쓰지 않는다.
- **RAC 컴포넌트 API를 그대로 노출**: RAC의 slot/context 방식과 `className` 상태 함수가 공개 API로 새어 나와, 직접 구현한 컴포넌트와 일관성이 깨진다.
