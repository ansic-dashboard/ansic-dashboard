"use client";
import { useMemo, useState } from "react";
import { useSales, useWeather, useNotes, useHourlyData } from "@/lib/hooks";
import type { DailySales } from "@/types";
import {
  sumPeriod, getLatestDate, fmtKRW, fmtPct, calcChange,
  shiftYear, shiftMonthSafe, daysInMonth, MONTHLY_TARGET, fmtDate,
} from "@/lib/sales-analyzer";
import { monthlyOpSummary, periodOpSummary, inflowBreakdown, revenueMix, timeMix } from "@/lib/operational";
import { generateInsights } from "@/lib/insight-generator";
import HourlyAnalysisSection from "@/components/HourlyAnalysisSection";
import { Card, SectionTitle, EmptyState, Delta, Badge, KPICard, InsightCard, EditableInsightCard, ProgressBar } from "@/components/ui";
import MonthlyYearlyAvgSection from "@/components/MonthlyYearlyAvgSection";
import WeekdayAvgSection from "@/components/WeekdayAvgSection";
import TargetTrendSection from "@/components/TargetTrendSection";
import MenuShareSection from "@/components/MenuShareSection";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";

const DEKAD_TABS = [
  { key: "d10", label: "1~10일" },
  { key: "d20", label: "1~20일" },
  { key: "dEnd", label: "한 달 전체" },
  { key: "current", label: "현재까지" },
] as const;
type DekadKey = typeof DEKAD_TABS[number]["key"];

const WD_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

export default function SalesAnalysisTab() {
  const { data, loading } = useSales();
  const weather = useWeather();
  const { notes, saveNote } = useNotes();
  const { hourly: hourlyRaw } = useHourlyData();
  const latest = getLatestDate(data);
  const [selYM, setSelYM] = useState<{ y: number; m: number } | null>(null);
  const [dekad, setDekad] = useState<DekadKey>("current");

  const ym = useMemo(() => {
    if (selYM) return selYM;
    if (!latest) return null;
    return { y: +latest.slice(0, 4), m: +latest.slice(5, 7) };
  }, [selYM, latest]);

  const isCurrentMonth = useMemo(() => {
    if (!ym || !latest) return false;
    return latest.slice(0, 7) === `${ym.y}-${String(ym.m).padStart(2, "0")}`;
  }, [ym, latest]);

  // 과거 달이면 'current' 탭 비활성화
  const effectiveDekad: DekadKey = (!isCurrentMonth && dekad === "current") ? "dEnd" : dekad;

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    data.forEach((d) => set.add(d.date.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [data]);

  const periodRange = useMemo(() => {
    if (!ym) return null;
    const last = daysInMonth(ym.y, ym.m);
    const mp = String(ym.m).padStart(2, "0");
    const latestDay = (latest && isCurrentMonth) ? +latest.slice(8, 10) : last;
    const cap = (n: number) => Math.min(n, last, latestDay);
    let endDay: number;
    if (effectiveDekad === "current") endDay = latestDay;
    else if (effectiveDekad === "d10") endDay = cap(10);
    else if (effectiveDekad === "d20") endDay = cap(20);
    else endDay = cap(last);
    // 선택 구간의 명목 마지막 날(비교 라벨용) — 현재월 캡 전 값
    const nominalEnd = effectiveDekad === "d10" ? Math.min(10, last) : effectiveDekad === "d20" ? Math.min(20, last) : last;
    return {
      from: `${ym.y}-${mp}-01`,
      to: `${ym.y}-${mp}-${String(endDay).padStart(2, "0")}`,
      endDay, last, nominalEnd,
      partial: endDay < nominalEnd,
    };
  }, [ym, effectiveDekad, latest, isCurrentMonth]);

  // 매출 비교 (현재/전월/작년 동기간)
  const compare = useMemo(() => {
    if (!periodRange) return null;
    const cur = sumPeriod(data, periodRange.from, periodRange.to);
    const pm = sumPeriod(data, shiftMonthSafe(periodRange.from, -1), shiftMonthSafe(periodRange.to, -1));
    const ly = sumPeriod(data, shiftYear(periodRange.from, -1), shiftYear(periodRange.to, -1));
    return {
      cur, pm, ly,
      chPM: calcChange(cur.revenue, pm.revenue),
      chLY: calcChange(cur.revenue, ly.revenue),
    };
  }, [data, periodRange]);

  // 운영지표 (선택 기간과 동일 구간 + 지난달·작년 같은 구간)
  const opStats = useMemo(() => {
    if (!periodRange) return null;
    const cur = periodOpSummary(data, periodRange.from, periodRange.to);
    const pm = periodOpSummary(data, shiftMonthSafe(periodRange.from, -1), shiftMonthSafe(periodRange.to, -1));
    const ly = periodOpSummary(data, shiftYear(periodRange.from, -1), shiftYear(periodRange.to, -1));
    return { cur, pm, ly };
  }, [data, periodRange]);

  const inflow = useMemo(() => opStats ? inflowBreakdown(opStats.cur) : null, [opStats]);
  const revMix = useMemo(() => opStats ? revenueMix(opStats.cur) : null, [opStats]);
  const tMix = useMemo(() => opStats ? timeMix(opStats.cur) : null, [opStats]);

  // 요일별 평균
  const weekdayData = useMemo(() => {
    if (!ym) return [];
    const colors = ["#B91C1C", "#475569", "#475569", "#475569", "#475569", "#475569", "#1E3A8A"];
    const monthData = data.filter((d) => d.date.startsWith(`${ym.y}-${String(ym.m).padStart(2, "0")}`));
    const groups: { rev: number[]; ppl: number[] }[] = Array.from({ length: 7 }, () => ({ rev: [], ppl: [] }));
    monthData.forEach((d) => {
      groups[d.weekday].rev.push(d.revenue);
      if (d.totalPeople) groups[d.weekday].ppl.push(d.totalPeople);
    });
    return WD_NAMES.map((name, i) => ({
      name,
      revenue: groups[i].rev.length ? Math.round(groups[i].rev.reduce((s, x) => s + x, 0) / groups[i].rev.length) : 0,
      people: groups[i].ppl.length ? Math.round(groups[i].ppl.reduce((s, x) => s + x, 0) / groups[i].ppl.length) : 0,
      count: groups[i].rev.length,
      color: colors[i],
    }));
  }, [data, ym]);

  const insights = useMemo(() => latest ? generateInsights(data, latest) : [], [data, latest]);

  const dailyList = useMemo(() => {
    if (!ym) return [];
    return data.filter((d) => d.date.startsWith(`${ym.y}-${String(ym.m).padStart(2, "0")}`)).sort((a, b) => a.date < b.date ? -1 : 1);
  }, [data, ym]);

  if (loading) return <EmptyState message="데이터 불러오는 중..." />;
  if (!ym || !periodRange || !compare || !opStats) return <EmptyState message="데이터 없음" />;

  const hasOpData = opStats.cur.totalPeople > 0;

  // plain 비교 라벨 (예: "5월 1~6일", "2025년 6월 1~6일")
  const curLabel = `${ym.m}월 1~${periodRange.endDay}일`;
  const pmToD = shiftMonthSafe(periodRange.to, -1);
  const pmLabel = `${+pmToD.slice(5, 7)}월 1~${+pmToD.slice(8, 10)}일`;
  const lyToD = shiftYear(periodRange.to, -1);
  const lyLabel = `${+lyToD.slice(0, 4)}년 ${+lyToD.slice(5, 7)}월 1~${+lyToD.slice(8, 10)}일`;
  const daysActual = compare.cur.days;

  return (
    <div className="space-y-6">
      {/* === 헤더: 연/월 선택 === */}
      <Card>
        <div className="flex items-baseline justify-between flex-wrap gap-3 mb-4">
          <SectionTitle sub="분석할 연/월을 선택하세요">매출 분석</SectionTitle>
          <select
            value={`${ym.y}-${String(ym.m).padStart(2, "0")}`}
            onChange={(e) => { const [y, m] = e.target.value.split("-").map(Number); setSelYM({ y, m }); }}
            className="border-2 border-[#1E3A8A] rounded-lg px-3 py-2 text-sm font-black text-black bg-white"
          >
            {availableMonths.map((s) => {
              const [y, m] = s.split("-").map(Number);
              return <option key={s} value={s}>{y}년 {m}월</option>;
            })}
          </select>
        </div>

        {/* 기간 탭 */}
        <div className="flex gap-1 mb-5 border-b-2 border-[#CBD5E1] overflow-x-auto">
          {DEKAD_TABS.map((t) => {
            const disabled = t.key === "current" && !isCurrentMonth;
            if (disabled) return null;
            return (
              <button key={t.key} onClick={() => setDekad(t.key)}
                className={`px-4 py-2 text-sm font-extrabold whitespace-nowrap border-b-[3px] -mb-0.5 transition-colors ${
                  effectiveDekad === t.key ? "text-[#1E3A8A] border-[#1E3A8A]" : "text-[#64748B] border-transparent hover:text-black"
                }`}>{t.label}</button>
            );
          })}
        </div>

        {/* 매출 비교 3카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-[#1E3A8A] border-2 border-[#1E3A8A] rounded-2xl p-4">
            <p className="text-xs font-extrabold text-white/80 uppercase mb-2">
              {curLabel} ({daysActual}일치 기준)
            </p>
            <p className="text-3xl font-black text-white tnum">{fmtKRW(compare.cur.revenue, { compact: true })}</p>
            <p className="text-xs text-white/70 font-bold mt-2">{compare.cur.days}일 영업 · 일평균 {fmtKRW(compare.cur.dailyAvg, { compact: true })}</p>
          </div>
          <CompareCard title={pmLabel} base={compare.pm.revenue} cur={compare.cur.revenue} change={compare.chPM} sub={`${compare.pm.days}일치`} />
          <CompareCard title={lyLabel} base={compare.ly.revenue} cur={compare.cur.revenue} change={compare.chLY} sub={`${compare.ly.days}일치`} />
        </div>

        {/* 자연어 요약 */}
        <div className="mt-4 p-4 bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl space-y-1.5">
          <p className="text-sm font-extrabold text-black">▣ {ym.y}년 {curLabel} ({daysActual}일치) 매출은 {fmtKRW(compare.cur.revenue)}입니다.</p>
          {compare.chPM !== null && (
            <p className="text-sm font-bold text-black">▣ {pmLabel}({fmtKRW(compare.pm.revenue, { compact: true })})보다 {compare.chPM > 0 ? `${fmtPct(compare.chPM)} 증가` : `${fmtPct(Math.abs(compare.chPM), 1, false)} 감소`}했습니다.</p>
          )}
          {compare.chLY !== null && (
            <p className="text-sm font-bold text-black">▣ {lyLabel}({fmtKRW(compare.ly.revenue, { compact: true })})보다 {compare.chLY > 0 ? `${fmtPct(compare.chLY)} 증가` : `${fmtPct(Math.abs(compare.chLY), 1, false)} 감소`}했습니다.</p>
          )}
        </div>

        {/* 목표 진행 (현재 월 + current 탭) */}
        {effectiveDekad === "current" && isCurrentMonth && (
          <div className="mt-4 p-4 bg-[#DBEAFE] border-2 border-[#1E3A8A] rounded-xl">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm font-black text-[#1E3A8A]">월 목표 5,000만원 진행</p>
              <p className="text-lg font-black text-[#1E3A8A] tnum">{((compare.cur.revenue / MONTHLY_TARGET) * 100).toFixed(1)}%</p>
            </div>
            <ProgressBar pct={compare.cur.revenue / MONTHLY_TARGET} />
            <p className="text-xs text-[#1E3A8A] mt-2 font-bold">
              남은 {periodRange.last - periodRange.endDay}일 동안 하루 {fmtKRW(Math.max(0, (MONTHLY_TARGET - compare.cur.revenue) / Math.max(1, periodRange.last - periodRange.endDay)), { compact: true })}씩 필요
            </p>
          </div>
        )}
      </Card>

      {/* === 운영지표 KPI === */}
      {hasOpData ? (
        <div>
          <SectionTitle sub={`${curLabel} (${daysActual}일치) 기준 · ${pmLabel} · ${lyLabel}과 같은 기간끼리 비교`}>운영 지표</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <KPICard label="일평균 방문 인원" value={opStats.cur.dailyAvgPeople} unit="명"
              deltaPrev={calcChange(opStats.cur.dailyAvgPeople, opStats.pm.dailyAvgPeople)} deltaPrevLabel={pmLabel}
              deltaYoy={opStats.ly.dailyAvgPeople ? calcChange(opStats.cur.dailyAvgPeople, opStats.ly.dailyAvgPeople) : undefined} deltaYoyLabel={lyLabel} />
            <KPICard label="일평균 팀수" value={opStats.cur.dailyAvgTeams} unit="팀"
              deltaPrev={calcChange(opStats.cur.dailyAvgTeams, opStats.pm.dailyAvgTeams)} deltaPrevLabel={pmLabel}
              deltaYoy={opStats.ly.dailyAvgTeams ? calcChange(opStats.cur.dailyAvgTeams, opStats.ly.dailyAvgTeams) : undefined} deltaYoyLabel={lyLabel} />
            <KPICard label="평균 객단가(배달제외)" value={fmtKRW(opStats.cur.avgSpend, { compact: true })}
              deltaPrev={calcChange(opStats.cur.avgSpend, opStats.pm.avgSpend)} deltaPrevLabel={pmLabel}
              deltaYoy={opStats.ly.avgSpend ? calcChange(opStats.cur.avgSpend, opStats.ly.avgSpend) : undefined} deltaYoyLabel={lyLabel} />
            <KPICard label="평균 회전율" value={opStats.cur.avgTurnover ? opStats.cur.avgTurnover.toFixed(2) : "—"}
              deltaPrev={opStats.pm.avgTurnover ? calcChange(opStats.cur.avgTurnover, opStats.pm.avgTurnover) : undefined} deltaPrevLabel={pmLabel} />
            <KPICard label="총 방문 인원" value={opStats.cur.totalPeople.toLocaleString()} unit="명"
              deltaPrev={calcChange(opStats.cur.totalPeople, opStats.pm.totalPeople)} deltaPrevLabel={pmLabel}
              deltaYoy={opStats.ly.totalPeople ? calcChange(opStats.cur.totalPeople, opStats.ly.totalPeople) : undefined} deltaYoyLabel={lyLabel} />
          </div>
          {/* 같은기간 인원 증감 자연어 */}
          <div className="mt-3 p-3 bg-white border border-[#CBD5E1] rounded-xl">
            <p className="text-sm font-bold text-black">
              {opStats.pm.dailyAvgPeople > 0 && (() => {
                const diff = opStats.cur.dailyAvgPeople - opStats.pm.dailyAvgPeople;
                return <>{pmLabel} 대비 일평균 방문 인원은 <span className={`font-black ${diff >= 0 ? "text-[#15803D]" : "text-[#B91C1C]"}`}>{diff >= 0 ? `${diff}명 증가` : `${Math.abs(diff)}명 감소`}</span>, 객단가는 <span className={`font-black ${opStats.cur.avgSpend >= opStats.pm.avgSpend ? "text-[#15803D]" : "text-[#B91C1C]"}`}>{fmtKRW(opStats.cur.avgSpend - opStats.pm.avgSpend, { compact: true, sign: true })}</span> 변동했습니다.</>;
              })()}
            </p>
          </div>
        </div>
      ) : (
        <Card className="bg-[#F8FAFC]">
          <p className="text-sm font-bold text-[#64748B]">이 달은 운영 지표(인원·팀수·회전율) 데이터가 없습니다. 매출 정보만 표시됩니다.</p>
        </Card>
      )}

      {/* === 유입경로 === */}
      {inflow && (
        <Card>
          <SectionTitle sub={`예약 손님이 어느 채널로 들어왔는지 (${ym.y}년 ${ym.m}월)`}>예약 유입경로</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[
                    { name: "유선전화", value: inflow.phone.count, fill: "#1E3A8A" },
                    { name: "캐치테이블", value: inflow.catch.count, fill: "#15803D" },
                    { name: "네이버예약", value: inflow.naver.count, fill: "#B45309" },
                  ]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e: any) => `${e.name} ${(e.percent * 100).toFixed(0)}%`} labelLine={false} />
                  <Tooltip formatter={(v: any) => `${v}건`} contentStyle={{ fontSize: 13, fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              <InflowRow label="유선전화" count={inflow.phone.count} pct={inflow.phone.pct} color="#1E3A8A" />
              <InflowRow label="캐치테이블" count={inflow.catch.count} pct={inflow.catch.pct} color="#15803D" />
              <InflowRow label="네이버예약" count={inflow.naver.count} pct={inflow.naver.pct} color="#B45309" />
              <div className="mt-3 p-3 bg-[#F1F5F9] rounded-xl">
                <p className="text-sm font-extrabold text-black">→ 가장 많은 유입은 <span className="text-[#1E3A8A]">{inflow.dominant}</span>입니다.</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* === 매출 비중 (예약/워크인 + 점심/저녁) === */}
      {(revMix || tMix) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {revMix && (
            <Card>
              <SectionTitle sub={`${ym.y}년 ${ym.m}월 매출 구성`}>예약 vs 워크인 매출</SectionTitle>
              <MixBar a={{ label: "예약", amount: revMix.reserve.amount, pct: revMix.reserve.pct, color: "#1E3A8A" }}
                      b={{ label: "워크인", amount: revMix.walkin.amount, pct: revMix.walkin.pct, color: "#0891B2" }} />
              <p className="text-xs text-[#475569] mt-3 font-bold">
                매출의 {(revMix.reserve.pct * 100).toFixed(0)}%가 예약, {(revMix.walkin.pct * 100).toFixed(0)}%가 워크인에서 나왔습니다.
                {revMix.reserve.pct >= 0.7 ? " 예약 비중이 높아 마케팅·예약채널 관리가 매출에 직결됩니다." : " 워크인 비중이 높아 현장 노출(간판·캐치테이블)이 중요합니다."}
              </p>
            </Card>
          )}
          {tMix && (
            <Card>
              <SectionTitle sub={`${ym.y}년 ${ym.m}월 시간대 구성`}>점심 vs 저녁 매출</SectionTitle>
              <MixBar a={{ label: "점심", amount: tMix.lunch.amount, pct: tMix.lunch.pct, color: "#B45309" }}
                      b={{ label: "저녁", amount: tMix.dinner.amount, pct: tMix.dinner.pct, color: "#1E3A8A" }} />
              <p className="text-xs text-[#475569] mt-3 font-bold">
                매출의 {(tMix.lunch.pct * 100).toFixed(0)}%가 점심, {(tMix.dinner.pct * 100).toFixed(0)}%가 저녁입니다.
                {tMix.dinner.pct >= tMix.lunch.pct ? " 저녁이 더 강세 — 디너 객단가·예약을 키우면 효율적입니다." : " 점심이 더 강세 — 런치 회전율·세트 메뉴가 핵심입니다."}
              </p>
            </Card>
          )}
        </div>
      )}

      {/* === 자동 인사이트 (원인 분석, 편집 가능) === */}
      {insights.length > 0 && isCurrentMonth && (
        <div>
          <SectionTitle sub="왜 그런지 원인 추론 + 권장 액션 · 각 카드 ✎로 직접 수정 가능">자동 인사이트</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((ins, i) => (
              <EditableInsightCard key={i} {...ins} noteKey={`sales_insight_${ym.y}_${ym.m}_${i}`} override={notes[`sales_insight_${ym.y}_${ym.m}_${i}`]} onSave={saveNote} />
            ))}
          </div>
        </div>
      )}

      {/* === 요일별 평균 매출 (그래프 + 표) === */}
      <Card>
        <SectionTitle sub={`${ym.y}년 ${ym.m}월 전체 데이터 기준`}>요일별 평균 매출</SectionTitle>
        <div className="h-64 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekdayData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: "#0F172A", fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 11, fill: "#475569", fontWeight: 700 }} tickFormatter={(v) => `${Math.round(v / 10000)}만`} width={52} />
              <Tooltip contentStyle={{ fontSize: 13, fontWeight: 600 }} formatter={(v: any, _n, p: any) => [`${Math.round(v).toLocaleString()}원 (${p.payload.count}회)`, "평균"]} />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                {weekdayData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* 표 형태 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[#CBD5E1] bg-[#F1F5F9]">
                <th className="text-left py-2 px-2 font-extrabold text-xs">요일</th>
                {weekdayData.map((d) => <th key={d.name} className="text-right py-2 px-2 font-extrabold text-xs">{d.name}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#E2E8F0]">
                <td className="py-2 px-2 font-bold text-[#475569] text-xs">평균 매출</td>
                {weekdayData.map((d) => <td key={d.name} className="py-2 px-2 text-right font-extrabold text-black tnum text-xs">{d.revenue ? `${Math.round(d.revenue / 10000)}만` : "—"}</td>)}
              </tr>
              <tr className="border-b border-[#E2E8F0]">
                <td className="py-2 px-2 font-bold text-[#475569] text-xs">평균 인원</td>
                {weekdayData.map((d) => <td key={d.name} className="py-2 px-2 text-right font-bold text-black tnum text-xs">{d.people || "—"}</td>)}
              </tr>
              <tr>
                <td className="py-2 px-2 font-bold text-[#475569] text-xs">영업일수</td>
                {weekdayData.map((d) => <td key={d.name} className="py-2 px-2 text-right font-bold text-[#64748B] tnum text-xs">{d.count}일</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* === 연·월별 일평균 (기능 B) === */}
      <MonthlyYearlyAvgSection data={data} />

      {/* === 목표 달성률 추세 (기능 F) === */}
      <TargetTrendSection data={data} />

      {/* === 요일별 평균 - 전체/연도 (기능 C) === */}
      <WeekdayAvgSection data={data} />

      {/* === 메뉴별 매출 비중 (기능 G) === */}
      <MenuShareSection />

      {/* === 일별 매출 일람 === */}
      <Card>
        <SectionTitle sub={`${ym.y}년 ${ym.m}월 (${dailyList.length}일) · 총매출/점심/저녁/예약/워크인/배달/회전율`}>일별 매출 일람</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-[#CBD5E1] text-[#475569] bg-[#F1F5F9]">
                <th className="text-left py-2 px-2 font-extrabold">날짜</th>
                <th className="text-center py-2 px-1 font-extrabold">요일</th>
                <th className="text-right py-2 px-2 font-extrabold">총매출</th>
                <th className="text-right py-2 px-2 font-extrabold">점심</th>
                <th className="text-right py-2 px-2 font-extrabold">저녁</th>
                <th className="text-right py-2 px-2 font-extrabold">예약</th>
                <th className="text-right py-2 px-2 font-extrabold">워크인</th>
                <th className="text-right py-2 px-2 font-extrabold">배달</th>
                <th className="text-right py-2 px-2 font-extrabold">회전율</th>
              </tr>
            </thead>
            <tbody>
              {dailyList.map((d) => {
                const dt = new Date(d.date + "T00:00:00");
                const wd = WD_NAMES[dt.getDay()];
                const wdColor = dt.getDay() === 0 ? "text-[#B91C1C]" : dt.getDay() === 6 ? "text-[#1E3A8A]" : "text-[#475569]";
                return (
                  <tr key={d.date} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                    <td className="py-2 px-2 font-bold text-black tnum">{d.date.slice(5).replace("-", "/")}</td>
                    <td className={`py-2 px-1 text-center font-extrabold ${wdColor}`}>{wd}</td>
                    <td className="py-2 px-2 text-right font-extrabold text-black tnum">{fmtKRW(d.revenue, { compact: true })}</td>
                    <td className="py-2 px-2 text-right text-[#475569] tnum">{d.lunchRevenue ? fmtKRW(d.lunchRevenue, { compact: true }) : "—"}</td>
                    <td className="py-2 px-2 text-right text-[#475569] tnum">{d.dinnerRevenue ? fmtKRW(d.dinnerRevenue, { compact: true }) : "—"}</td>
                    <td className="py-2 px-2 text-right text-[#475569] tnum">{d.reservePeople != null ? `${d.reservePeople}명` : "—"}</td>
                    <td className="py-2 px-2 text-right text-[#475569] tnum">{d.walkinPeople != null ? `${d.walkinPeople}명` : "—"}</td>
                    <td className="py-2 px-2 text-right text-[#475569] tnum">{d.deliveryRevenue ? fmtKRW(d.deliveryRevenue, { compact: true }) : "—"}</td>
                    <td className="py-2 px-2 text-right text-[#475569] tnum">{d.turnover ? d.turnover.toFixed(2) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 시간대 분석 (업로드 데이터 — '시간대별 매출 관리' 탭과 공유) */}
      {hourlyRaw && hourlyRaw.length > 0 && (
        <div className="pt-2 border-t-2 border-[#E2E8F0]">
          <HourlyAnalysisSection hourlyRaw={hourlyRaw} compact />
        </div>
      )}
    </div>
  );
}

function CompareCard({ title, base, cur, change, sub }: { title: string; base: number; cur: number; change: number | null; sub: string }) {
  const gap = cur - base;
  return (
    <div className="bg-white border-2 border-[#CBD5E1] rounded-2xl p-4">
      <p className="text-xs font-extrabold text-[#475569] uppercase mb-2">{title}</p>
      <p className="text-2xl font-black text-black tnum">{fmtKRW(base, { compact: true })}</p>
      <p className="text-[10px] text-[#64748B] font-bold mt-1">{sub}</p>
      <div className="mt-3 pt-3 border-t border-[#E2E8F0] flex items-baseline justify-between">
        <Delta value={change} />
        <span className="text-xs font-extrabold text-black tnum">{gap >= 0 ? "+" : ""}{fmtKRW(gap, { compact: true })}</span>
      </div>
    </div>
  );
}

function InflowRow({ label, count, pct, color }: { label: string; count: number; pct: number; color: string }) {  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm font-extrabold text-black">{label}</span>
        <span className="text-sm font-black text-black tnum">{count}건 <span className="text-xs text-[#64748B]">({(pct * 100).toFixed(0)}%)</span></span>
      </div>
      <div className="w-full bg-[#E2E8F0] rounded-full h-2 overflow-hidden">
        <div className="h-2 rounded-full" style={{ width: `${pct * 100}%`, background: color }} />
      </div>
    </div>
  );
}

function MixBar({ a, b }: {
  a: { label: string; amount: number; pct: number; color: string };
  b: { label: string; amount: number; pct: number; color: string };
}) {
  return (
    <div>
      <div className="flex w-full h-8 rounded-lg overflow-hidden">
        <div style={{ width: `${a.pct * 100}%`, background: a.color }} className="flex items-center justify-center">
          <span className="text-[11px] font-extrabold text-white">{(a.pct * 100).toFixed(0)}%</span>
        </div>
        <div style={{ width: `${b.pct * 100}%`, background: b.color }} className="flex items-center justify-center">
          <span className="text-[11px] font-extrabold text-white">{(b.pct * 100).toFixed(0)}%</span>
        </div>
      </div>
      <div className="flex justify-between mt-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded" style={{ background: a.color }} />
          <span className="text-sm font-extrabold text-black">{a.label}</span>
          <span className="text-sm font-black text-black tnum">{fmtKRW(a.amount, { compact: true })}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-black tnum">{fmtKRW(b.amount, { compact: true })}</span>
          <span className="text-sm font-extrabold text-black">{b.label}</span>
          <span className="w-3 h-3 rounded" style={{ background: b.color }} />
        </div>
      </div>
    </div>
  );
}
