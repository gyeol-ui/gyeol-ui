# Figma를 디자인 언어의 원본으로 둔다

디자인 언어의 원본은 Figma로 둔다. 직접 만든 Figma 플러그인이 Variables를 DTCG JSON으로 내보내고 GitHub에 PR을 올리며, 코드는 PR 리뷰를 거쳐서만 바뀐다. 실무 조직은 디자이너가 Figma에서 원본을 관리하므로 같은 흐름을 연습하려는 것이다. Variables REST API는 Enterprise 전용이라 Professional 요금제에서는 플러그인이 유일한 내보내기 경로다.

## 검토한 대안

- **코드(git의 DTCG JSON)가 원본**: 개발자에게는 편하다. 하지만 디자이너가 원본을 관리하는 실무 구조와 반대 방향이다.
- **양방향 동기화**: 충돌 감지와 해결 비용이 학습 가치에 비해 너무 크다.

## 결과

- 역방향 Drift 검사(Figma와 코드가 어긋나면 CI에서 경고)를 따로 만든다.
- `LIBRARY_PUBLISH` webhook은 데이터를 가져오는 수단이 아니라 "동기화가 필요하다"는 신호로만 쓴다.
