# CLAUDE.md — 작업 인수인계 메모

새 세션(다른 PC, 클라우드 포함)에서 이 저장소를 이어서 작업할 때 먼저 읽는다.

@AGENTS.md

## 사용자와 일하는 방식
- **항상 한국어로** 대답한다.
- 사용자는 개발자가 아니다. 용어는 풀어서 설명하고, 결정이 필요하면 선택지와 추천을 함께 제시한다.
- 화면을 바꾸면 실제로 띄워서 확인한 뒤 보고한다. 확인하지 못한 것은 확인하지 못했다고 말한다.

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
