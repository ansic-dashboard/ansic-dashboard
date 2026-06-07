"use client";
import { useMemo, useState, useRef, useCallback } from "react";
import { Card, SectionTitle, Badge, EmptyState, Delta } from "@/components/ui";
import { useHourlyData, useSales } from "@/lib/hooks";
import { fmtKRW, calcChange, sumPeriod } from "@/lib/sales-analyzer";
import { HOURLY, WEEKDAY } from "@/lib/hourly-data";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";

const won만 = (n: number) => `${Math.round(n / 10000).toLocaleString()}만`;

export default function HourlySalesTab() {
  const { data: sales, loading } = useSales();
  const { log, reload } = useHourlyData();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 유입경로 변화: 2025 vs 2026 (1~5월 동일기간, 건수)
  const inflow = useMemo(() => {
    const sum = (key: "phoneIn" | "catchIn" | "naverIn", y: number) =>
      sales.filter((d) => d.date >= `${y}-01-01` && d.date <= `${y}-05-31`).reduce((s, d) => s + ((d as any)[key] || 0), 0);
    const rows = [
      { label: "유선전화", k: "phoneIn" as const },
      { label: "캐치테이블", k: "catchIn" as const },
      { label: "네이버예약", k: "naverIn" as const },
    ].map((r) => {
      const a = sum(r.k, 2025), b = sum(r.k, 2026);
      return { label: r.label, y2025: a, y2026: b, ch: calcChange(b, a) };
    });
    return rows.some((r) => r.y2025 || r.y2026) ? rows : null;
  }, [sales]);

  const lunch = HOURLY.filter((h) => h.part === "lunch");
  const dinner = HOURLY.filter((h) => h.part === "dinner");
  const lunchSum = (k: "y2025" | "y2026") => lunch.reduce((s, h) => s + h[k], 0);
  const dinnerSum = (k: "y2025" | "y2026") => dinner.reduce((s, h) => s + h[k], 0);
  const total26 = lunchSum("y2026") + dinnerSum("y2026");
  const barData = HOURLY.map((h) => ({ hour: h.hour, "2025": h.y2025, "2026": h.y2026, part: h.part }));

  const upload = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files); if (!arr.length) return;
    setUploading(true); setResult(null);
    try {
      const fd = new FormData(); arr.forEach((f) => fd.append("files", f));
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json(); setResult(j); if (j.ok) await reload();
    } catch (e: any) { setResult({ errors: [`업로드 실패: ${e?.message}`] }); }
    finally { setUploading(false); }
  }, [reload]);

  if (loading) return <EmptyState message="데이터 불러오는 중..." />;

  const HEAD = "py-2 px-2 font-extrabold text-white text-right whitespace-nowrap";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-3">
        <SectionTitle sub="2026년 시간대·요일별 매출을 2025년 같은 기간(1~5월)과 비교 — 어디서 얼마나 빠졌는지 봅니다">시간대별 매출</SectionTitle>
      </div>

      {/* 한 줄 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border-2 border-[#CBD5E1] rounded-2xl p-4">
          <p className="text-xs font-bold text-[#475569] mb-1">점심(11~15시) 2025 → 2026</p>
          <p className="text-lg font-black text-black tnum">{fmtKRW(lunchSum("y2025"), { compact: true })} → {fmtKRW(lunchSum("y2026"), { compact: true })}</p>
          <div className="mt-1"><Delta value={calcChange(lunchSum("y2026"), lunchSum("y2025"))} /> <span className="text-xs font-bold text-[#64748B]">거의 유지</span></div>
        </div>
        <div className="bg-white border-2 border-[#B91C1C]/30 rounded-2xl p-4">
          <p className="text-xs font-bold text-[#475569] mb-1">저녁(16~21시) 2025 → 2026</p>
          <p className="text-lg font-black text-black tnum">{fmtKRW(dinnerSum("y2025"), { compact: true })} → {fmtKRW(dinnerSum("y2026"), { compact: true })}</p>
          <div className="mt-1"><Delta value={calcChange(dinnerSum("y2026"), dinnerSum("y2025"))} /> <span className="text-xs font-bold text-[#B91C1C]">저녁이 크게 빠짐</span></div>
        </div>
      </div>

      {/* 시간대별 막대그래프 (2025 vs 2026) */}
      <Card>
        <SectionTitle sub="시간대별 매출을 2025·2026 나란히 — 막대가 낮아진 시간대가 빠진 곳">시간대별 매출 (2025 vs 2026)</SectionTitle>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#0F172A", fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 10, fill: "#475569", fontWeight: 700 }} width={48} tickFormatter={(v) => `${Math.round(v / 10000000)}천만`} />
              <Tooltip contentStyle={{ fontSize: 13, fontWeight: 600 }} formatter={(v: any) => `${Math.round(v).toLocaleString()}원`} />
              <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
              <Bar dataKey="2025" fill="#94A3B8" radius={[3, 3, 0, 0]} />
              <Bar dataKey="2026" fill="#1E3A8A" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 시간대별 표 */}
      <Card>
        <SectionTitle sub="각 시간대 2025년 대비 증감률 · 점심은 유지, 저녁(17~20시)이 급감">시간대별 증감 (2025 → 2026)</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#1E3A8A" }}>
                <th className="py-2 px-2 font-extrabold text-white text-left">시간대</th>
                <th className={HEAD}>2025</th><th className={HEAD}>2026</th><th className={HEAD}>증감률</th>
                <th className={HEAD}>2026 비중</th>
              </tr>
            </thead>
            <tbody>
              {HOURLY.map((h) => (
                <tr key={h.hour} className={`border-b border-[#E2E8F0] ${h.part === "dinner" ? "bg-[#FFF7F5]" : ""}`}>
                  <td className="py-2 px-2 font-bold text-black">{h.hour} <span className="text-[10px] text-[#94A3B8]">{h.part === "lunch" ? "점심" : "저녁"}</span></td>
                  <td className="py-2 px-2 text-right tnum text-[#475569] font-bold">{won만(h.y2025)}</td>
                  <td className="py-2 px-2 text-right tnum text-black font-extrabold">{won만(h.y2026)}</td>
                  <td className="py-2 px-2 text-right"><Delta value={calcChange(h.y2026, h.y2025)} inline /></td>
                  <td className="py-2 px-2 text-right tnum text-[#64748B] font-bold">{((h.y2026 / total26) * 100).toFixed(1)}%</td>
                </tr>
              ))}
              <tr className="border-t-2 border-[#1E3A8A] bg-[#F1F5F9]">
                <td className="py-2 px-2 font-black text-black">점심 소계</td>
                <td className="py-2 px-2 text-right tnum font-bold text-[#475569]">{won만(lunchSum("y2025"))}</td>
                <td className="py-2 px-2 text-right tnum font-black text-black">{won만(lunchSum("y2026"))}</td>
                <td className="py-2 px-2 text-right"><Delta value={calcChange(lunchSum("y2026"), lunchSum("y2025"))} inline /></td>
                <td className="py-2 px-2 text-right tnum font-bold text-[#64748B]">{((lunchSum("y2026") / total26) * 100).toFixed(0)}%</td>
              </tr>
              <tr className="bg-[#F1F5F9]">
                <td className="py-2 px-2 font-black text-black">저녁 소계</td>
                <td className="py-2 px-2 text-right tnum font-bold text-[#475569]">{won만(dinnerSum("y2025"))}</td>
                <td className="py-2 px-2 text-right tnum font-black text-black">{won만(dinnerSum("y2026"))}</td>
                <td className="py-2 px-2 text-right"><Delta value={calcChange(dinnerSum("y2026"), dinnerSum("y2025"))} inline /></td>
                <td className="py-2 px-2 text-right tnum font-bold text-[#64748B]">{((dinnerSum("y2026") / total26) * 100).toFixed(0)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-[#64748B] font-semibold mt-3">※ 점심(11~15시)은 2025년과 거의 같고, 저녁 17~20시가 -28~41%로 크게 빠졌습니다. 매출 감소는 사실상 '저녁'에서 나온 것입니다.</p>
      </Card>

      {/* 요일별 점심/저녁 (2025 vs 2026) */}
      <Card>
        <SectionTitle sub="요일별로 점심·저녁이 2025년 대비 어떻게 변했는지">요일별 매출 (2025 → 2026)</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "#1E3A8A" }}>
                <th className="py-2 px-2 font-extrabold text-white text-left">요일</th>
                <th className={HEAD}>점심 2025</th><th className={HEAD}>점심 2026</th><th className={HEAD}>점심 증감</th>
                <th className={HEAD}>저녁 2025</th><th className={HEAD}>저녁 2026</th><th className={HEAD}>저녁 증감</th>
              </tr>
            </thead>
            <tbody>
              {WEEKDAY.map((w) => (
                <tr key={w.day} className="border-b border-[#E2E8F0]">
                  <td className={`py-2 px-2 font-extrabold ${w.day === "토" ? "text-[#1E3A8A]" : w.day === "일" ? "text-[#B91C1C]" : "text-black"}`}>{w.day}</td>
                  <td className="py-2 px-2 text-right tnum text-[#475569]">{won만(w.lunch25)}</td>
                  <td className="py-2 px-2 text-right tnum font-bold text-black">{won만(w.lunch26)}</td>
                  <td className="py-2 px-2 text-right"><Delta value={calcChange(w.lunch26, w.lunch25)} inline /></td>
                  <td className="py-2 px-2 text-right tnum text-[#475569]">{won만(w.dinner25)}</td>
                  <td className="py-2 px-2 text-right tnum font-bold text-black">{won만(w.dinner26)}</td>
                  <td className="py-2 px-2 text-right"><Delta value={calcChange(w.dinner26, w.dinner25)} inline /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-[#64748B] font-semibold mt-3">※ 점심은 요일 상관없이 대체로 유지. 저녁은 거의 모든 요일에서 빠졌고, 특히 <b>목요일 저녁(-49%)</b>이 가장 큽니다.</p>
      </Card>

      {/* 예약 유입경로 변화 */}
      {inflow && (
        <Card>
          <SectionTitle sub="예약이 어느 채널로 들어왔는지 · 2025년 1~5월 → 2026년 1~5월 건수 비교">예약 유입경로 변화 (2025 → 2026)</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#1E3A8A" }}>
                  <th className="py-2 px-2 font-extrabold text-white text-left">채널</th>
                  <th className={HEAD}>2025년</th><th className={HEAD}>2026년</th><th className={HEAD}>증감</th><th className={HEAD}>증감률</th>
                </tr>
              </thead>
              <tbody>
                {inflow.map((r) => (
                  <tr key={r.label} className="border-b border-[#E2E8F0]">
                    <td className="py-2 px-2 font-bold text-black">{r.label}</td>
                    <td className="py-2 px-2 text-right tnum text-[#475569] font-bold">{r.y2025.toLocaleString()}건</td>
                    <td className="py-2 px-2 text-right tnum text-black font-extrabold">{r.y2026.toLocaleString()}건</td>
                    <td className={`py-2 px-2 text-right tnum font-extrabold ${r.y2026 - r.y2025 >= 0 ? "text-[#15803D]" : "text-[#B91C1C]"}`}>{r.y2026 - r.y2025 >= 0 ? "+" : ""}{(r.y2026 - r.y2025).toLocaleString()}건</td>
                    <td className="py-2 px-2 text-right"><Delta value={r.ch} inline /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-[#64748B] font-semibold mt-3">※ 유선전화·캐치테이블 예약이 줄고 네이버 유입 비중이 늘었습니다. 채널별 건수 기준(2025·2026년 1~5월).</p>
        </Card>
      )}

      {/* OKPOS 업로드 (보조 기능) */}
      <Card className="bg-[#F8FAFC]">
        <SectionTitle sub="OKPOS 엑셀(연간매출표·P&L·시간대별)을 올리면 데이터가 갱신됩니다 (선택)">데이터 업로드</SectionTitle>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files?.length) upload(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragging ? "border-[#1E3A8A] bg-[#EFF6FF]" : "border-[#CBD5E1]"}`}
        >
          <input ref={inputRef} type="file" multiple accept=".xls,.xlsx" className="hidden"
            onChange={(e) => e.target.files && upload(e.target.files)} />
          <p className="text-sm font-bold text-[#475569]">{uploading ? "업로드 중..." : "여기로 엑셀 파일을 끌어다 놓거나 클릭해서 선택"}</p>
        </div>
        {result?.errors?.length > 0 && <p className="text-xs text-[#B91C1C] font-bold mt-2">{result.errors.join(", ")}</p>}
        {result?.ok && <p className="text-xs text-[#15803D] font-bold mt-2">업로드 완료 · 데이터가 갱신되었습니다.</p>}
      </Card>
    </div>
  );
}
