# 어려운 컴포넌트는 React Aria hooks 위에 만든다

Button, Checkbox, Switch, Tabs, Dialog, Menu 같은 기본 컴포넌트는 WAI-ARIA APG를 보며 직접 구현한다. Combobox, Select, DatePicker 같은 어려운 컴포넌트는 `react-aria` hooks와 `react-stately`로 구현한다. 그래야 ADR-0002의 공개 API를 완전히 통제할 수 있다. RAC 컴포넌트는 Virtualizer, DatePicker처럼 hooks만으로 조립하기 매우 어려운 경우에만 내부에서 쓰고, 그때마다 이유를 기록한다.

## 검토한 대안

- **Base UI**: API가 간결하고 Tailwind와 잘 맞는다. 하지만 (2026-11 기준) 날짜 컴포넌트와 내장 가상화가 없고, Combobox의 한국어 IME 이슈가 아직 열려 있으며, 번역 문구를 제공하지 않는다. 한국 사용자와 웹뷰라는 조건에서는 React Aria의 IME, 모바일, i18n 처리가 더 성숙하다. 대신 Base UI는 API 설계의 참고 자료로 계속 본다.
- **RAC 컴포넌트를 감싸기**: 구현은 빠르다. 하지만 `render` prop과 충돌하기 쉽다.
