import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SELF-LAYERS | 나를 이루는 여러 겹의 이야기",
  description: "76개의 질문으로 나를 움직이는 동기, 요즘의 상태, 관계의 반응, 반복되는 규칙, 흔들리는 순간과 삶의 방향을 겹쳐 봅니다.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
