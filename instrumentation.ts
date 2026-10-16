/**
 * 서버 시작 시 1회 실행.
 * Node 의 IPv6/IPv4 자동 선택(happy eyeballs) 기본 대기 시간(250ms)이 짧아
 * 일부 네트워크에서 외부 API 연결이 ETIMEDOUT 으로 실패한다. 대기 시간을 늘린다.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const net = await import("node:net");
    net.setDefaultAutoSelectFamilyAttemptTimeout(2000);
  }
}
