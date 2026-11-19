# gyeol-ui

Figma의 디자인 언어와 코드의 결을 맞추는 오픈소스 React 디자인 시스템. 방향은 `docs/roadmap.md`, 구조와 도구 같은 만드는 방법의 규칙은 `docs/architecture.md`, 용어는 `GLOSSARY.md`, 의사결정 기록은 `docs/adr/`를 따른다. 작업 절차와 역할 분담은 `docs/workflow.md`를 따른다.

## Agent skills

### Issue tracker

이슈는 GitHub Issues(`gyeol-ui/gyeol-ui`)에서 `gh` CLI로 관리한다. See `docs/agents/issue-tracker.md`.

### Triage labels

기본 라벨 5개(`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`)를 그대로 쓴다. See `docs/agents/triage-labels.md`.

### Domain docs

단일 컨텍스트: 루트 `GLOSSARY.md`와 `docs/adr/`. See `docs/agents/domain.md`.
