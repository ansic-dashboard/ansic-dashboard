"use client";
import { useMemo } from "react";
import { useSales, useCampaigns } from "@/lib/hooks";
import {
  sumPeriod, getCurrentWeek, getCurrentMonth, getLatestDate,
  fmtKRW, fmtPct, calcChange, addDays, projectMonthEnd, daysInMonth,
  MONTHLY_TARGET, fmtDate, shiftYear
} from "@/lib/sales-analyzer";
import { generateInsights } from "@/lib/insight-generator";
import { costTimeline } from "@/lib/marketing-analysis";
import { Card, KPI, Delta, SectionTitle, InsightCard, EmptyState, Badge } from "@/components/ui";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

export default function OverviewTab() {
  const { data, loading, error } = useSales();
  const { data: campaigns } = useCampaigns();

  const latest = getLatestDate(data);

  // 목표/현재/예상 계산
  const goalStats = useMemo(() => {
    if (!latest) return null;
    const year = parseInt(latest.slice(0, 4), 10);
    const month = parseInt(latest.slice(5, 7), 10);
    const proj = projectMonthEnd(data, year, month, latest);
    const lastDay = daysInMonth(year, month);
    const elapsed = parseInt(latest.slice(8, 10), 10);
    return {
      year, month,
      lastDay,
      elapsed,
      target: MONTHLY_TARGET,
      cur: proj.cur,
      progress: proj.cur / MONTHLY_TARGET,
      projected: proj.projected,
      remainDays: proj.remainDays,
      needPerDay: proj.needPerDay(MONTHLY_TARGET),
      gap: MONTHLY_TARGET - proj.cur,
    };
  }, [data, latest]);

  // 작년 대비
  const yearCompare = useMemo(() => {
    if (!latest) return null;
    const monthStart = latest.slice(0, 8) + "01";
    const cur = sumPeriod(data, monthStart, latest);
    const lyStart = shiftYear(monthStart, -1);
    const lyEnd = shiftYear(latest, -1);
    const ly = sumPeriod(data, lyStart, lyEnd);
    return {
      cur: cur.revenue,
      ly: ly.revenue,
      change: calcChange(cur.revenue, ly.revenue),
    };
  }, [data, latest]);

  // 이번 주 vs 지난 주
  const weekCompare = useMemo(() => {
    if (!latest) return null;
    const wkRange = getCurrentWeek(latest);
    const cur = sumPeriod(data, wkRange.from, wkRange.to);
    const prevFrom = addDays(wkRange.from, -7);
    const prevTo = addDays(wkRange.to, -7);
    const prev = sumPeriod(data, prevFrom, prevTo);
    return {
      cur: cur.revenue,
      prev: prev.revenue,
      change: calcChange(cur.revenue, prev.revenue),
    };
  }, [data, latest]);

  // 최근 30일 추이 (2024/2025/2026 비교)
  const chart30 = useMemo(() => {
    if (!latest) return [];
    const arr: any[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = addDays(latest, -i);
      const row: any = { date: d.slice(5) };
      const today = data.find((x) => x.date === d);
      const ly = data.find((x) => x.date === shiftYear(d, -1));
      const ly2 = data.find((x) => x.date === shiftYear(d, -2));
      row["2026"] = today?.revenue ?? null;
      row["2025"] = ly?.revenue ?? null;
      row["2024"] = ly2?.revenue ?? null;
      arr.push(row);
    }
    return arr;
  }, [data, latest]);

  const insights = useMemo(() => {
    if (!latest) return [];
    return generateInsights(data, latest);
  }, [data, latest]);

  if (loading) return <EmptyState message="데이터 불러오는 중..." />;
  if (error) return <EmptyState message={`오류: ${error}`} />;
  if (!goalStats || !latest) return <EmptyState message="매출 데이터가 없습니다" />;

  // 진행률 색상
  const progressColor = 
    goalStats.progress >= 1 ? "bg-[#15803D]" :
    goalStats.progress >= goalStats.elapsed / goalStats.lastDay ? "bg-[#1E3A8A]" :
    "bg-[#B45309]";

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-baseline gap-2 text-sm">
        <span className="text-[#334155] font-medium">기준일</span>
        <span className="font-extrabold text-black tnum">{fmtDate(latest, "long")}</span>
        <Badge tone="info">실시간</Badge>
      </div>

      {/* === 1. 이번 달 목표 진행 (가장 큰 카드) === */}
      <Card pad="p-6" className="bg-gradient-to-br from-[#1E3A8A] to-[#0F172A] border-[#0F172A]">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="text-lg font-extrabold text-white">
            {goalStats.year}년 {goalStats.month}월 목표 진행
          </h2>
          <span className="text-xs text-white/80 font-bold">목표 5,000만원</span>
        </div>
        <p className="text-xs text-white/70 mb-4 font-medium">
          {goalStats.elapsed}일째 / 총 {goalStats.lastDay}일 ({Math.round((goalStats.elapsed / goalStats.lastDay) * 100)}% 경과)
        </p>

        {/* 진행률 바 */}
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-3xl md:text-4xl font-black text-white tnum">
              {fmtKRW(goalStats.cur, { compact: true })}
            </span>
            <span className="text-lg font-extrabold text-white/90 tnum">
              {(goalStats.progress * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full ${progressColor} transition-all`}
              style={{ width: `${Math.min(100, goalStats.progress * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/60 mt-1 font-bold">
            <span>0</span>
            <span>2,500만</span>
            <span>5,000만</span>
          </div>
        </div>

        {/* 핵심 숫자 4개 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-white/20">
          <div>
            <p className="text-[10px] text-white/70 font-bold uppercase tracking-wide mb-1">남은 매출</p>
            <p className="text-xl font-black text-white tnum">{fmtKRW(goalStats.gap, { compact: true })}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/70 font-bold uppercase tracking-wide mb-1">남은 일수</p>
            <p className="text-xl font-black text-white tnum">{goalStats.remainDays}일</p>
          </div>
          <div>
            <p className="text-[10px] text-white/70 font-bold uppercase tracking-wide mb-1">하루 필요 매출</p>
            <p className="text-xl font-black text-white tnum">{fmtKRW(goalStats.needPerDay, { compact: true })}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/70 font-bold uppercase tracking-wide mb-1">월말 예상</p>
            <p className="text-xl font-black text-white tnum">{fmtKRW(goalStats.projected, { compact: true })}</p>
            <p className="text-[10px] text-white/70 mt-0.5 font-bold">
              {fmtPct(goalStats.projected / goalStats.target - 1)} {goalStats.projected >= goalStats.target ? "달성" : "미달"}
            </p>
          </div>
        </div>
      </Card>

      {/* === 2. 보조 KPI: 이번 주 / 작년 대비 === */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <SectionTitle sub="월요일~오늘">이번 주 매출</SectionTitle>
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-3xl font-black text-black tnum">
              {fmtKRW(weekCompare?.cur ?? 0, { compact: true })}
            </span>
            <Delta value={weekCompare?.change ?? null} />
          </div>
          <p className="text-xs text-[#334155] font-bold">
            지난 주 같은 기간 {fmtKRW(weekCompare?.prev ?? 0, { compact: true })} 대비
          </p>
        </Card>
        <Card>
          <SectionTitle sub={`${goalStats.month}/1 ~ ${fmtDate(latest, "md")}`}>작년 같은 기간 비교</SectionTitle>
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-3xl font-black text-black tnum">
              {fmtKRW(yearCompare?.cur ?? 0, { compact: true })}
            </span>
            <Delta value={yearCompare?.change ?? null} />
          </div>
          <p className="text-xs text-[#334155] font-bold">
            작년 같은 기간 {fmtKRW(yearCompare?.ly ?? 0, { compact: true })} 대비
          </p>
        </Card>
      </div>

      {/* === 3. 30일 매출 추이 === */}
      <Card pad="p-5">
        <SectionTitle sub="2024년·2025년·2026년 같은 기간 30일 비교">최근 30일 매출 추이</SectionTitle>
        <div className="h-72 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart30} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#CBD5E1" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#0F172A", fontWeight: 700 }} interval={4} />
              <YAxis
                tick={{ fontSize: 10, fill: "#334155", fontWeight: 700 }}
                tickFormatter={(v) => `${Math.round(v / 10000)}만`}
                width={52}
              />
              <Tooltip
                contentStyle={{ background: "#FFF", border: "1px solid #CBD5E1", fontSize: 13, fontWeight: 600 }}
                formatter={(v: any) => (v ? `${Math.round(v).toLocaleString()}원` : "—")}
              />
              <Legend iconType="line" wrapperStyle={{ fontSize: 13, fontWeight: 700 }} />
              <Line type="monotone" dataKey="2024" stroke="#94A3B8" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="2025" stroke="#475569" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="2026" stroke="#1E3A8A" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* === 4. 마케팅 타임라인 === */}
      <Card pad="p-5">
        <SectionTitle sub="진행 일자순으로 정리">마케팅 캠페인 타임라인</SectionTitle>
        <MarketingTimeline campaigns={campaigns} latestDate={latest} />
      </Card>

      {/* === 5. 자동 인사이트 (행동 제안형) === */}
      {insights.length > 0 && (
        <div>
          <SectionTitle sub="현재 데이터에서 발견된 패턴과 권장 액션">자동 인사이트</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((ins, i) => (
              <InsightCard key={i} {...ins} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** 마케팅 타임라인 — 가로 형태 */
function MarketingTimeline({ campaigns, latestDate }: { campaigns: any[]; latestDate: string }) {
  // DB 캠페인 우선, 없으면 정적 데이터
  const items = campaigns && campaigns.length > 0
    ? campaigns.map((c: any) => ({
        date: c.start_date,
        type: c.type,
        title: c.title,
        cost: c.cost,
        status: c.status ?? "completed",
        note: c.description,
      }))
    : costTimeline.map(c => ({
        date: c.date, type: c.type, title: c.title, cost: c.cost,
        status: c.status, note: c.note,
      }));

  const sorted = [...items].sort((a, b) => (a.date < b.date ? -1 : 1));

  return (
    <div className="relative">
      {/* 세로 라인 */}
      <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-[#CBD5E1]" />
      
      <div className="space-y-4">
        {sorted.map((item, i) => {
          const isPast = item.date < latestDate;
          const isOngoing = item.status === "ongoing";
          const dotColor = isOngoing ? "bg-[#B45309]" : isPast ? "bg-[#15803D]" : "bg-[#64748B]";
          const typeColor = item.type === "meta" ? "bg-[#1E3A8A] text-white" : 
                            item.type === "influencer" ? "bg-[#15803D] text-white" :
                            "bg-[#334155] text-white";
          const typeLabel = item.type === "meta" ? "메타광고" : 
                            item.type === "influencer" ? "인플루언서" : "기타";
          return (
            <div key={i} className="relative pl-10">
              <div className={`absolute left-1 top-1 w-5 h-5 rounded-full ${dotColor} border-2 border-white ${isOngoing ? "pulse-dot" : ""}`} />
              <div className="bg-white border border-[#CBD5E1] rounded-lg p-3">
                <div className="flex items-baseline gap-2 flex-wrap mb-1">
                  <span className="text-xs font-extrabold text-black tnum">{fmtDate(item.date, "long")}</span>
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${typeColor}`}>
                    {typeLabel}
                  </span>
                  {isOngoing && <Badge tone="warn">진행 중</Badge>}
                  {!isOngoing && isPast && <Badge tone="good">완료</Badge>}
                  {!isPast && <Badge tone="neutral">예정</Badge>}
                </div>
                <p className="text-sm font-extrabold text-black">{item.title}</p>
                {item.note && <p className="text-xs text-[#334155] mt-1 font-medium">{item.note}</p>}
                <p className="text-xs font-bold text-black tnum mt-1">비용 {fmtKRW(item.cost, { compact: true })}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
