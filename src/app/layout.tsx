import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "안식 매출 대시보드",
  description: "안식 레스토랑 매출·마케팅 분석 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
