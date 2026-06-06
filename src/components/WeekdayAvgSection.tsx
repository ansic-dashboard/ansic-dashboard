"use client";
import { useMemo, useState } from "react";
import type { DailySales } from "@/types";
import { Card, SectionTitle, ProgressBar } from "@/components/ui";
import { fmtKRW } from "@/lib/sales-analyzer";
import { WEEKDAY_KR, weekdayAvgTable } from "@/lib/feature-analytics";

const SCOPES: { key: string; label: string; year?: number }[] = [
  { key: "all", label: "전체" },
  { key: "2026", label: "2026년", year: 2026 },
  { key: "2025", label: "2025년", year: 2025 },
  { key: "2024", label: "2024년", year: 2024 },
];

export default function WeekdayAvgSection({ data }: { data: DailySales[] }) {
  const [scope, setScope] = useState("all");

  const rows = useMemo(() => {
    const yr = SCOPES.find((s) => s.key === scope)?.year;
    const t = weekdayAvgTable(data, yr); // 0=일 ~ 6=토
    // 월~일 순서로 재배열 (월화수목금토일)
    const order = [1, 2, 3, 4, 5, 6, 0];
    return order.map((w) => ({ w, a: t[w] }));
  }, [data, scope]);

  const maxRev = Math.max(...rows.map((r) => r.a.revenue), 1);

  return (
    <Card>
      <SectionTitle sub="요일마다 매출·팀·인원·객단가와 점심/저녁 구성 비교">요일별 평균</SectionTitle>

      <div className="flex flex-wrap gap-2 mb-4">
        {SCOPES.map((s) => (
          <button key={s.key} onClick={() => setScope(s.key)}
            className={`text-xs font-extrabold px-3 py-1.5 rounded-full border-2 transition-colors ${scope === s.key ? "bg-[#1E3A8A] border-[#1E3A8A] text-white" : "bg-white border-[#CBD5E1] text-[#475569]"}`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-[#CBD5E1] text-[#475569] text-xs">
              <th className="text-left py-2 font-extrabold">요일</th>
              <th className="text-right py-2 px-2 font-extrabold">평균 매출</th>
              <th className="text-right py-2 px-2 font-extrabold">팀</th>
              <th className="text-right py-2 px-2 font-extrabold">인원</th>
              <th className="text-right py-2 px-2 font-extrabold">객단가</th>
              <th className="text-left py-2 px-2 font-extrabold w-[28%]">점심 / 저녁 비중</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ w, a }) => {
              const ld = a.lunch + a.dinner;
              const lunchPct = ld > 0 ? a.lunch / ld : 0;
              const isWeekend = w === 0 || w === 6;
              return (
                <tr key={w} className="border-b border-[#E2E8F0]">
                  <td className={`py-2.5 font-extrabold ${isWeekend ? "text-[#1E3A8A]" : "text-black"}`}>{WEEKDAY_KR[w]}</td>
                  <td className="py-2.5 px-2 text-right tnum font-bold text-black">
                    {a.revenue ? fmtKRW(a.revenue) : "—"}
                    <span className="block text-[10px] text-[#94A3B8] font-semibold">{a.count}일</span>
                  </td>
                  <td className="py-2.5 px-2 text-right tnum font-bold text-[#334155]">{a.teams || "—"}</td>
                  <td className="py-2.5 px-2 text-right tnum font-bold text-[#334155]">{a.people || "—"}</td>
                  <td className="py-2.5 px-2 text-right tnum font-bold text-[#334155]">{a.spend ? fmtKRW(a.spend) : "—"}</td>
                  <td className="py-2.5 px-2">
                    {ld > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex h-3 rounded-full overflow-hidden bg-[#E2E8F0]">
                          <div style={{ width: `${lunchPct * 100}%`, background: "#A8C5E1" }} />
                          <div style={{ width: `${(1 - lunchPct) * 100}%`, background: "#1E3A8A" }} />
                        </div>
                        <span className="text-[11px] font-bold text-[#475569] tnum whitespace-nowrap">{Math.round(lunchPct * 100)}/{Math.round((1 - lunchPct) * 100)}</span>
                      </div>
                    ) : <span className="text-[#94A3B8]">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-4 mt-3 text-[11px] font-bold text-[#475569]">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#A8C5E1" }} /> 점심</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#1E3A8A" }} /> 저녁</span>
        <span className="ml-auto text-[#94A3B8]">팀·인원은 반올림 정수</span>
      </div>
    </Card>
  );
}
