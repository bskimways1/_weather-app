# _weather-app

어제와 오늘 날씨를 시간대별로 비교해 보여주는 모바일 웹 서비스.

- GPS로 현재 위치를 잡아 오늘 24시간 기온 예보를 보여주고, 같은 시간대의 어제 기온과 비교한다.
- 지역 검색과 즐겨찾기를 지원한다.

## 스택
- Next.js (App Router) + TypeScript + Tailwind CSS, PWA
- 날씨 데이터: Open-Meteo (`past_days=1`로 어제+오늘 48시간). 기상청 API로 교체할 수 있도록 `lib/weather/` 에 제공자 인터페이스를 둔다.
- 즐겨찾기·최근 검색: `localStorage`

## 개발
```bash
npm install
npm run dev
```
http://localhost:3000 에서 확인. GPS(Geolocation)는 HTTPS 또는 localhost에서만 동작한다.

## 디자인
`design/` 폴더에 Claude Design 핸드오프(명세 README, 목업 HTML, 화면 스크린샷)가 있다. 구현 대상 화면은 1c·1d·1e·1f·1g.
