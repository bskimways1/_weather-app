# _weather-app

어제와 오늘 날씨를 시간대별로 비교해 보여주는 모바일 웹 서비스.

- GPS로 현재 위치를 잡아 오늘 24시간 기온 예보를 보여주고, 같은 시간대의 어제 기온과 비교한다.
- 지역 검색과 즐겨찾기를 지원한다.

서비스 주소
- 기본 (main 브랜치, Open-Meteo): https://weather-app-ashen-eight-54.vercel.app
- 실시간 Live (`feat/realtime` 브랜치, 기상청 관측): https://eojerang-live.vercel.app

문서: [기능명세서](docs/기능명세서.md) · [서비스명세서](docs/서비스명세서.md)

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
lib/weather/         날씨 제공자 인터페이스 + Open-Meteo / 기상청(kma) 구현
lib/geo/             지역 제공자: Kakao(키 있을 때) / Nominatim(기본)
lib/compare.ts       비교 규칙: 차이 계산·표기·색·척도
lib/storage.ts       즐겨찾기·최근 검색 (localStorage)
components/screens/  화면별 클라이언트 컴포넌트
```

### 기상청(실시간) 제공자
`WEATHER_PROVIDER=kma` 와 `KMA_API_KEY`(기상청 API허브 인증키)를 넣으면 기상청 데이터를 쓴다(`lib/weather/kma.ts`).
- 지금 기온: 근처 AWS 관측소 3곳의 1분 관측을 거리 가중 평균, 1분마다 갱신
- 어제·오늘 지난 시각: 같은 관측소들의 정시 관측, 오늘 남은 시각: 초단기·단기예보
- 서버리스(Vercel)에서는 메모리 캐시가 요청마다 사라지므로 공유할 값은 `'use cache: remote'` 로 저장한다.

자세한 내용은 [서비스명세서](docs/서비스명세서.md) 6.1장, [기능명세서](docs/기능명세서.md) 9장.

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
- 날씨(Live): [기상청 API허브](https://apihub.kma.go.kr) — 무료, 일반회원 하루 20,000건, 공공누리. 관측값은 실측이다.
- 지역: Kakao 키가 없으면 [Nominatim](https://nominatim.org) (OpenStreetMap). 이용 정책상 초당 1회·자동완성 금지라서, 검색은 입력을 마치고 검색 버튼을 누를 때만 보낸다. 서비스 공개 전에는 Kakao 키를 넣는 것을 권장한다.

## 디자인
`design/` 폴더에 Claude Design 핸드오프(명세 README, 목업 HTML, 화면 스크린샷)가 있다.
