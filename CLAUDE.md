# CLAUDE.md — 작업 인수인계 메모

새 세션(다른 PC, 클라우드 포함)에서 이 저장소를 이어서 작업할 때 먼저 읽는다.

@AGENTS.md

## 사용자와 일하는 방식
- **항상 한국어로** 대답한다.
- 사용자는 개발자가 아니다. 용어는 풀어서 설명하고, 결정이 필요하면 선택지와 추천을 함께 제시한다.
- 화면을 바꾸면 실제로 띄워서 확인한 뒤 보고한다. 확인하지 못한 것은 확인하지 못했다고 말한다.
- 대화 중 새로 정한 방식(규칙·결정)이 생기면 그때 이 CLAUDE.md 에도 적는다(명세서에 해당하면 명세서도).

## 서비스 요약
- **어제랑 날씨**: 현재 위치의 오늘 시간대별 기온을 어제 같은 시각과 비교하는 모바일 웹.
- 운영 주소: https://weather-app-ashen-eight-54.vercel.app (Vercel Hobby, 비상업 시범 운영. 지인 약 8명, 1~2개월)
- 저장소: https://github.com/bskimways1/_weather-app (비공개)
- 자세한 내용: [docs/기능명세서.md](docs/기능명세서.md), [docs/서비스명세서.md](docs/서비스명세서.md), 디자인 원본 `design/`

## 작업 흐름 (반드시 지킬 것)
1. 시작 전에 `git pull` 로 최신 main 을 받는다 (회사 PC·집 PC를 오가며 작업함).
2. 작업은 **브랜치**에서 한다: `feat/…`, `fix/…`, `docs/…`.
3. 확인: `npm test` → `npx tsc --noEmit` → `npx eslint .` → `npm run build`, 화면을 바꿨으면 브라우저로 폰 너비(390px)에서 확인.
4. 사용자 확인 후 main 에 fast-forward 병합하고 `git push origin main <브랜치>`.
5. **main 에 push하면 Vercel 이 자동 배포**한다(약 30초~1분). 배포 주소에서 반영됐는지 확인한다.
6. 기능이나 구성이 바뀌면 `docs/` 의 두 명세서와 README 도 함께 고친다.

`.claude/` 폴더(로컬 실행 설정)는 커밋하지 않는다.

## 설계 원칙
- **날씨 제공자 교체 가능**: 화면은 `DayComparison` 형식만 쓴다. 기상청으로 바꿀 때는 `lib/weather/kma.ts` 에 `WeatherProvider` 를 구현하고 `lib/weather/index.ts` 에 등록, `WEATHER_PROVIDER=kma`. 절차는 서비스명세서 6장.
- **지역 제공자**: `KAKAO_REST_API_KEY` 가 있으면 Kakao, 없으면 Nominatim. Nominatim 은 이용 정책상 초당 1회·자동완성 금지 → 검색은 엔터를 눌렀을 때만, 서버에서 1.1초 간격으로 호출한다. 이 제한을 풀지 말 것.
- **위치 정보 보호**: GPS 좌표는 폰에서 `roundCoord()`(소수 3자리 ≈ 100m)로 반올림한 뒤에만 밖으로 보낸다. 현재 위치는 URL 에 좌표를 넣지 않는다(`/detail`). 새 기능도 이 규칙을 따른다.
- **비교 규칙**은 `lib/compare.ts` 한 곳에 모은다: `차이 = round(오늘) − round(어제)`, `+3°` / `−2°`(U+2212) / `같음`. 바꾸면 테스트도 고친다.
- **디자인**: 색·글꼴 토큰은 `app/globals.css` 의 `@theme` 에 있다(oklch). 새 색을 하드코딩하지 말고 토큰을 쓴다. 기준은 `design/README.md`(1c·1d·1e·1f·1g 구현, 1a·1b 미채택).
- 사용자 데이터는 서버에 저장하지 않는다(DB 없음). 즐겨찾기 등은 `lib/storage.ts` 의 localStorage.
- 코드 주석은 한국어, 주변 코드와 같은 밀도로.

## 기술 메모 (함정)
- **Next.js 16.4** + `cacheComponents` + `partialPrefetching`. 학습 데이터와 API가 다르다. 코드를 쓰기 전에 `node_modules/next/dist/docs/` 의 해당 문서를 읽는다.
  - 서버 캐시는 `'use cache'` + `cacheLife()` 를 헬퍼 함수에 건다. `fetch(…, { next: { revalidate } })`, `export const dynamic` 은 쓰지 않는다.
  - `useSearchParams` 를 쓰는 클라이언트 화면은 `page.tsx` 에서 `<Suspense>` 로 감싼다(없으면 빌드 실패).
  - localStorage 는 `useSyncExternalStore`(`lib/storage.ts`)로 읽는다. `useState` 초기값에서 읽으면 hydration 오류.
- **Windows 개발 PC**: Node 를 막 설치한 셸은 PATH 가 갱신되지 않을 수 있다. PowerShell 에서 `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')` 후 실행.
- 일부 네트워크에서 Node 의 외부 연결이 ETIMEDOUT 으로 실패해 `instrumentation.ts` 에서 연결 대기 시간을 늘려 두었다. 지우지 말 것.
- Git Bash 의 `curl --data-urlencode` 는 한글이 깨질 수 있다. 한글 검색어는 퍼센트 인코딩한 URL 로 시험한다.
- 아이콘 재생성: `node scripts/make-icons.mjs`.

## 알려진 제한 / 다음 할 일 후보
- 어제 기온은 Open-Meteo 모델 분석값(실측 아님) → 상업 공개 시 기상청 API 로 전환.
- Kakao 연동 코드는 키가 없어 실제로 검증하지 않았다.
- 오프라인(서비스 워커) 없음, 즐겨찾기 기기 간 동기화 없음.
- 상업 서비스로 공개하려면 Vercel Pro, 기상청 또는 Open-Meteo 유료, Kakao 키가 필요하다.

## 실시간 버전 (`feat/realtime` 브랜치, 진행 중)
- 목표: 기능은 그대로, 지금 기온을 기상청 AWS 관측(1분 단위)으로 실시간 반영. 어제는 관측값, 오늘 남은 시간은 단기예보.
- 삼성 날씨 앱과 직접 연동은 불가(웹은 다른 앱 데이터를 못 읽고, 공개 API 없음) → 기상청 데이터로 대신한다.
- **운영 방식(A안)**: main(지금 버전)은 그대로 두고, 같은 저장소로 Vercel 프로젝트를 하나 더 만들어 `feat/realtime` 을 그 프로젝트의 운영 브랜치로 쓴다. 주소가 2개(지금 버전 3명 / 새 버전 나머지). 즐겨찾기는 사이트별로 따로 저장된다. 미리보기 주소는 Vercel 로그인이 필요해 친구에게 줄 수 없다.
  - 실시간 사이트: Vercel 프로젝트 `weather-app-83nb` → https://weather-app-83nb.vercel.app (2026-11-05 생성). Settings → Environments → Production 의 Branch Tracking = `feat/realtime` 이라 **이 브랜치에 push하면 실시간 사이트가 자동 배포**된다. 환경변수: `WEATHER_PROVIDER=kma`, `KMA_API_KEY`, `APP_NAME=어제랑 날씨 Live`.
  - `vercel.json` 의 `regions: ["icn1"]`(서울)로 서버 지역을 정했다.
  - 사용자는 Vercel 계정에 2단계 로그인(2FA)을 설정했다. Vercel 로그인·인증 코드 입력은 사용자가 직접 한다.
- **데이터**: 기상청 API허브(apihub.kma.go.kr) 인증키 하나로 모두 해결(일반회원 하루 20,000건). 환경변수 `KMA_API_KEY`(로컬은 `.env.local`). 공공데이터포털 키는 쓰지 않는다.
  - 활용신청 완료(2026-11-05, 사용기간 2028-11-05까지): AWS 매분자료 `nph-aws2_min`, 지점정보 `stn_inf.php`, 초단기실황·초단기예보·단기예보(`VilageFcstInfoService_2.0`).
  - 시험 결과: 전체 지점 현재값 1회 72KB·0.7초(737지점, 1~2분 지연), 1지점 하루치 1,440행 133KB·3초, 단기예보 JSON 정상. 매분자료 응답의 한글 주석은 깨지지만 숫자 행은 정상(지점정보는 EUC-KR).
  - 가까운 관측소끼리도 기온이 2°C 넘게 차이 날 수 있다(예: 오전동 12.9° / 안양 15.1°).
- **지금 기온 = 거리 가중 평균**(사용자 결정): 반경 10km 안 관측소 중 값이 있는 가까운 3곳을 1/거리 비율로 섞는다. 10km 안에 없으면 20km 안 가장 가까운 1곳, 그것도 없으면(해외 등) Open-Meteo. 어제·오늘 지난 시각도 같은 방식이어야 공정하다.
- 구현: `lib/weather/kma-parse.ts`(해석·계산, 테스트) + `lib/weather/kma.ts`(호출·캐시·조립), `WEATHER_PROVIDER=kma`. 하늘 상태·낮밤은 Open-Meteo 값(관측소에 구름 정보 없음), 비·눈은 실제 강수 관측으로 바로잡는다. 기상청 호출이 실패하면 Open-Meteo 로 대신 보여준다.
  - **서버리스 함정**: 기본 `'use cache'` 는 서버 메모리라 Vercel 에서는 요청마다 사라진다(배포 후 매 호출 3~7초, 기상청 호출 폭증 확인). 그래서 공유해야 하는 값은 `'use cache: remote'`(Vercel Runtime Cache)에 둔다. Hobby 무료 한도 읽기 월 100만·쓰기 20만(8KB 단위), 넘으면 과금 없이 그달 정지. 읽기 수를 줄이려고 큰 값(전국 관측소 목록)은 remote 에 두지 않고, 지점별 근처 관측소·관측소별 하루 정시값처럼 작게 나눠 저장한다.
  - 캐시: 최신 관측(전국) 1분, 어제 같은 분 하루, 관측소별 정시값(어제 하루·오늘 정시마다), 단기예보 1시간, 초단기예보 몇 분, Open-Meteo 15분. `/api/weather` 는 kma 일 때 1분.
- 화면(3단계): 지금 기온·"어제보다 N°"는 `live`(지금 관측 vs 어제 같은 분 관측)로, 시간대 막대·표는 정시 값으로 비교한다(`lib/compare.ts` 의 `currentTemp`·`nowDiff`·`isForecastHour`). 메인에 "● 실시간 · HH:MM 관측 · ○○ 등 관측소 N곳 평균", 오늘 예보 막대는 빗금(`.bar-forecast`), 상세는 "N시부터는 기상청 예보" 구분 줄과 예보 구간을 흐린 선으로. 실시간 자료가 있으면 화면이 켜진 동안 1분마다 다시 받는다(`lib/useWeather.ts`).
