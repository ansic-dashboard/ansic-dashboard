"use client";
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, SectionTitle, EmptyState, Badge } from "@/components/ui";
import type { HourlyRow } from "@/lib/hourly-types";
import { analyzeHourly, HOURS, WEEKDAYS, man, krw } from "@/lib/hourly-analyzer";

const NAVY = "#1E3A8A";
const NAVY_MID = "#185FA5";

function rowsFromRaw(raw: any[]): HourlyRow[] {
  return (raw ?? []).map((r) => ({
    weekday: r.weekday, hour: r.hour, meal: r.meal,
    revenue: Number(r.revenue) || 0, count: Number(r.count) || 0, customers: Number(r.customers) || 0,
    year: r.year, period_start: r.period_start ?? "", period_end: r.period_end ?? "",
  }));
}

/** 히트맵 셀 색상 — 남색 농담 */
function heatColor(v: number, max: number): string {
  if (max <= 0 || v <= 0) return "#F1F5F9";
  const t = v / max; // 0~1
  // 연한 남색 → 진한 남색
  const light = [219, 234, 254]; // #DBEAFE
  const dark = [30, 58, 138]; // #1E3A8A
  const c = light.map((l, i) => Math.round(l + (dark[i] - l) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export default function HourlyAnalysisSection({
  hourlyRaw, compact = false,
}: { hourlyRaw: any[]; compact?: boolean }) {
  const rows = useMemo(() => rowsFromRaw(hourlyRaw), [hourlyRaw]);

  // 최신 연도 우선
  const years = useMemo(() => Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => b - a), [rows]);
  const latestYear = years[0];
  const analysis = useMemo(() => analyzeHourly(rows, latestYear), [rows, latestYear]);

  // ★ 점심/저녁 각각의 최신 기간 — 누락/뒤처짐 감지용
  const mealStatus = useMemo(() => {
    const pick = (meal: "점심" | "저녁") => {
      const r = rows.filter((x) => x.meal === meal && x.period_end);
      if (r.length === 0) return null;
      // 가장 최신 period_end
      return r.reduce((a, b) => (b.period_end > a.period_end ? b : a)).period_end;
    };
    const lunch = pick("점심");
    const dinner = pick("저녁");
    // 두 기간 차이(일)
    let gapDays = 0;
    if (lunch && dinner) {
      gapDays = Math.round((new Date(lunch).getTime() - new Date(dinner).getTime()) / 86400000);
    }
    return { lunch, dinner, gapDays };
  }, [rows]);

  if (rows.length === 0) {
    return <EmptyState message="시간대별 데이터가 없습니다. 위에서 점심·저녁 엑셀(.xls)을 업로드해주세요." />;
  }

  // 누락/뒤처짐 경고 메시지
  const GAP_WARN_DAYS = 3;
  let mealWarning: { tone: "warn" | "down"; msg: string } | null = null;
  if (!mealStatus.lunch && mealStatus.dinner) {
    mealWarning = { tone: "down", msg: "점심 데이터가 없습니다. 점심 엑셀(.xls)을 업로드해주세요." };
  } else if (mealStatus.lunch && !mealStatus.dinner) {
    mealWarning = { tone: "down", msg: "저녁 데이터가 없습니다. 저녁 엑셀(.xls)을 업로드해주세요." };
  } else if (Math.abs(mealStatus.gapDays) >= GAP_WARN_DAYS) {
    const behind = mealStatus.gapDays > 0 ? "저녁" : "점심";
    const ahead = mealStatus.gapDays > 0 ? "점심" : "저녁";
    mealWarning = {
      tone: "warn",
      msg: `${behind} 데이터가 ${ahead}보다 ${Math.abs(mealStatus.gapDays)}일 뒤처져 있어요. ${behind} 파일을 최신으로 다시 올려주세요. (점심 ${mealStatus.lunch ?? "—"} · 저녁 ${mealStatus.dinner ?? "—"})`,
    };
  }

  const hourChart = analysis.byHour
    .filter((h) => h.revenue > 0)
    .map((h) => ({ name: `${h.hour}시`, value: h.revenue, share: h.share, meal: h.hour <= 15 ? "점심" : "저녁" }));

  const wdChart = analysis.byWeekday.map((w) => ({ name: w.name, value: w.revenue, avgCheck: w.avgCheck }));

  return (
    <div className="space-y-6">
      {/* 헤더 + 기간 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <SectionTitle sub={analysis.periodStart && analysis.periodEnd ? `${analysis.periodStart} ~ ${analysis.periodEnd} · ${latestYear}년` : `${latestYear}년`}>
          시간대 분석
        </SectionTitle>
        {years.length > 1 && (
          <div className="flex gap-1">
            {years.map((y) => (
              <span key={y}><Badge tone={y === latestYear ? "info" : "neutral"}>{y}</Badge></span>
            ))}
          </div>
        )}
      </div>

      {/* ★ 점심/저녁 누락·뒤처짐 경고 (compact에선 '누락'만 표시) */}
      {mealWarning && !(compact && mealWarning.tone === "warn") && (
        <div className={`rounded-xl border border-l-4 p-3 ${
          mealWarning.tone === "down" ? "border-l-[#B91C1C] bg-[#FEF2F2]" : "border-l-[#B45309] bg-[#FFFBEB]"
        }`}>
          <div className="flex items-start gap-2">
            <span className="text-base leading-none mt-0.5">{mealWarning.tone === "down" ? "🚫" : "⚠️"}</span>
            <p className={`text-sm font-extrabold leading-relaxed ${mealWarning.tone === "down" ? "text-[#B91C1C]" : "text-[#B45309]"}`}>
              {mealWarning.msg}
            </p>
          </div>
        </div>
      )}

      {/* 점심·저녁 데이터 신선도 한눈에 */}
      <div className="flex gap-2 flex-wrap text-[11px] font-bold">
        <span className={`px-2.5 py-1 rounded-full ${mealStatus.lunch ? "bg-[#EFF6FF] text-[#1E3A8A]" : "bg-[#FEF2F2] text-[#B91C1C]"}`}>
          점심 최신: <span className="tnum">{mealStatus.lunch ?? "없음"}</span>
        </span>
        <span className={`px-2.5 py-1 rounded-full ${mealStatus.dinner ? "bg-[#EFF6FF] text-[#1E3A8A]" : "bg-[#FEF2F2] text-[#B91C1C]"}`}>
          저녁 최신: <span className="tnum">{mealStatus.dinner ?? "없음"}</span>
        </span>
      </div>

      {/* 점심 vs 저녁 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 border-2 border-[#CBD5E1] bg-white">
          <p className="text-xs font-extrabold text-[#475569] uppercase">점심 (11~15시)</p>
          <p className="text-2xl md:text-[28px] font-black text-black tnum leading-tight mt-1">{man(analysis.lunchRevenue)}<span className="text-base font-bold">원</span></p>
          <p className="text-sm font-extrabold text-[#185FA5] mt-1 tnum">{(analysis.lunchShare * 100).toFixed(1)}%</p>
        </div>
        <div className="rounded-2xl p-4 border-2 border-[#1E3A8A] bg-[#1E3A8A]">
          <p className="text-xs font-extrabold text-white/80 uppercase">저녁 (16~21시)</p>
          <p className="text-2xl md:text-[28px] font-black text-white tnum leading-tight mt-1">{man(analysis.dinnerRevenue)}<span className="text-base font-bold">원</span></p>
          <p className="text-sm font-extrabold text-white/90 mt-1 tnum">{(analysis.dinnerShare * 100).toFixed(1)}%</p>
        </div>
      </div>

      {/* 시간대별 매출 막대 */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-extrabold text-black">시간대별 매출</h3>
          <div className="text-xs font-bold text-[#475569]">
            피크 <span className="text-[#15803D] font-black">{analysis.peakHour}시</span>
            <span className="mx-1.5 text-[#CBD5E1]">|</span>
            최저 <span className="text-[#B91C1C] font-black">{analysis.lowHour}시</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={compact ? 200 : 260}>
          <BarChart data={hourChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: "#334155" }} axisLine={{ stroke: "#CBD5E1" }} tickLine={false} />
            <YAxis tickFormatter={(v) => `${Math.round(v / 10000)}만`} tick={{ fontSize: 10, fontWeight: 600, fill: "#64748B" }} axisLine={false} tickLine={false} width={42} />
            <Tooltip
              formatter={(v: any, _n, p: any) => [`${krw(v)}원 (${(p.payload.share * 100).toFixed(1)}%)`, p.payload.meal]}
              contentStyle={{ borderRadius: 12, border: "1px solid #CBD5E1", fontWeight: 700, fontSize: 12 }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {hourChart.map((d, i) => (
                <Cell key={i} fill={d.meal === "점심" ? NAVY_MID : NAVY} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 text-[11px] font-bold text-[#475569]">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: NAVY_MID }} />점심</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: NAVY }} />저녁</span>
        </div>
      </Card>

      {/* 요일 × 시간 히트맵 */}
      <Card>
        <h3 className="text-base font-extrabold text-black mb-3">요일 × 시간대 히트맵</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 540 }}>
            <thead>
              <tr>
                <th className="text-[11px] font-extrabold text-[#475569] p-1 text-left sticky left-0 bg-white">요일</th>
                {HOURS.map((h) => (
                  <th key={h} className="text-[10px] font-bold text-[#64748B] p-1 text-center tnum">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WEEKDAYS.map((wd, wi) => (
                <tr key={wd}>
                  <td className="text-xs font-extrabold text-black p-1 sticky left-0 bg-white">{wd}</td>
                  {HOURS.map((h, hi) => {
                    const v = analysis.heatmap[wi][hi];
                    const bg = heatColor(v, analysis.heatmapMax);
                    const t = analysis.heatmapMax > 0 ? v / analysis.heatmapMax : 0;
                    return (
                      <td key={h} className="p-0.5">
                        <div
                          className="rounded text-center tnum flex items-center justify-center"
                          style={{ background: bg, height: 30, color: t > 0.55 ? "#fff" : "#334155", fontWeight: 700, fontSize: 9 }}
                          title={`${wd} ${h}시: ${krw(v)}원`}
                        >
                          {v > 0 ? Math.round(v / 10000) : ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-[#64748B] mt-2 font-semibold">단위: 만원 · 색이 진할수록 매출 높음</p>
      </Card>

      {/* 요일별 매출 */}
      {!compact && (
        <Card>
          <h3 className="text-base font-extrabold text-black mb-3">요일별 매출 · 객단가</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={wdChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 800, fill: "#0F172A" }} axisLine={{ stroke: "#CBD5E1" }} tickLine={false} />
              <YAxis tickFormatter={(v) => `${Math.round(v / 10000)}만`} tick={{ fontSize: 10, fontWeight: 600, fill: "#64748B" }} axisLine={false} tickLine={false} width={42} />
              <Tooltip
                formatter={(v: any, _n, p: any) => [`${krw(v)}원 · 객단가 ${p.payload.avgCheck ? krw(p.payload.avgCheck) + "원" : "—"}`, "매출"]}
                contentStyle={{ borderRadius: 12, border: "1px solid #CBD5E1", fontWeight: 700, fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {wdChart.map((d, i) => (
                  <Cell key={i} fill={i === analysis.bestWeekday ? "#15803D" : i === analysis.worstWeekday ? "#B91C1C" : NAVY} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* 데이터 품질 주의 */}
      <p className="text-[11px] text-[#64748B] leading-relaxed font-medium border-t border-[#E2E8F0] pt-3">
        ※ 2024년 시간대 데이터는 인원 카운팅 누락으로 객단가 신뢰도가 낮아 객단가 비교에는 2025년 이후만 사용합니다.
        실매출은 OKPOS 추출값을 그대로 사용하며, 배달 매출은 수수료 차감 전 금액입니다.
      </p>
    </div>
  );
}
