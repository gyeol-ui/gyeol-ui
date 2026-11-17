# gyeol-ui

Figma의 디자인 언어와 코드의 **결**을 맞추는 오픈소스 React 디자인 시스템입니다.

> 🚧 초기 단계입니다. 아직 배포된 패키지가 없습니다.

## 특징 (계획)

- **Figma가 원본(Source of Truth)**: 플러그인으로 Figma Variables를 DTCG 토큰으로 내보내고, PR로 코드에 반영합니다.
- **CSS 변수 기반 테마**: Theme × Color Scheme(light/dark). Tailwind CSS v4를 지원합니다.
- **Compound Component + `render` prop**: 일관된 컴포넌트 API를 제공합니다.
- **접근성 우선**: WAI-ARIA APG를 따르고, 복잡한 컴포넌트는 React Aria 위에 만듭니다.
- **모바일 웹뷰 대응**: safe-area, 가상 키보드, 뒤로가기 연동을 지원합니다.

## 문서

- [로드맵](./docs/roadmap.md)
- [용어집](./GLOSSARY.md)
- [의사결정 기록 (ADR)](./docs/adr/)

## 라이선스

[MIT](./LICENSE)
