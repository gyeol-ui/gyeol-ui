# 학습 후보

설계 인터뷰와 리뷰에서 나온, 학습 노트로 옮길 수 있는 주제 목록이다. 절차는 [워크플로우](../workflow.md)를 따른다.

- oxlint의 규칙 범주(`correctness`, `suspicious`, `pedantic`, `style`, `perf`, `restriction`, `nursery`)와 범주별로 켜고 끄는 기준
- DTCG 2025.10의 색 객체 형식과 Resolver 모듈
- Style Dictionary가 Resolver를 지원하지 않을 때의 다중 빌드 방식
- squash merge와 release-please의 관계
- npm trusted publishing(OIDC)
- TypeScript 7 네이티브 컴파일러와 `isolatedDeclarations`
- 내부 패키지를 소스가 아닌 빌드 결과로 참조하는 이유
- GitHub Actions `concurrency`의 group 개념(실행 1개와 대기 1개 규칙), `cancel-in-progress`, PR과 `main` push에서 그룹을 다르게 나누는 이유
- 조건으로 건너뛴(skipped) job이 필수 검사에서 통과로 처리되는 문제와, PR 제목 검사를 별도 워크플로로 나눈 이유
