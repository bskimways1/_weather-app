# Handoff: 어제와 오늘 날씨 비교 (모바일 웹)

## Overview
GPS로 현재 위치를 잡아 오늘 24시간 시간대별 기온 예보를 보여주고, **같은 시간대의 어제 기온과 비교**해 차이를 그래프와 수치로 표시하는 모바일 웹 서비스. 지역 검색과 즐겨찾기를 지원한다.

## About the Design Files
이 폴더의 HTML 파일은 **디자인 레퍼런스**다. 의도한 모양과 동작을 보여주는 프로토타입이며, 그대로 배포할 프로덕션 코드가 아니다. 기존 코드베이스가 없으므로 아래 권장 스택으로 새 프로젝트를 만들고 디자인을 재구현한다.

- `Weather Mockup.dc.html`: 브라우저에서 바로 열린다(같은 폴더의 `support.js` 필요). 캔버스 형태로 화면이 나열되어 있다.
- 채택된 메인 화면은 **1c**. 1a, 1b는 탈락 시안이므로 구현하지 않는다.
- 구현 대상: **1c(메인), 1d(시간대별 상세), 1e(즐겨찾기), 1f(지역 검색·추가), 1g(위치 권한)**
- 날씨 수치는 모두 목업용 가상 데이터다. 로직 클래스의 `curve()`가 만든 값이므로 실제 API로 대체한다.

## Fidelity
**High-fidelity.** 색상, 타이포, 간격, 라운드값을 그대로 재현한다. 단 1d·1e·1f·1g는 1a 시안과 같은 밝은 톤으로 그려졌으며 1c와 톤이 이미 일치하므로 그대로 쓴다. 날씨 아이콘은 단순 도형 플레이스홀더이므로 실제 아이콘 세트로 교체한다.

## 권장 스택
- **Next.js (App Router) + TypeScript + Tailwind CSS**, PWA(홈 화면 추가)
- 날씨 데이터: **Open-Meteo Forecast API** (무료, 키 불필요)
  - `GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,weather_code&past_days=1&forecast_days=1&timezone=Asia/Seoul`
  - `past_days=1`로 어제 24시간 + 오늘 24시간(총 48개) 시간별 값을 한 번에 받는다. 0~23 = 어제, 24~47 = 오늘.
  - 어제 값은 관측 기반 재분석값, 오늘 값은 예보값이다.
  - 대안: 기상청 단기예보 API(공공데이터포털). 어제 관측은 ASOS 시간자료로 따로 받아야 해서 더 복잡하다.
- 지역 검색: Open-Meteo Geocoding API (`language=ko`). 동 단위 검색·현재 위치의 행정동 이름(역삼동 등)이 필요하면 **Kakao Local API**(`coord2regioncode`, 키워드/주소 검색) 사용.
- 즐겨찾기 저장: `localStorage` (로그인 없음)
- API 응답 캐시: 위치별 10~30분

## Screens / Views
모든 화면은 기준 폭 390px(iPhone 14) 모바일. 실제 구현은 폭 100%, 최대 480px 가운데 정렬. 상단 상태바(44px)는 목업 장식이므로 구현하지 않는다(safe-area-inset 처리만).

### 1c. 메인 (현재 위치)
- 배경: 상단 영역 `oklch(0.88 0.07 70)` (따뜻한 살구색)
- **상단 영역** (padding 12px 24px 28px, 세로 gap 18px)
  - 헤더 행: 왼쪽 `⌖ 역삼동` (15px/700), 오른쪽 즐겨찾기 별 버튼 44×44 (★/☆, 20px). 탭 시 현재 위치를 즐겨찾기에 추가/해제.
  - 기온 행: 현재 기온 `120px / weight 200 / line-height 0.9 / letter-spacing -0.05em`. 오른쪽 하단 정렬로 하늘 상태(15px/600)와 `최고° / 최저°`(13px).
  - 비교 행(gap 10px): 검정 pill `어제보다 N° 높음|낮음` 또는 `어제와 같음` — 15px/700, padding 8px 14px, radius 999px, 배경 `oklch(0.22 0.01 80)`, 흰 글자. 옆에 `어제 N°` 13px.
- **하단 시트**: 배경 `oklch(0.985 0.004 80)`, radius `32px 32px 0 0`, padding 24px 20px 20px, gap 14px, 남은 높이 채움 + 세로 스크롤
  - 제목 `오늘 vs 어제` 16px/700, 오른쪽 범례(10×10 radius 3px 사각형 + 12px 텍스트): 어제 `oklch(0.85 0.01 250)`, 오늘 `oklch(0.65 0.15 50)`
  - **나란한 막대 차트**: 3시간 간격 8개(0,3,…,21시), `grid-template-columns: repeat(8,1fr)`, gap 4px, 높이 210px, 하단 정렬. 각 열 위→아래: 차이(11px/700, 증감 색), 오늘 기온(12px/700), 막대 쌍(각 폭 12px, 간격 2px, radius 4px 4px 0 0).
    - 막대 높이 목업 공식: `(기온 − 4) × 7` px. 실제로는 하루 최저/최고 범위로 정규화(최소 높이 보장, 영하 대응)할 것.
    - 현재 시각이 속한 3시간 구간은 오늘 막대 색 `oklch(0.55 0.17 45)`(진하게), 라벨 `지금` + weight 800.
  - x축 라벨 행: 상단 1px `oklch(0.9 0.006 80)` 구분선, padding-top 8px, 11px, `oklch(0.45 0.01 80)`
  - 요약문 13px/1.5: `최고 기온 어제 N° → 오늘 N° · 최저 기온 어제 N° → 오늘 N°`
  - 차트 영역 탭 → 1d로 이동(목업에는 없음, 구현 시 추가)
- **하단 탭바**: 높이 76px(+safe-area), 상단 1px `oklch(0.92 0.006 80)`, 3등분, 12px/600. `현재 위치` / `즐겨찾기` / `검색`. 활성 `oklch(0.22 0.01 80)`, 비활성 `oklch(0.6 0.01 80)`.

### 1d. 시간대별 상세 비교
- 고정 헤더(padding 8px 24px 12px, 하단 1px 구분선)
  - `‹` 뒤로(24px) + 제목 `시간대별 기온 비교` 17px/700 + 부제 `{지역} · MM/DD vs MM/DD` 12px `oklch(0.5 0.01 80)`
  - 미니 라인 그래프 342×90: 오늘 실선 3px `oklch(0.62 0.14 45)`, 어제 점선(4 4) 2px `oklch(0.62 0.03 250)`, 현재 시각 세로 점선(2 3) `oklch(0.8 0.006 80)`. y축 6°~24° 매핑(실제로는 데이터 범위로 정규화).
  - 열 머리글 `시간 / 어제 / 오늘 / 차이` 11px/600, `grid-template-columns: 52px 1fr 1fr 90px`
- 스크롤 목록: 0~23시 24행, 행 높이 48px, 하단 1px `oklch(0.94 0.006 80)`
  - 시간 13px(현재 시각 행 `지금`, weight 800, 행 배경 `oklch(0.95 0.02 70)`)
  - 어제: 14px `oklch(0.5 0.02 250)` + 하늘상태 11px
  - 오늘: 15px/700 + 하늘상태 11px/500
  - 차이: 높이 6px radius 3px 막대(폭 = |차이| × 7px) + 12px/700 수치, 둘 다 증감 색
- 진입 시 현재 시각 행이 보이도록 스크롤

### 1e. 즐겨찾기
- padding 8px 24px 24px, gap 14px
- 헤더: `즐겨찾기` 26px/700, 오른쪽 `편집` 14px/600 `oklch(0.55 0.14 45)` (편집 모드: 순서 변경·삭제)
- 카드(radius 20px, padding 16px 18px, gap 12px)
  - 첫 카드는 항상 **현재 위치**: 배경 `oklch(0.22 0.01 80)`, 흰 글자
  - 나머지: 배경 `oklch(0.95 0.006 80)`
  - 좌: 태그(`현재 위치`/`즐겨찾기`) 12px opacity .7, 지역명 17px/700, `하늘 · 최고° / 최저°` 13px opacity .75
  - 우: 현재 기온 40px/300
  - 하단: 비교 칩 `어제보다 N° 높음|낮음`/`어제와 같음` 13px/600, padding 4px 10px, radius 8px. 배경은 증감 색 14% 투명(같음은 `oklch(0.9 0.006 80)`, 첫 카드는 `oklch(1 0 0 / 0.12)`). 오른쪽 별 토글(44×32 터치영역).
- 카드 탭 → 해당 지역 메인(1c)

### 1f. 지역 검색·추가
- 검색 입력: 높이 48px, radius 14px, 배경 `oklch(0.95 0.006 80)`, 포커스 시 1.5px `oklch(0.22 0.01 80)` 테두리, 16px(iOS 확대 방지). 오른쪽 `취소` 15px.
- `검색 결과` 섹션 라벨 12px/600 `oklch(0.5 0.01 80)`
- 결과 행 높이 64px: 지역명 15px/600, 부제 `{상위 행정구역} · N° · 어제보다 +N°` 12px
  - 버튼 높이 36px, padding 0 14px, radius 10px, 13px/700: 미추가 `+ 추가`(검정 배경/흰 글자) ↔ 추가됨 `★ 추가됨`(`oklch(0.95 0.006 80)` 배경/`oklch(0.45 0.01 80)` 글자). 탭으로 토글.
- `최근 검색` 칩: padding 8px 12px, radius 999px, 13px, flex-wrap gap 8px. 최대 5개 localStorage 보관.
- 입력 디바운스 300ms, 결과 없음/오류 상태 문구 필요

### 1g. 위치 권한 (첫 진입)
- padding 44px 28px 40px. 본문 세로 가운데 정렬, gap 20px
- 아이콘: 64px 원 `oklch(0.62 0.14 45 / 0.15)` 안에 18px 원 `oklch(0.62 0.14 45)`
- 제목 28px/700/1.3: `현재 위치의<br>어제·오늘 기온을<br>시간대별로 비교합니다`
- 설명 15px/1.6 `oklch(0.45 0.01 80)`: `위치 권한을 허용하면 GPS 기준 동네의 24시간 예보와 어제 같은 시간 기온을 함께 표시합니다.`
- 하단 버튼 2개(높이 54px, radius 16px, gap 10px): `현재 위치 사용`(검정/흰 16px/700) → `navigator.geolocation.getCurrentPosition` 호출. `지역 직접 검색`(`oklch(0.95 0.006 80)`, 16px/600) → 1f.

## Interactions & Behavior
- 첫 진입: 권한 상태(`navigator.permissions.query({name:'geolocation'})`)가 granted면 1g 생략하고 1c로.
- 권한 거부/실패: 1f로 보내고 안내 문구 표시. 즐겨찾기가 있으면 첫 즐겨찾기로 메인 표시.
- Geolocation은 **HTTPS에서만** 동작(로컬은 localhost 허용).
- 메인 진입·포그라운드 복귀 시 데이터 갱신. 당겨서 새로고침 권장.
- 로딩: 기온 숫자·막대 자리에 스켈레톤. 오류: 시트 안 재시도 버튼.
- 화면 전환은 기본 페이지 전환(별도 애니메이션 정의 없음).

## 비교 로직
- `diff[h] = round(today[h]) − round(yesterday[h])` (정수 °C)
- 표기: `+3°`, `−2°`(유니코드 마이너스 U+2212), 0이면 `같음`
- 문장형: `어제보다 3° 높음` / `어제보다 2° 낮음` / `어제와 같음`
- 메인 요약은 현재 시각(정시 내림) 기준
- 색: 양수 `oklch(0.58 0.15 45)`(주황), 음수 `oklch(0.55 0.12 250)`(파랑), 0 `oklch(0.6 0.01 80)`(회색)
- 하늘상태: WMO `weather_code` → 맑음/구름조금/흐림/비/눈 등 한글 매핑. 야간(일몰 후)은 맑음 아이콘을 달 모양으로.

## State Management
- `location`: { lat, lon, name, isGps }
- `favorites`: [{ id, name, sub, lat, lon }] — localStorage `favorites`
- `recentSearches`: string[] — localStorage
- `weather[locationKey]`: { yesterday: Hourly[24], today: Hourly[24], fetchedAt }
- `Hourly`: { hour, temp, weatherCode }
- 서버 컴포넌트/Route Handler에서 API 프록시 + 캐시 권장(Kakao 키 노출 방지)

## Design Tokens
폰트: **Pretendard** (`https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css`), fallback `-apple-system, sans-serif`

색상(CSS oklch 그대로 사용 가능):
- ink `oklch(0.22 0.01 80)` — 본문, 검정 버튼
- muted `oklch(0.45 0.01 80)`, subtle `oklch(0.5 0.01 80)`, faint `oklch(0.6 0.01 80)`
- surface `oklch(0.985 0.004 80)` — 화면 배경
- fill `oklch(0.95 0.006 80)` — 카드, 입력창, 보조 버튼
- line `oklch(0.92 0.006 80)`, line-soft `oklch(0.94 0.006 80)`
- hero-bg `oklch(0.88 0.07 70)` — 1c 상단
- accent `oklch(0.62 0.14 45)`, accent-link `oklch(0.55 0.14 45)`
- today-bar `oklch(0.65 0.15 50)`, today-bar-now `oklch(0.55 0.17 45)`, yesterday-bar `oklch(0.85 0.01 250)`
- yesterday-line `oklch(0.62 0.03 250)`
- up `oklch(0.58 0.15 45)`, down `oklch(0.55 0.12 250)`
- now-row `oklch(0.95 0.02 70)`
- star-on `oklch(0.75 0.14 75)`

타입 스케일(px/weight): 120/200 · 40/300 · 28/700 · 26/700 · 17/700 · 16/700 · 15/600 · 14 · 13 · 12/600 · 11
라운드: 999(pill) · 32(시트) · 20(카드) · 16(큰 버튼) · 14(입력) · 10(작은 버튼) · 8(칩) · 4(막대 상단)
간격: 화면 좌우 24px(1c 시트 20px, 1g 28px), 섹션 gap 14–20px
터치 영역 최소 44px

## Assets
이미지 에셋 없음. 날씨 아이콘·위치·별·탭바 아이콘은 목업에서 도형/문자로 대체했으므로 아이콘 세트(예: Lucide, Meteocons)로 교체.

## Files
- `screenshots/` — 구현 대상 5개 화면 PNG(390×844 기준 2배, 780×1688): `1c-main`, `1d-hourly-detail`, `1e-favorites`, `1f-search`, `1g-location-permission`. 날씨 값은 14시 기준 가상 데이터.
- `Weather Mockup.dc.html` — 전체 화면 목업(1a·1b는 참고용, 미구현). 로직 클래스에 비교 계산·포맷·색 규칙 구현 예시 있음.
- `support.js` — 목업 실행용 런타임(구현 대상 아님)
