"use client";
import { useMemo } from "react";
import { useSales, useNotes } from "@/lib/hooks";
import { Card, SectionTitle, EmptyState, Delta, Badge, EditableText } from "@/components/ui";
import { fmtKRW, fmtDate } from "@/lib/sales-analyzer";
import {
  WEEKDAY_KR, latestDateWith, lunchOf, dinnerOf, spendOf,
  sameWeekdayAvg, addDaysStr, change, type DayAvg,
} from "@/lib/feature-analytics";
import type { DailySales } from "@/types";

function fmtDelta(curr: number, base: number) {
  const diff = curr - base;
  const sign = diff > 0 ? "+" : "";
  return `${sign}${fmtKRW(diff)}`;
}

/** 비교 한 줄: 기준 라벨 · 기준 매출 · 차액 · 변화율 */
function CompareRow({ label, sub, baseRevenue, curRevenue, basePeople, curPeople, hasData }: {
  label: string; sub?: string; baseRevenue: number; curRevenue: number; basePeople: number; curPeople: number; hasData: boolean;
}) {
  if (!hasData) {
    return (
      <tr className="border-t border-[#E2E8F0]">
        <td className="py-2.5 pr-2"><p className="text-sm font-extrabold text-black">{label}</p>{sub && <p className="text-[11px] text-[#64748B] font-semibold">{sub}</p>}</td>
        <td className="py-2.5 text-right text-sm font-bold text-[#94A3B8]" colSpan={3}>데이터 없음</td>
      </tr>
    );
  }
  return (
    <tr className="border-t border-[#E2E8F0]">
      <td className="py-2.5 pr-2">
        <p className="text-sm font-extrabold text-black">{label}</p>
        {sub && <p className="text-[11px] text-[#64748B] font-semibold">{sub}</p>}
      </td>
      <td className="py-2.5 text-right text-sm font-bold tnum text-[#334155] whitespace-nowrap">{fmtKRW(baseRevenue)}</td>
      <td className="py-2.5 text-right text-sm font-extrabold tnum whitespace-nowrap">
        <span className={curRevenue - baseRevenue >= 0 ? "text-[#15803D]" : "text-[#B91C1C]"}>{fmtDelta(curRevenue, baseRevenue)}</span>
      </td>
      <td className="py-2.5 pl-2 text-right whitespace-nowrap"><Delta value={change(curRevenue, baseRevenue)} inline /></td>
    </tr>
  );
}

export default function DailyReportCard() {
  const { data, loading } = useSales();
  const { notes, saveNote } = useNotes();

  const report = useMemo(() => {
    const target = latestDateWith(data);
    if (!target) return null;
    const today = data.find((d) => d.date === target)!;
    const wd = new Date(target + "T00:00:00").getDay();

    // ① 지난주 같은 요일
    const lastWeekDate = addDaysStr(target, -7);
    const lastWeek = data.find((d) => d.date === lastWeekDate && d.revenue > 0) || null;

    // ② 2026년 4월 같은 요일 평균
    const apr = sameWeekdayAvg(data, wd, "2026-04-01", "2026-04-30");
    // ③ 2025년 같은 요일 전체 평균
    const y2025 = sameWeekdayAvg(data, wd, "2025-01-01", "2025-12-31");

    return { target, today, wd, lastWeek, apr, y2025 };
  }, [data]);

  if (loading) return <Card><EmptyState message="불러오는 중..." /></Card>;
  if (!report) return <Card><EmptyState message="매출 데이터가 없습니다." /></Card>;

  const { target, today, wd, lastWeek, apr, y2025 } = report;
  const lunch = lunchOf(today), dinner = dinnerOf(today);
  const spend = spendOf(today);
  const ppl = today.totalPeople ?? today.visitPeople ?? 0;
  const noteKey = `cause-${target}`;

  return (
    <Card pad="p-5 md:p-6" className="border-2 border-[#1E3A8A]">
      <div className="flex items-center justify-between mb-4">
        <SectionTitle sub="가장 최근 영업일 기준 · 자동 집계">일일 매출 분석 보고</SectionTitle>
        <Badge tone="info">{fmtDate(target, "long")}</Badge>
      </div>

      {/* 금일 매출 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl bg-[#F1F5F9] p-3">
          <p className="text-[11px] font-bold text-[#475569] mb-1">런치</p>
          <p className="text-lg md:text-xl font-black tnum text-black">{fmtKRW(lunch)}</p>
        </div>
        <div className="rounded-xl bg-[#F1F5F9] p-3">
          <p className="text-[11px] font-bold text-[#475569] mb-1">디너</p>
          <p className="text-lg md:text-xl font-black tnum text-black">{fmtKRW(dinner)}</p>
        </div>
        <div className="rounded-xl bg-[#1E3A8A] p-3">
          <p className="text-[11px] font-bold text-white/80 mb-1">금일 총매출</p>
          <p className="text-lg md:text-xl font-black tnum text-white">{fmtKRW(today.revenue)}</p>
        </div>
      </div>

      {/* 방문 현황 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Mini label="총 팀 / 인원" value={`${today.totalTeams ?? "—"}팀 · ${ppl || "—"}명`} />
        <Mini label="예약 팀 / 인원" value={`${today.reserveTeams ?? "—"}팀 · ${today.reservePeople ?? "—"}명`} />
        <Mini label="워크인 팀 / 인원" value={`${today.walkinTeams ?? "—"}팀 · ${today.walkinPeople ?? "—"}명`} />
        <Mini label="객단가" value={spend ? fmtKRW(spend) : "—"} />
      </div>

      {/* 비교 */}
      <div className="rounded-xl border border-[#CBD5E1] overflow-hidden mb-5">
        <div className="bg-[#F8FAFC] px-3 py-2 border-b border-[#E2E8F0]">
          <p className="text-xs font-extrabold text-black">매출 비교 (금일 {fmtKRW(today.revenue)} 기준)</p>
        </div>
        <table className="w-full px-3">
          <thead>
            <tr className="text-[10px] text-[#64748B] font-bold">
              <th className="text-left py-1.5 px-3">비교 대상</th>
              <th className="text-right py-1.5">기준 매출</th>
              <th className="text-right py-1.5">차액</th>
              <th className="text-right py-1.5 px-3">증감</th>
            </tr>
          </thead>
          <tbody>
            <CompareRow label="지난주 같은 요일" sub={lastWeek ? fmtDate(lastWeek.date, "md") : addDaysStr(target, -7)}
              baseRevenue={lastWeek?.revenue ?? 0} curRevenue={today.revenue}
              basePeople={lastWeek?.totalPeople ?? 0} curPeople={ppl} hasData={!!lastWeek} />
            <CompareRow label="2026년 4월 같은 요일 평균" sub={`${WEEKDAY_KR[wd]}요일 ${apr.count}일 평균`}
              baseRevenue={apr.revenue} curRevenue={today.revenue} basePeople={apr.people} curPeople={ppl} hasData={apr.count > 0} />
            <CompareRow label="2025년 같은 요일 평균" sub={`${WEEKDAY_KR[wd]}요일 ${y2025.count}일 평균`}
              baseRevenue={y2025.revenue} curRevenue={today.revenue} basePeople={y2025.people} curPeople={ppl} hasData={y2025.count > 0} />
          </tbody>
        </table>
      </div>

      {/* 원인 분석 (직접 입력) */}
      <div className="rounded-xl bg-[#EFF6FF] border border-[#1E3A8A]/30 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge tone="info">원인 분석</Badge>
          <span className="text-[11px] text-[#475569] font-semibold">직접 작성 · 자동 저장</span>
        </div>
        <EditableText
          value={notes[noteKey] || ""}
          onSave={(v) => saveNote(noteKey, v)}
          multiline
          placeholder="오늘 매출의 원인을 적어주세요 (날씨·예약·이벤트 등). 클릭해서 입력."
          className="text-sm leading-relaxed min-h-[2.5rem]"
        />
      </div>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#CBD5E1] p-3">
      <p className="text-[11px] font-bold text-[#475569] mb-1 leading-tight">{label}</p>
      <p className="text-base font-black tnum text-black leading-tight">{value}</p>
    </div>
  );
}

// 표 안쪽 패딩 보정용 래퍼 (셀 정렬)
function ComparePadded({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
