import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SELF-LAYERS | 나를 이해하는 시간",
  description: "108개의 질문으로 나를 움직이는 마음과 관계, 반복되는 방식과 삶의 방향을 살펴보세요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
