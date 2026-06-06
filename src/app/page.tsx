"use client";
import { useState } from "react";
import OverviewTab from "@/components/tabs/OverviewTab";
import SalesAnalysisTab from "@/components/tabs/SalesAnalysisTab";
import MarketingEffectTab from "@/components/tabs/MarketingEffectTab";
import InfluencerTab from "@/components/tabs/InfluencerTab";
import HourlySalesTab from "@/components/tabs/HourlySalesTab";
import DailyTextReportTab from "@/components/tabs/DailyTextReportTab";

const TABS = [
  { key: "overview", label: "통합 요약" },
  { key: "sales", label: "매출 분석" },
  { key: "influencer", label: "인플루언서 성과" },
  { key: "marketing", label: "마케팅 효과" },
  { key: "hourly", label: "시간대별 매출 관리" },
  { key: "daily", label: "일일 매출 분석" },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function Home() {
  const [tab, setTab] = useState<TabKey>("overview");

  return (
    <main className="min-h-screen bg-[#F1F5F9]">
      <header className="border-b border-[#CBD5E1] bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-black text-black">안식 매출 대시보드</h1>
            <p className="text-[11px] text-[#475569] font-semibold">ANSIC Sales & Marketing Analytics</p>
          </div>
          <p className="text-[10px] text-[#475569] tnum font-bold">v3.4</p>
        </div>
        <nav className="max-w-7xl mx-auto px-4 md:px-6 overflow-x-auto">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 md:px-5 py-3 text-sm font-extrabold whitespace-nowrap transition-colors border-b-[3px] ${
                  tab === t.key
                    ? "text-[#1E3A8A] border-[#1E3A8A]"
                    : "text-[#64748B] border-transparent hover:text-black"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {tab === "overview" && <OverviewTab />}
        {tab === "sales" && <SalesAnalysisTab />}
        {tab === "influencer" && <InfluencerTab />}
        {tab === "marketing" && <MarketingEffectTab />}
        {tab === "hourly" && <HourlySalesTab />}
        {tab === "daily" && <DailyTextReportTab />}
      </div>

      <footer className="border-t border-[#CBD5E1] mt-12 py-6 text-center text-xs text-[#64748B] font-semibold">
        ANSIC Dashboard v3 · 데이터: 안식 P&L (2026.04~) · 전체 매출표 (2024~2026.03)
      </footer>
    </main>
  );
}
