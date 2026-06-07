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
    const w = WEEKDAY_KR[wd];
    const lunch = lunchOf(day), dinner = dinnerOf(day);
    const deli = day.deliveryRevenue ?? 0;
    const deliCnt = day.deliveryCount ?? 0;
    const ppl = day.totalPeople ?? day.visitPeople ?? 0;
    const teams = day.totalTeams ?? 0;
    const spend = spendOf(day) ?? 0;
    const md = (ds: string) => `${+ds.slice(5, 7)}/${+ds.slice(8, 10)}`;
    const signed = (d: number) => `${d >= 0 ? "+" : ""}${won(d)}`;

    // 방문 현황 한 줄 (총팀/명 + 예약/워크인 + 객단가)
    const visitLine = (label: string, t: number, p: number, rt: number, rp: number, wt: number, wp: number, sp: number, deliCntArg = 0) =>
      ` - ${label} : 총 ${t}팀 ${p}명 (예약 ${rt}팀 ${rp}명 + 워크인 ${wt}팀 ${wp}명)${deliCntArg > 0 ? ` + 배달 ${deliCntArg}건` : ""} 객단가 ${won(sp)}`;
    // 매출 비교 한 줄 (기준매출 → 차액)
    const revLine = (label: string, base: number, has: boolean) =>
      has ? ` - ${label} : ${won(base)} → ${signed(day.revenue - base)}` : ` - ${label} : 데이터 없음`;

    const L: string[] = [];
    L.push("회장님, 금일 매출 분석 보고 드립니다.");
    L.push("");
    L.push("1. 매출 비교");
    L.push(` - 금일 매출 : ${won(day.revenue)} (런치 ${won(lunch)} / 디너 ${won(dinner)})`);
    L.push(revLine(`지난주 ${w}(${md(lastWeekDate)})`, lastWeek?.revenue ?? 0, !!lastWeek));
    L.push(revLine(`2026년 4월 ${w}요일 평균`, apr.revenue, apr.count > 0));
    L.push(revLine(`2025년 ${w}요일 전체 평균`, y2025.revenue, y2025.count > 0));
    L.push("");
    L.push("2. 방문 현황");
    L.push(visitLine(
      "금일", teams, ppl,
      day.reserveTeams ?? 0, day.reservePeople ?? 0,
      day.walkinTeams ?? 0, day.walkinPeople ?? 0, spend, deliCnt
    ));
    if (lastWeek) {
      L.push(visitLine(
        `지난주 ${md(lastWeekDate)}`,
        lastWeek.totalTeams ?? 0, lastWeek.totalPeople ?? lastWeek.visitPeople ?? 0,
        lastWeek.reserveTeams ?? 0, lastWeek.reservePeople ?? 0,
        lastWeek.walkinTeams ?? 0, lastWeek.walkinPeople ?? 0, spendOf(lastWeek) ?? 0
      ));
    } else {
      L.push(` - 지난주 ${md(lastWeekDate)} : 데이터 없음`);
    }
    if (apr.count > 0)
      L.push(visitLine(`2026년 4월 ${w}요일 평균`, apr.reserveTeams + apr.walkinTeams, apr.reservePeople + apr.walkinPeople, apr.reserveTeams, apr.reservePeople, apr.walkinTeams, apr.walkinPeople, apr.spend));
    if (y2025.count > 0)
      L.push(visitLine(`2025년 ${w}요일 전체 평균`, y2025.reserveTeams + y2025.walkinTeams, y2025.reservePeople + y2025.walkinPeople, y2025.reserveTeams, y2025.reservePeople, y2025.walkinTeams, y2025.walkinPeople, y2025.spend));
    L.push("");
    L.push("3. 원인 분석");
    L.push(cause.trim() ? cause.trim() : "(직접 작성)");
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
