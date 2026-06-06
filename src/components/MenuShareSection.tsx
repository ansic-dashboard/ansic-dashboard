"use client";
import { useMemo, useState } from "react";
import { useMenu, menuMonths } from "@/lib/menu-data";
import { Card, SectionTitle, Badge, EmptyState } from "@/components/ui";
import { fmtKRW } from "@/lib/sales-analyzer";

export default function MenuShareSection() {
  const { data, loading } = useMenu();
  const months = useMemo(() => menuMonths(data), [data]);
  const [sel, setSel] = useState<string>("");
  const month = sel || months[0] || "";
  const m = month ? data[month] : null;

  if (loading) return <Card><EmptyState message="메뉴 데이터 불러오는 중..." /></Card>;
  if (!months.length || !m) return null;

  const total = m.foodTotal + m.cafeTotal;
  const foodPct = total ? m.foodTotal / total : 0;
  const topFood = m.식사.slice(0, 8);
  const maxFood = Math.max(...topFood.map((i) => i.amount), 1);
  const topCafe = m.카페.slice(0, 5);
  const maxCafe = Math.max(...topCafe.map((i) => i.amount), 1);
  const [y, mm] = month.split("-");

  return (
    <Card>
      <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
        <SectionTitle sub="P&L 기준 메뉴별 매출 · 식사 vs 카페 구성과 인기 메뉴">메뉴별 매출 비중</SectionTitle>
        <select value={month} onChange={(e) => setSel(e.target.value)}
          className="text-sm font-bold border-2 border-[#CBD5E1] rounded-lg px-3 py-1.5 text-black">
          {months.map((mo) => <option key={mo} value={mo}>{mo.replace("-", "년 ")}월</option>)}
        </select>
      </div>

      {/* 식사 vs 카페 비중 */}
      <div className="mb-2 flex items-center justify-between text-xs font-extrabold">
        <span className="text-[#1E3A8A]">식사 {fmtKRW(m.foodTotal)} · {Math.round(foodPct * 100)}%</span>
        <span className="text-[#475569]">카페 {fmtKRW(m.cafeTotal)} · {Math.round((1 - foodPct) * 100)}%</span>
      </div>
      <div className="flex h-5 rounded-lg overflow-hidden bg-[#E2E8F0] mb-6">
        <div style={{ width: `${foodPct * 100}%`, background: "#1E3A8A" }} />
        <div style={{ width: `${(1 - foodPct) * 100}%`, background: "#A8C5E1" }} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 식사 top */}
        <div>
          <p className="text-sm font-black text-black mb-3">식사 인기 메뉴 <span className="text-[11px] text-[#94A3B8] font-semibold">상위 {topFood.length}</span></p>
          <div className="space-y-2">
            {topFood.map((i, idx) => (
              <div key={i.name} className="flex items-center gap-2">
                <span className="text-[11px] font-black text-[#94A3B8] w-4 tnum">{idx + 1}</span>
                <span className="text-xs font-bold text-black w-28 truncate" title={i.name}>{i.name}</span>
                <div className="flex-1 h-4 bg-[#F1F5F9] rounded">
                  <div className="h-4 rounded" style={{ width: `${(i.amount / maxFood) * 100}%`, background: "#1E3A8A" }} />
                </div>
                <span className="text-[11px] font-bold tnum text-[#475569] w-16 text-right">{fmtKRW(i.amount)}</span>
              </div>
            ))}
          </div>
        </div>
        {/* 카페 top */}
        <div>
          <p className="text-sm font-black text-black mb-3">카페·음료 인기 <span className="text-[11px] text-[#94A3B8] font-semibold">상위 {topCafe.length}</span></p>
          <div className="space-y-2">
            {topCafe.map((i, idx) => (
              <div key={i.name} className="flex items-center gap-2">
                <span className="text-[11px] font-black text-[#94A3B8] w-4 tnum">{idx + 1}</span>
                <span className="text-xs font-bold text-black w-28 truncate" title={i.name}>{i.name}</span>
                <div className="flex-1 h-4 bg-[#F1F5F9] rounded">
                  <div className="h-4 rounded" style={{ width: `${(i.amount / maxCafe) * 100}%`, background: "#A8C5E1" }} />
                </div>
                <span className="text-[11px] font-bold tnum text-[#475569] w-16 text-right">{fmtKRW(i.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-[#64748B] font-semibold mt-4">※ {y}년 {parseInt(mm)}월 P&L의 메뉴별 매출 합계 기준. 식사 소계·카페 소계로 비중을 계산합니다.</p>
    </Card>
  );
}
