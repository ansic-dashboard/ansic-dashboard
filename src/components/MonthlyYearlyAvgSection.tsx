"use client";
import { useMemo, useState } from "react";
import type { DailySales } from "@/types";
import { Card, SectionTitle, Badge } from "@/components/ui";
import { fmtKRW } from "@/lib/sales-analyzer";
import { monthAvg, yearAvg, type DayAvg } from "@/lib/feature-analytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Metric = "revenue" | "people" | "teams" | "spend";
const METRICS: { key: Metric; label: string; unit: string }[] = [
  { key: "revenue", label: "일평균 매출", unit: "원" },
  { key: "people", label: "일평균 인원", unit: "명" },
  { key: "teams", label: "일평균 팀수", unit: "팀" },
  { key: "spend", label: "평균 객단가", unit: "원" },
];
const YEARS = [2024, 2025, 2026];

function fmtVal(metric: Metric, v: number): string {
  if (v === 0) return "—";
  if (metric === "revenue" || metric === "spend") return fmtKRW(v);
  return v.toLocaleString();
}

export default function MonthlyYearlyAvgSection({ data }: { data: DailySales[] }) {
  const [metric, setMetric] = useState<Metric>("revenue");

  const { monthRows, yearRow, chart } = useMemo(() => {
    const monthRows = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const cells: Record<number, DayAvg> = {};
      for (const y of YEARS) cells[y] = monthAvg(data, y, m);
      return { month: m, cells };
    });
    const yearRow: Record<number, DayAvg> = {};
    for (const y of YEARS) yearRow[y] = yearAvg(data, y);
    const chart = monthRows.map((r) => ({
      month: `${r.month}월`,
      2024: r.cells[2024][metric] || null,
      2025: r.cells[2025][metric] || null,
      2026: r.cells[2026][metric] || null,
    }));
    return { monthRows, yearRow, chart };
  }, [data, metric]);

  const cur = METRICS.find((m) => m.key === metric)!;

  return (
    <Card>
      <SectionTitle sub="2024·2025·2026년을 같은 달끼리 비교 · 영업일 1일 평균 기준">연·월별 일평균</SectionTitle>

      <div className="flex flex-wrap gap-2 mb-4">
        {METRICS.map((m) => (
          <button key={m.key} onClick={() => setMetric(m.key)}
            className={`text-xs font-extrabold px-3 py-1.5 rounded-full border-2 transition-colors ${metric === m.key ? "bg-[#1E3A8A] border-[#1E3A8A] text-white" : "bg-white border-[#CBD5E1] text-[#475569]"}`}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="h-64 mb-5">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#0F172A", fontWeight: 700 }} />
            <YAxis tick={{ fontSize: 10, fill: "#64748B" }} tickFormatter={(v) => metric === "revenue" || metric === "spend" ? `${Math.round(v / 10000)}만` : `${v}`} width={44} />
            <Tooltip contentStyle={{ fontSize: 13, fontWeight: 600 }} formatter={(v: any) => v ? fmtVal(metric, Math.round(v)) + cur.unit : "—"} />
            <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
            <Bar dataKey="2024" fill="#CBD5E1" radius={[3, 3, 0, 0]} />
            <Bar dataKey="2025" fill="#64748B" radius={[3, 3, 0, 0]} />
            <Bar dataKey="2026" fill="#1E3A8A" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-[#CBD5E1] text-[#475569]">
              <th className="text-left py-2 font-extrabold">{cur.label}</th>
              {YEARS.map((y) => <th key={y} className="text-right py-2 px-2 font-extrabold">{y}</th>)}
            </tr>
          </thead>
          <tbody>
            {monthRows.map((r) => (
              <tr key={r.month} className="border-b border-[#E2E8F0]">
                <td className="py-2 font-bold text-black">{r.month}월</td>
                {YEARS.map((y) => (
                  <td key={y} className="py-2 px-2 text-right tnum font-bold text-[#334155]">{fmtVal(metric, r.cells[y][metric])}</td>
                ))}
              </tr>
            ))}
            <tr className="border-t-2 border-[#1E3A8A] bg-[#F8FAFC]">
              <td className="py-2.5 font-black text-black">연 평균</td>
              {YEARS.map((y) => (
                <td key={y} className="py-2.5 px-2 text-right tnum font-black text-[#1E3A8A]">{fmtVal(metric, yearRow[y][metric])}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-[#64748B] font-semibold mt-3">※ 매출·인원이 기록된 영업일만 평균에 포함. 팀·인원은 반올림 정수.</p>
    </Card>
  );
}
