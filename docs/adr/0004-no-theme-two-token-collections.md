# Theme을 지원하지 않고, 토큰은 Primitive와 Semantic 두 collection으로 둔다

브랜드별 토큰 세트(Theme)를 지원하지 않는다. 명암 축은 Color Scheme(light/dark) 하나뿐이다. Figma Variables는 `Primitive`(mode 1개, 실제 값)와 `Semantic`(mode = Color Scheme, Primitive나 다른 Semantic Token을 가리킴) 두 collection으로 둔다. 토큰 원본은 collection의 mode 하나를 DTCG 파일 하나로 두고, CSS에는 Primitive를 `:root`에, Semantic을 Primitive를 `var()`로 가리키는 Color Scheme 블록에 출력한다.

이 프로젝트의 목적은 사내 디자인 시스템을 연습하는 것이고, 사내 디자인 시스템은 Theme이 하나일 가능성이 높다. Theme을 지원하려면 collection이 하나 더 필요하고(Theme마다 light/dark 배합을 모두 담는 표), Semantic이 기계적 스위치가 되며, 검증 규칙과 CSS 블록 종류도 늘어난다. 쓰지 않을 축에 그 비용을 낼 이유가 없다.

## 검토한 대안

- **세 collection(팔레트 / Theme / Semantic 스위치)**: shadcn/ui Figma kit의 구조다. Theme마다 dark 배합을 따로 조정할 수 있다. Theme이 하나뿐이면 얻는 것 없이 표와 검증 규칙만 늘어난다.
- **두 collection에서 Primitive의 mode를 Theme으로 두기**: Primitive에 `brand` 같은 의미 있는 이름이 들어가야 한다.
- **DTCG Resolver(`.resolver.json`)로 조합을 정의**: Style Dictionary(5.8)가 지원하지 않는다(이슈 #1590). 조합할 축이 Color Scheme 하나뿐이라 필요성도 작다.

## 결과

- Theme을 나중에 지원하려면 collection 구조, 파일 배치, CSS 블록, 검증 규칙을 다시 설계해야 한다.
- 사용자가 색을 바꾸는 방법(Semantic 변수 덮어쓰기 등)은 아직 정하지 않았다. 나중에 검토한다.
- Primitive 색 변수도 CSS에 나온다. 공개 API는 아니며, 컴포넌트가 직접 쓰지 못하게 하는 것은 나중에 lint로 막는다.
- Style Dictionary가 "filtered out token references" 경고를 출력한다. 의도한 동작이다.
- Figma 플러그인(Figma ①)은 같은 레이아웃으로 내보내야 한다.
