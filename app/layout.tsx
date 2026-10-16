import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LocationProvider } from "@/components/LocationProvider";

export const metadata: Metadata = {
  title: "어제랑 날씨",
  description: "시간대별로 어제와 오늘 기온을 비교하는 날씨",
  appleWebApp: { capable: true, title: "어제랑 날씨", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6d3a6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* Pretendard: 한글 글리프를 필요한 만큼만 받는 dynamic subset */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full">
        <LocationProvider>
          <div className="mx-auto w-full max-w-[480px] min-h-dvh bg-surface">{children}</div>
        </LocationProvider>
      </body>
    </html>
  );
}
