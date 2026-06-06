"use client";
import { useMemo, useState, useEffect } from "react";
import { useSales, useNotes } from "@/lib/hooks";
import { Card, SectionTitle, EmptyState, Badge } from "@/components/ui";
import { fmtDate } from "@/lib/sales-analyzer";
import {
  WEEKDAY_KR, latestDateWith, lunchOf, dinnerOf, spendOf,
  sameWeekdayAvg, addDaysStr, type DayAvg,
} from "@/lib/feature-analytics";
import type { DailySales } from "@/types";

const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
const pct = (cur: number, base: number) => {
  if (!base) return "";
  const r = ((cur - base) / base) * 100;
  return `${r > 0 ? "+" : ""}${r.toFixed(1)}%`;
};
const diff = (cur: number, base: number) => `${cur - base >= 0 ? "+" : ""}${won(cur - base)}`;

/** 비교 한 줄 텍스트 */
function cmpLine(label: string, base: DayAvg | DailySales | null, cur: number, baseRev: number, hasData: boolean) {
  if (!hasData) return `· ${label}: 데이터 없음`;
  return `· ${label} ${won(baseRev)} → ${diff(cur, baseRev)} (${pct(cur, baseRev)})`;
}

export default function DailyTextReportTab() {
  const { data, loading } = useSales();
  const { notes, saveNote } = useNotes();
  const [sel, setSel] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const dates = useMemo(
    () => data.filter((d) => d.revenue > 0).map((d) => d.date).sort().reverse(),
    [data]
  );
  const target = sel || dates[0] || "";

  const report = useMemo(() => {
    if (!target) return null;
    const day = data.find((d) => d.date === target);
    if (!day) return null;
    const wd = new Date(target + "T00:00:00").getDay();
    const lastWeekDate = addDaysStr(target, -7);
    const lastWeek = data.find((d) => d.date === lastWeekDate && d.revenue > 0) || null;
    const apr = sameWeekdayAvg(data, wd, "2026-04-01", "2026-04-30");
    const y2025 = sameWeekdayAvg(data, wd, "2025-01-01", "2025-12-31");
    return { day, wd, lastWeek, apr, y2025, lastWeekDate };
  }, [data, target]);

  const noteKey = report ? `cause-${target}` : "";
  const cause = notes[noteKey] || "";

  const text = useMemo(() => {
    if (!report) return "";
    const { day, wd, lastWeek, apr, y2025, lastWeekDate } = report;
    const lunch = lunchOf(day), dinner = dinnerOf(day);
    const ppl = day.totalPeople ?? day.visitPeople ?? 0;
    const spend = spendOf(day);
    const L: string[] = [];
    L.push(`[일일 매출 분석] ${fmtDate(target, "long")}`);
    L.push("");
    L.push("■ 매출");
    L.push(`런치 ${won(lunch)} / 디너 ${won(dinner)}`);
    L.push(`합계 ${won(day.revenue)}`);
    L.push("");
    L.push("■ 비교 (합계 기준)");
    L.push(cmpLine(`전주 ${WEEKDAY_KR[wd]}요일(${lastWeekDate.slice(5).replace("-", "/")})`, lastWeek, day.revenue, lastWeek?.revenue ?? 0, !!lastWeek));
    L.push(cmpLine(`2026년 4월 ${WEEKDAY_KR[wd]}요일 평균`, apr, day.revenue, apr.revenue, apr.count > 0));
    L.push(cmpLine(`2025년 ${WEEKDAY_KR[wd]}요일 평균`, y2025, day.revenue, y2025.revenue, y2025.count > 0));
    L.push("");
    L.push("■ 방문");
    if (day.totalTeams != null || ppl) {
      const parts: string[] = [];
      if (day.reserveTeams != null) parts.push(`예약 ${day.reserveTeams}팀·${day.reservePeople ?? "—"}명`);
      if (day.walkinTeams != null) parts.push(`워크인 ${day.walkinTeams}팀·${day.walkinPeople ?? "—"}명`);
      L.push(`총 ${day.totalTeams ?? "—"}팀 / ${ppl || "—"}명${parts.length ? ` (${parts.join(", ")})` : ""}`);
      const inflow: string[] = [];
      if (day.phoneIn != null) inflow.push(`전화 ${day.phoneIn}`);
      if (day.catchIn != null) inflow.push(`캐치 ${day.catchIn}`);
      if (day.naverIn != null) inflow.push(`네이버 ${day.naverIn}`);
      if (inflow.length) L.push(`유입 ${inflow.join(" · ")}`);
      if (spend) L.push(`객단가 ${won(spend)}`);
    } else {
      L.push("인원 데이터 없음");
    }
    L.push("");
    L.push("■ 원인 분석");
    L.push(cause.trim() ? cause.trim() : "(원인 분석을 입력하세요)");
    return L.join("\n");
  }, [report, target, cause]);

  useEffect(() => setCopied(false), [text]);

  if (loading) return <Card><EmptyState message="불러오는 중..." /></Card>;
  if (!report) return <Card><EmptyState message="매출 데이터가 없습니다." /></Card>;

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); }
    catch { /* noop */ }
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <SectionTitle sub="날짜를 고르면 그날 보고 텍스트가 자동으로 만들어집니다 · 원인 분석만 직접 입력">일일 매출 분석</SectionTitle>
          <select value={target} onChange={(e) => setSel(e.target.value)}
            className="text-sm font-bold border-2 border-[#CBD5E1] rounded-lg px-3 py-1.5 text-black">
            {dates.map((d) => <option key={d} value={d}>{fmtDate(d, "long")}</option>)}
          </select>
        </div>

        {/* 원인 분석 입력 */}
        <div className="mb-4">
          <p className="text-xs font-extrabold text-[#475569] mb-1.5">원인 분석 (직접 입력 · 자동 저장)</p>
          <textarea
            value={cause}
            onChange={(e) => saveNote(noteKey, e.target.value)}
            rows={3}
            placeholder="예) 비 와서 디너 워크인 적었음. 점심은 예약 꽉 참."
            className="w-full border-2 border-[#CBD5E1] focus:border-[#1E3A8A] rounded-lg px-3 py-2 text-sm font-medium text-black leading-relaxed outline-none"
          />
        </div>

        {/* 복사용 텍스트 */}
        <div className="rounded-xl border-2 border-[#1E3A8A] overflow-hidden">
          <div className="flex items-center justify-between bg-[#1E3A8A] px-3 py-2">
            <span className="text-xs font-extrabold text-white">복사용 텍스트</span>
            <button onClick={copy} className="text-xs font-extrabold bg-white text-[#1E3A8A] px-3 py-1 rounded">
              {copied ? "복사됨 ✓" : "복사하기"}
            </button>
          </div>
          <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-black font-medium p-4 bg-white" style={{ fontFamily: "Pretendard, sans-serif" }}>{text}</pre>
        </div>
        <p className="text-[11px] text-[#64748B] font-semibold mt-3">※ 숫자는 매출현황판·P&L 데이터에서 자동 집계됩니다. 원인 분석에 적은 내용은 날짜별로 저장됩니다.</p>
      </Card>
    </div>
  );
}
