import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "어제랑 날씨",
    short_name: "어제랑 날씨",
    description: "시간대별로 어제와 오늘 기온을 비교하는 날씨",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfaf8",
    theme_color: "#f6d3a6",
    lang: "ko",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
