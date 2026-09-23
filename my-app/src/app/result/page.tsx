import type { Metadata } from "next";
import ResultScreen from "../../components/report/result-screen";

export const metadata: Metadata = { title: "SELF-LAYERS | 결과 리포트" };

export default function ResultPage() {
  return <ResultScreen />;
}
