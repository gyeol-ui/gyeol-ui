/**
 * 모노레포의 build, test, typecheck가 도는지 확인하기 위한 자리 표시 함수다.
 * 토큰 파이프라인 슬라이스에서 실제 Design Token export로 바뀐다.
 */
export function packageName(): string {
  return "@gyeol-ui/tokens";
}
