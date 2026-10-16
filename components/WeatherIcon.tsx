import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { skyOf } from "@/lib/weatherCode";

/** 하늘 상태 아이콘. 밤에는 맑음·구름조금을 달 모양으로. */
export function WeatherIcon({
  code,
  isDay = true,
  size = 20,
  className,
}: {
  code: number;
  isDay?: boolean;
  size?: number;
  className?: string;
}) {
  const { icon, label } = skyOf(code);
  const map: Record<string, LucideIcon> = {
    clear: isDay ? Sun : Moon,
    partly: isDay ? CloudSun : CloudMoon,
    cloudy: Cloud,
    fog: CloudFog,
    drizzle: CloudDrizzle,
    rain: CloudRain,
    snow: CloudSnow,
    thunder: CloudLightning,
  };
  const Icon = map[icon];
  return <Icon size={size} strokeWidth={1.75} className={className} aria-label={label} />;
}
