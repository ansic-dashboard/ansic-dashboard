"use client";
import { useMemo, useState } from "react";
import { useSales } from "@/lib/hooks";
import type { DailySales } from "@/types";
import {
  sumPeriod, getLatestDate, fmtKRW, fmtPct, calcChange,
  addDays, shiftYear, daysInMonth, MONTHLY_TARGET, fmtDate
} from "@/lib/sales-analyzer";
import { generateInsights } from "@/lib/insight-generator";
import { Card, SectionTitle, EmptyState, Delta, Badge, KPI } from "@/components/ui";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

const DEKAD_TABS = [
  { key: "d10", label: "10일", endDay: 10 },
  { key: "d20", label: "20일", endDay: 20 },
  { key: "dEnd", label: "말일", endDay: 31 },
  { key: "current", label: "현재", endDay: -1 },
] as const;

type DekadKey = typeof DEKAD_TABS[number]["key"];

export default function SalesAnalysisTab() {
  const { data, loading } = useSales();
  const latest = getLatestDate(data);

  // 현재 시점의 연/월
  const [selectedYM, setSelectedYM] = useState<{ y: number; m: number } | null>(null);
  const [dekadTab, setDekadTab] = useState<DekadKey>("current");

  // 초기값: latest의 연/월
  const ym = useMemo(() => {
    if (selectedYM) return selectedYM;
    if (!latest) return null;
    return {
      y: parseInt(latest.slice(0, 4), 10),
      m: parseInt(latest.slice(5, 7), 10),
    };
  }, [selectedYM, latest]);

  // 선택 가능한 연/월 목록
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    data.forEach(d => set.add(d.date.slice(0, 7)));
    return Array.from(set).sort().reverse(); // 최신부터
  }, [data]);

  // 현재 선택된 구간의 시작/종료일
  const periodRange = useMemo(() => {
    if (!ym) return null;
    const last = daysInMonth(ym.y, ym.m);
    const mPadded = String(ym.m).padStart(2, "0");
    let endDay: number;
    if (dekadTab === "current") {
      // latest가 같은 월이면 latest 까지, 다른 월이면 말일까지
      if (latest && latest.slice(0, 7) === `${ym.y}-${mPadded}`) {
        endDay = parseInt(latest.slice(8, 10), 10);
      } else {
        endDay = last;
      }
    } else if (dekadTab === "d10") endDay = Math.min(10, last);
    else if (dekadTab === "d20") endDay = Math.min(20, last);
    else endDay = last;
    
    return {
      from: `${ym.y}-${mPadded}-01`,
      to: `${ym.y}-${mPadded}-${String(endDay).padStart(2, "0")}`,
      endDay,
      lastDayOfMonth: last,
    };
  }, [ym, dekadTab, latest]);

  // 현재 / 전월 동기간 / 작년 동기간 비교
  const compare = useMemo(() => {
    if (!periodRange) return null;
    const cur = sumPeriod(data, periodRange.from, periodRange.to);
    
    // 전월 동기간
    const prevMonth = shiftMonthSafe(periodRange.from, -1);
    const prevMonthTo = shiftMonthSafe(periodRange.to, -1);
    const prevMonthPeriod = sumPeriod(data, prevMonth, prevMonthTo);
    
    // 작년 동기간
    const lyFrom = shiftYear(periodRange.from, -1);
    const lyTo = shiftYear(periodRange.to, -1);
    const lyPeriod = sumPeriod(data, lyFrom, lyTo);
    
    return {
      cur, prevMonth: prevMonthPeriod, ly: lyPeriod,
      chPrevMonth: calcChange(cur.revenue, prevMonthPeriod.revenue),
      chLY: calcChange(cur.revenue, lyPeriod.revenue),
    };
  }, [data, periodRange]);

  // 요일별 평균 (선택 월 전체)
  const weekdayChart = useMemo(() => {
    if (!ym) return [];
    const names = ["일", "월", "화", "수", "목", "금", "토"];
    const colors = ["#B91C1C", "#334155", "#334155", "#334155", "#334155", "#334155", "#1E3A8A"];
    const monthData = data.filter(d => d.date.startsWith(`${ym.y}-${String(ym.m).padStart(2, "0")}`));
    const groups: number[][] = Array.from({ length: 7 }, () => []);
    monthData.forEach((d) => groups[d.weekday].push(d.revenue));
    return names.map((name, i) => ({
      name,
      revenue: groups[i].length ? Math.round(groups[i].reduce((s, x) => s + x, 0) / groups[i].length) : 0,
      count: groups[i].length,
      color: colors[i],
    }));
  }, [data, ym]);

  // 인사이트
  const insights = useMemo(() => {
    if (!latest) return [];
    return generateInsights(data, latest);
  }, [data, latest]);

  // 일별 매출 일람 (선택 월)
  const dailyList = useMemo(() => {
    if (!ym) return [];
    return data
      .filter(d => d.date.startsWith(`${ym.y}-${String(ym.m).padStart(2, "0")}`))
      .sort((a, b) => a.date < b.date ? -1 : 1);
  }, [data, ym]);

  if (loading) return <EmptyState message="데이터 로딩 중..." />;
  if (!ym || !periodRange) return <EmptyState message="데이터 없음" />;

  return (
    <div className="space-y-6">
      {/* 연/월 선택 */}
      <Card>
        <div className="flex items-baseline justify-between flex-wrap gap-3 mb-4">
          <SectionTitle sub="분석할 연/월을 선택하세요">매출 분석</SectionTitle>
          <select
            value={`${ym.y}-${String(ym.m).padStart(2, "0")}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-").map(Number);
              setSelectedYM({ y, m });
            }}
            className="border-2 border-[#1E3A8A] rounded px-3 py-2 text-sm font-extrabold text-black bg-white"
          >
            {availableMonths.map(ymStr => {
              const [y, m] = ymStr.split("-").map(Number);
              return <option key={ymStr} value={ymStr}>{y}년 {m}월</option>;
            })}
          </select>
        </div>

        {/* 10일/20일/말일/현재 탭 */}
        <div className="flex gap-1 mb-4 border-b-2 border-[#CBD5E1]">
          {DEKAD_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setDekadTab(t.key)}
              className={`px-4 py-2 text-sm font-extrabold transition-colors border-b-4 -mb-0.5 ${
                dekadTab === t.key
                  ? "text-[#1E3A8A] border-[#1E3A8A]"
                  : "text-[#64748B] border-transparent hover:text-black"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 비교 카드 3개 */}
        {compare && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KPI
              label={`${ym.y}년 ${ym.m}월 ${periodRange.from.slice(8)}~${periodRange.to.slice(8)}일`}
              value={fmtKRW(compare.cur.revenue, { compact: true })}
              hint={`${compare.cur.days}일 영업 / 일평균 ${fmtKRW(compare.cur.dailyAvg, { compact: true })}`}
              highlight
            />
            <ComparisonCard 
              title={`전월 같은 기간`}
              curRev={compare.cur.revenue}
              baseRev={compare.prevMonth.revenue}
              change={compare.chPrevMonth}
              periodLabel={`${compare.prevMonth.from.slice(5)}~${compare.prevMonth.to.slice(5)}`}
            />
            <ComparisonCard 
              title={`작년 같은 기간`}
              curRev={compare.cur.revenue}
              baseRev={compare.ly.revenue}
              change={compare.chLY}
              periodLabel={`${compare.ly.from.slice(0, 4)}년`}
            />
          </div>
        )}

        {/* 자연어 설명 */}
        {compare && (
          <div className="mt-4 p-4 bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg">
            <NaturalSummary compare={compare} ym={ym} dekadTab={dekadTab} />
          </div>
        )}

        {/* 목표 진행 (현재 탭에서만, 현재 월일 때만) */}
        {dekadTab === "current" && latest && latest.slice(0, 7) === `${ym.y}-${String(ym.m).padStart(2, "0")}` && (
          <div className="mt-4 p-4 bg-[#DBEAFE] border-2 border-[#1E3A8A] rounded-lg">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm font-extrabold text-[#1E3A8A]">월 목표 5,000만원 진행</p>
              <p className="text-base font-black text-[#1E3A8A] tnum">
                {((compare!.cur.revenue / MONTHLY_TARGET) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="w-full bg-white rounded-full h-2 overflow-hidden">
              <div className="h-full bg-[#1E3A8A]" style={{ width: `${Math.min(100, (compare!.cur.revenue / MONTHLY_TARGET) * 100)}%` }} />
            </div>
            <p className="text-xs text-[#1E3A8A] mt-2 font-bold">
              남은 {periodRange.lastDayOfMonth - periodRange.endDay}일 동안 하루 {fmtKRW(
                Math.max(0, (MONTHLY_TARGET - compare!.cur.revenue) / Math.max(1, periodRange.lastDayOfMonth - periodRange.endDay))
              , { compact: true })}씩 팔아야 달성
            </p>
          </div>
        )}
      </Card>

      {/* 인사이트 (현재 월일 때만) */}
      {insights.length > 0 && latest && latest.slice(0, 7) === `${ym.y}-${String(ym.m).padStart(2, "0")}` && (
        <div>
          <SectionTitle>자동 인사이트</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.slice(0, 4).map((ins, i) => (
              <Card key={i} pad="p-4" className={
                ins.level === "warn" ? "bg-[#FEF2F2] border-[#B91C1C]" :
                ins.level === "good" ? "bg-[#F0FDF4] border-[#15803D]" :
                "bg-[#EFF6FF] border-[#1E3A8A]"
              }>
                <Badge tone={ins.level === "warn" ? "down" : ins.level === "good" ? "good" : "info"}>
                  {ins.level === "warn" ? "주의" : ins.level === "good" ? "긍정" : "정보"}
                </Badge>
                <p className="text-sm font-extrabold text-black leading-relaxed mt-2">{ins.title}</p>
                {ins.detail && <p className="text-xs text-[#334155] mt-1 font-medium leading-relaxed">{ins.detail}</p>}
                {ins.action && (
                  <p className="text-xs text-black mt-2 pt-2 border-t border-[#CBD5E1] font-bold">→ {ins.action}</p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 요일별 평균 */}
      <Card>
        <SectionTitle sub={`${ym.y}년 ${ym.m}월 전체 데이터 기준`}>요일별 평균 매출</SectionTitle>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekdayChart} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#CBD5E1" strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: "#0F172A", fontWeight: 700 }} />
              <YAxis
                tick={{ fontSize: 11, fill: "#334155", fontWeight: 700 }}
                tickFormatter={(v) => `${Math.round(v / 10000)}만`}
                width={52}
              />
              <Tooltip
                contentStyle={{ background: "#FFF", border: "1px solid #CBD5E1", fontSize: 13, fontWeight: 600 }}
                formatter={(v: any, _name: string, p: any) => [
                  `${Math.round(v).toLocaleString()}원 (${p.payload.count}회 영업)`,
                  "평균 매출"
                ]}
              />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {weekdayChart.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 일별 매출 일람표 */}
      <Card>
        <SectionTitle sub={`${ym.y}년 ${ym.m}월 (${dailyList.length}일)`}>일별 매출 일람</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[#CBD5E1] text-[#334155]">
                <th className="text-left py-2 px-2 font-bold text-xs">날짜</th>
                <th className="text-left py-2 px-2 font-bold text-xs">요일</th>
                <th className="text-right py-2 px-2 font-bold text-xs">매출</th>
                <th className="text-right py-2 px-2 font-bold text-xs">점심</th>
                <th className="text-right py-2 px-2 font-bold text-xs">저녁</th>
              </tr>
            </thead>
            <tbody>
              {dailyList.map(d => {
                const dt = new Date(d.date + "T00:00:00");
                const wd = ["일", "월", "화", "수", "목", "금", "토"][dt.getDay()];
                const wdColor = dt.getDay() === 0 ? "text-[#B91C1C]" : dt.getDay() === 6 ? "text-[#1E3A8A]" : "text-[#334155]";
                return (
                  <tr key={d.date} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                    <td className="py-2 px-2 font-bold text-black tnum">{d.date.slice(5).replace("-", "/")}</td>
                    <td className={`py-2 px-2 font-extrabold ${wdColor}`}>{wd}</td>
                    <td className="py-2 px-2 text-right font-extrabold text-black tnum">{fmtKRW(d.revenue)}</td>
                    <td className="py-2 px-2 text-right text-[#334155] tnum font-medium">{d.lunchRevenue ? fmtKRW(d.lunchRevenue) : "—"}</td>
                    <td className="py-2 px-2 text-right text-[#334155] tnum font-medium">{d.dinnerRevenue ? fmtKRW(d.dinnerRevenue) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ComparisonCard({ title, curRev, baseRev, change, periodLabel }: any) {
  const gap = curRev - baseRev;
  return (
    <div className="bg-white border-2 border-[#CBD5E1] rounded-xl p-4">
      <p className="text-xs font-bold text-[#334155] mb-2 uppercase tracking-wide">{title}</p>
      <p className="text-2xl font-black text-black tnum leading-tight">{fmtKRW(baseRev, { compact: true })}</p>
      <p className="text-[10px] text-[#64748B] font-bold mt-1">{periodLabel}</p>
      <div className="mt-3 pt-3 border-t border-[#CBD5E1]">
        <div className="flex items-baseline justify-between">
          <Delta value={change} />
          <span className="text-xs font-extrabold text-black tnum">
            {gap >= 0 ? "+" : ""}{fmtKRW(gap, { compact: true })}
          </span>
        </div>
      </div>
    </div>
  );
}

function NaturalSummary({ compare, ym, dekadTab }: any) {
  if (!compare) return null;
  const periodLabel = dekadTab === "d10" ? "1~10일" : 
                      dekadTab === "d20" ? "1~20일" :
                      dekadTab === "dEnd" ? "한 달 전체" : "현재까지";
  
  const lines: string[] = [];
  lines.push(`▣ ${ym.y}년 ${ym.m}월 ${periodLabel} 매출은 ${fmtKRW(compare.cur.revenue)}입니다.`);
  
  if (compare.chPrevMonth !== null) {
    const prevText = compare.chPrevMonth > 0 ? `${fmtPct(compare.chPrevMonth)} 증가` : `${fmtPct(Math.abs(compare.chPrevMonth), 1, false)} 감소`;
    lines.push(`▣ 전월 같은 기간(${fmtKRW(compare.prevMonth.revenue, { compact: true })})보다 ${prevText}했습니다.`);
  }
  if (compare.chLY !== null) {
    const lyText = compare.chLY > 0 ? `${fmtPct(compare.chLY)} 증가` : `${fmtPct(Math.abs(compare.chLY), 1, false)} 감소`;
    lines.push(`▣ 작년 같은 기간(${fmtKRW(compare.ly.revenue, { compact: true })})보다 ${lyText}했습니다.`);
  }
  
  return (
    <div className="space-y-1.5">
      {lines.map((l, i) => (
        <p key={i} className="text-sm font-bold text-black leading-relaxed">{l}</p>
      ))}
    </div>
  );
}

function shiftMonthSafe(date: string, months: number): string {
  const d = new Date(date + "T00:00:00");
  const targetMonth = d.getMonth() + months;
  d.setMonth(targetMonth);
  return d.toISOString().slice(0, 10);
}
