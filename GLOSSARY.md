# gyeol-ui

웹 제품을 하나의 디자인 언어로 묶기 위한 오픈소스 디자인 시스템이다. Figma에서 정의한 디자인 언어를 코드와 일치시키는 것이 핵심이다.

## 토큰

**Color Scheme**:
명암 축(light/dark). 같은 용도의 색이 Color Scheme마다 다른 값을 가진다.
_Avoid_: Mode, Theme, Dark theme, Light theme

**Design Token**:
디자인 결정 하나에 붙인 이름과 그 값의 쌍.
_Avoid_: Variable, Style

**Primitive Token**:
의미 없이 원재료만 담은 Token (예: `color.gray.900`, `spacing.4`). 이름에 용도나 브랜드 같은 의미를 담지 않는다. 색은 컴포넌트가 직접 참조하지 않고 Semantic Token을 거친다. 간격, 모서리처럼 Color Scheme과 무관한 범주는 컴포넌트가 직접 참조한다.
_Avoid_: Global token, Base token, Palette token

**Semantic Token**:
컴포넌트가 참조하는, 용도에 이름을 붙인 색 Token (예: `bg-surface`). Color Scheme마다 다른 Primitive Token이나 다른 Semantic Token을 가리킨다.
_Avoid_: Alias token, Decision token

**Role**:
Semantic Token 이름의 첫 조각으로, 색이 칠해지는 자리(배경, 글자, 테두리 등)를 나타낸다 (예: `bg-surface`의 `bg`).
_Avoid_: 접두어, Prefix

**Component Token**:
특정 컴포넌트의 특정 부위에 한정된 Token (예: 기본 버튼의 배경). Semantic Token을 가리킨다.

**공개 토큰 목록**:
공개 API인 Design Token(Semantic Token 전부와 간격, 모서리 같은 색 아닌 Primitive Token)을 나열한 목록. 토큰 패키지 밖에서는 이 목록으로만 어떤 Token이 있는지 안다.
_Avoid_: Token manifest, 토큰 인덱스

**Tailwind 테마**:
Design Token을 Tailwind 유틸리티 클래스로 쓸 수 있게 하는 설정 묶음. 이름은 Tailwind의 `@theme`에서 왔고, 브랜드별 토큰 세트(gyeol-ui가 지원하지 않는 Theme)와 무관하다.
_Avoid_: Theme

## 동기화

**Source of Truth**:
디자인 언어의 원본이 있는 곳. 이 프로젝트에서는 Figma다.

**Drift**:
Figma의 디자인 언어와 코드가 서로 어긋난 상태.

## 컴포넌트 API

**Part**:
Compound Component를 이루는 조각 하나 (예: `Select.Trigger`). Part 하나가 DOM 요소 하나에 대응한다.
_Avoid_: Subcomponent, Slot

**Compound Component**:
여러 Part를 조합해 쓰는 컴포넌트 (예: `Select.Root`, `Select.Trigger`, `Select.Popup`).
