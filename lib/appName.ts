/**
 * 앱 이름 (탭 제목·홈 화면 아이콘 이름). 같은 코드로 사이트를 둘 운영할 때
 * 홈 화면에서 헷갈리지 않게 Vercel 환경변수 APP_NAME 으로 바꾼다. 빌드할 때 정해진다.
 */
export const APP_NAME = process.env.APP_NAME || "어제랑 날씨";
