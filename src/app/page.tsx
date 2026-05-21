"use client";
import { useState } from "react";
import OverviewTab from "@/components/tabs/OverviewTab";
import SalesAnalysisTab from "@/components/tabs/SalesAnalysisTab";
import MarketingEffectTab from "@/components/tabs/MarketingEffectTab";
import InfluencerTab from "@/components/tabs/InfluencerTab";

const TABS = [
  { key: "overview", label: "통합 요약" },
  { key: "sales", label: "매출 분석" },
  { key: "marketing", label: "마케팅 효과" },
  { key: "influencer", label: "인플루언서" },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function Home() {
  const [tab, setTab] = useState<TabKey>("overview");

  return (
    <main className="min-h-screen bg-white">
      {/* 상단 헤더 */}
      <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-extrabold text-[#0F172A]">안식 매출 대시보드</h1>
            <p className="text-[11px] text-[#475569]">ANSIC Sales & Marketing Analytics</p>
          </div>
          <p className="text-[10px] text-[#475569] tnum">v2.0</p>
        </div>
        {/* 탭 네비 */}
        <nav className="max-w-7xl mx-auto px-4 md:px-6 overflow-x-auto">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 md:px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  tab === t.key
                    ? "text-[#1E40AF] border-[#1E40AF]"
                    : "text-[#475569] border-transparent hover:text-[#0F172A]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {tab === "overview" && <OverviewTab />}
        {tab === "sales" && <SalesAnalysisTab />}
        {tab === "marketing" && <MarketingEffectTab />}
        {tab === "influencer" && <InfluencerTab />}
      </div>

      <footer className="border-t border-[#E2E8F0] mt-12 py-6 text-center text-xs text-[#475569]">
        ANSIC Dashboard · 데이터 출처: 안식 P&L (2026.04~) · 안식 전체 매출표 (2024~2026.03)
      </footer>
    </main>
  );
}
