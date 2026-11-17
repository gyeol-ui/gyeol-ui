# gyeol-ui

웹 제품을 하나의 디자인 언어로 묶기 위한 오픈소스 디자인 시스템이다. Figma에서 정의한 디자인 언어를 코드와 일치시키는 것이 핵심이다.

## 테마와 토큰

**Theme**:
브랜드 정체성의 단위. 색상 팔레트, 타이포그래피, 모서리 성격 등을 하나로 묶은 것이다. 처음에는 하나로 시작하고 여러 개로 늘릴 수 있다.
_Avoid_: Brand, Skin

**Color Scheme**:
같은 Theme 안의 명암 축(light/dark). Theme과 독립된 축이라, 모든 Theme은 모든 Color Scheme을 가진다.
_Avoid_: Mode, Dark theme, Light theme

**Design Token**:
디자인 결정 하나에 붙인 이름과 그 값의 쌍.
_Avoid_: Variable, Style

**Primitive Token**:
의미 없이 원재료만 담은 Token (예: `gray.900`). 컴포넌트가 직접 참조하지 않는다.
_Avoid_: Global token, Base token, Palette token

**Semantic Token**:
용도에 이름을 붙인 Token (예: `bg.surface`). Theme과 Color Scheme에 따라 다른 Primitive Token을 가리킨다.
_Avoid_: Alias token, Decision token

**Component Token**:
특정 컴포넌트의 특정 부위에 한정된 Token (예: `button.primary.bg`). Semantic Token을 가리킨다.

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
