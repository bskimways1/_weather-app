# _weather-app

어제와 오늘 날씨를 시간대별로 비교해 보여주는 모바일 웹 서비스.

- GPS로 현재 위치를 잡아 오늘 24시간 기온 예보를 보여주고, 같은 시간대의 어제 기온과 비교한다.
- 지역 검색과 즐겨찾기를 지원한다.

## 화면
| 경로 | 화면 (design/) |
|---|---|
| `/` | 1c 메인: 현재 위치 또는 `?lat&lon&name…` 로 지정한 지역 |
| `/detail` | 1d 시간대별 상세 비교 |
| `/favorites` | 1e 즐겨찾기 (편집: 순서 변경·삭제) |
| `/search` | 1f 지역 검색·추가 |
| `/welcome` | 1g 첫 진입 위치 권한 안내 |

첫 진입 흐름: 위치 권한 허용됨 → 메인 / 처음 방문 → 1g / 거부됨 → 첫 즐겨찾기, 없으면 검색.

## 구조
```
app/api/weather      어제·오늘 48시간 기온 (지점 여러 개, 15분 캐시)
app/api/geo/search   지역 검색 (하루 캐시)
app/api/geo/reverse  좌표 → 동 이름 (하루 캐시)
lib/weather/         날씨 제공자 인터페이스 + Open-Meteo 구현
lib/geo/             지역 제공자: Kakao(키 있을 때) / Nominatim(기본)
lib/compare.ts       비교 규칙: 차이 계산·표기·색·척도
lib/storage.ts       즐겨찾기·최근 검색 (localStorage)
components/screens/  화면별 클라이언트 컴포넌트
```

### 기상청 API로 바꾸려면
1. `lib/weather/kma.ts` 에 `WeatherProvider` 를 구현한다. 어제 24시간(ASOS 시간자료)과 오늘 24시간(단기예보)을 받아 `DayComparison` 형식으로 돌려주면 된다. 하늘 상태는 WMO 코드로 변환해 `weatherCode` 에 넣는다.
2. `lib/weather/index.ts` 의 `providers` 에 등록한다.
3. 환경변수 `WEATHER_PROVIDER=kma` 로 전환한다.

화면 코드는 `DayComparison` 만 보므로 수정할 필요가 없다.

## 개발
```bash
npm install
npm run dev     # http://localhost:3000
npm test        # 비교 로직·파서 단위 테스트
npm run lint
npm run build
```
- 환경변수는 `.env.example` 을 `.env.local` 로 복사해 채운다.
- GPS(Geolocation)는 HTTPS 또는 localhost 에서만 동작한다. 휴대폰으로 확인하려면 Vercel 등에 배포해서 HTTPS 주소로 연다.
- 아이콘 다시 만들기: `node scripts/make-icons.mjs`

## 데이터 출처와 주의
- 날씨: [Open-Meteo](https://open-meteo.com) — **무료 API는 비상업용**. 상업 서비스로 공개하려면 유료 플랜이나 기상청 API로 바꾼다. 어제 값은 관측소 실측이 아닌 모델 분석값이다.
- 지역: Kakao 키가 없으면 [Nominatim](https://nominatim.org) (OpenStreetMap). 이용 정책상 초당 1회·자동완성 금지라서, 검색은 입력을 마치고 검색 버튼을 누를 때만 보낸다. 서비스 공개 전에는 Kakao 키를 넣는 것을 권장한다.

## 디자인
`design/` 폴더에 Claude Design 핸드오프(명세 README, 목업 HTML, 화면 스크린샷)가 있다.
