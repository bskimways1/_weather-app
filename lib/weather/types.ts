/** 한 시각의 날씨. hour 는 그 지역 현지 시각 0~23. */
export type Hourly = {
  hour: number;
  temp: number;
  /** WMO weather code (Open-Meteo 기준). 다른 제공자는 이 코드로 변환해서 넣는다. */
  weatherCode: number;
  isDay: boolean;
};

/** 어제/오늘 같은 시각을 비교하기 위한 48시간 묶음. 서버→클라이언트 전달 형식. */
export type DayComparison = {
  lat: number;
  lon: number;
  /** 현지 날짜 YYYY-MM-DD */
  yesterdayDate: string;
  todayDate: string;
  /** UTC 대비 현지 오프셋(초). 현재 시각 계산용 */
  utcOffsetSeconds: number;
  yesterday: Hourly[]; // 길이 24, index = hour
  today: Hourly[]; // 길이 24, index = hour
  fetchedAt: number;
  /** 데이터 출처 표기용 */
  source: string;
  /** 실시간 관측(기상청 AWS). 관측을 못 쓰는 제공자·지역이면 없음 */
  live?: LiveObservation;
  /** 오늘 0시~이 시각까지는 관측값, 이후는 예보. 없으면 오늘은 전부 예보 */
  observedThroughHour?: number;
};

/** 근처 관측소 값을 거리 가중 평균한 지금 기온 */
export type LiveObservation = {
  temp: number;
  /** 관측 시각, 현지 "YYYY-MM-DDTHH:mm" */
  observedAt: string;
  /** 어제 같은 분의 관측 기온 (없으면 null) */
  yesterdayTemp: number | null;
  /** 평균에 쓴 관측소. 가까운 순 */
  stations: { name: string; km: number }[];
};

export type LatLon = { lat: number; lon: number };

/**
 * 날씨 데이터 제공자. 기상청 등 다른 API 로 바꿀 때는 이 인터페이스를 구현한 파일을
 * lib/weather/ 에 추가하고 lib/weather/index.ts 에 등록하면 된다.
 */
export interface WeatherProvider {
  id: string;
  /** 여러 지점을 한 번에 조회. 결과 순서는 입력 순서와 같다. */
  getComparisons(points: LatLon[]): Promise<DayComparison[]>;
}
