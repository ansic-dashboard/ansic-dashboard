"use client";
import { useMemo, useState } from "react";
import type { DailySales } from "@/types";
import { useNotes } from "@/lib/hooks";
import { Card, SectionTitle, Badge, Delta } from "@/components/ui";
import { fmtKRW } from "@/lib/sales-analyzer";
import { monthlyTotals, DEFAULT_MONTHLY_TARGET } from "@/lib/feature-analytics";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Cell } from "recharts";

const YEARS = [2026, 2025, 2024];

export default function TargetTrendSection({ data }: { data: DailySales[] }) {
  const { notes, saveNote } = useNotes();
  const [year, setYear] = useState(2026);
  const [editing, setEditing] = useState(false);

  const target = useMemo(() => {
    const raw = notes["monthly_target"];
    const n = raw ? parseInt(raw.replace(/[^0-9]/g, ""), 10) : NaN;
    return isNaN(n) || n <= 0 ? DEFAULT_MONTHLY_TARGET : n;
  }, [notes]);
  const [draft, setDraft] = useState(String(target));

  const rows = useMemo(() => {
    return monthlyTotals(data, year)
      .filter((r) => r.days > 0)
      .map((r) => ({
        month: `${r.month}월`,
        total: r.total,
        diff: r.total - target,
        rate: target ? r.total / target : 0,
        days: r.days,
      }));
  }, [data, year, target]);

  const achieved = rows.filter((r) => r.total >= target).length;

  return (
    <Card>
      <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
        <SectionTitle sub="월 목표 대비 달성/미달 추세 · 막대=실제 매출, 선=월 목표">목표 달성률 추세</SectionTitle>
        <div className="flex items-center gap-2">
          {!editing ? (
            <button onClick={() => { setDraft(String(target)); setEditing(true); }}
              className="text-xs font-extrabold text-[#1E3A8A] border-2 border-[#1E3A8A] rounded-full px-3 py-1.5">
              월 목표 {fmtKRW(target)} ✎
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus
                className="w-32 border-2 border-[#1E3A8A] rounded-lg px-2 py-1 text-sm font-bold tnum text-black" />
              <button onClick={() => { saveNote("monthly_target", draft.replace(/[^0-9]/g, "")); setEditing(false); }}
                className="text-xs font-extrabold bg-[#1E3A8A] text-white px-3 py-1.5 rounded-lg">저장</button>
              <button onClick={() => setEditing(false)} className="text-xs font-bold text-[#475569]">취소</button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {YEARS.map((y) => (
          <button key={y} onClick={() => setYear(y)}
            className={`text-xs font-extrabold px-3 py-1.5 rounded-full border-2 ${year === y ? "bg-[#1E3A8A] border-[#1E3A8A] text-white" : "bg-white border-[#CBD5E1] text-[#475569]"}`}>
            {y}년
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm font-bold text-[#94A3B8]">{year}년 데이터가 없습니다.</p>
      ) : (
        <>
          <div className="mb-4">
            <Badge tone={achieved >= rows.length / 2 ? "good" : "warn"}>
              {year}년 {rows.length}개월 중 {achieved}개월 목표 달성
            </Badge>
          </div>

          <div className="h-64 mb-5">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#0F172A", fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748B" }} tickFormatter={(v) => `${Math.round(v / 10000000)}천만`} width={48} />
                <Tooltip contentStyle={{ fontSize: 13, fontWeight: 600 }} formatter={(v: any, n: any) => [fmtKRW(Math.round(v)), n === "total" ? "실제 매출" : "목표"]} />
                <ReferenceLine y={target} stroke="#B45309" strokeWidth={2} strokeDasharray="5 4" />
                <Bar dataKey="total" radius={[3, 3, 0, 0]}>
                  {rows.map((r, i) => <Cell key={i} fill={r.total >= target ? "#1E3A8A" : "#B91C1C"} />)}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[#CBD5E1] text-[#475569] text-xs">
                  <th className="text-left py-2 font-extrabold">월</th>
                  <th className="text-right py-2 px-2 font-extrabold">실제 매출</th>
                  <th className="text-right py-2 px-2 font-extrabold">목표 차액</th>
                  <th className="text-right py-2 px-2 font-extrabold">달성률</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.month} className="border-b border-[#E2E8F0]">
                    <td className="py-2.5 font-bold text-black">{r.month}<span className="text-[10px] text-[#94A3B8] font-semibold ml-1">{r.days}일</span></td>
                    <td className="py-2.5 px-2 text-right tnum font-bold text-black">{fmtKRW(r.total)}</td>
                    <td className={`py-2.5 px-2 text-right tnum font-extrabold ${r.diff >= 0 ? "text-[#15803D]" : "text-[#B91C1C]"}`}>
                      {r.diff >= 0 ? "+" : ""}{fmtKRW(r.diff)}
                    </td>
                    <td className="py-2.5 px-2 text-right tnum font-extrabold text-[#1E3A8A]">{Math.round(r.rate * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-[#64748B] font-semibold mt-3">※ 당월은 진행 중이라 영업일수가 적을 수 있습니다(표의 일수 참고). 목표는 ✎로 수정하면 모든 월에 같은 값으로 적용됩니다.</p>
        </>
      )}
    </Card>
  );
}
