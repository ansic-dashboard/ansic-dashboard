"use client";
import { useMemo } from "react";
import { useSales, useInfluencers } from "@/lib/hooks";
import {
  sumPeriod, getCurrentWeek, getLatestDate, fmtKRW, fmtPct, calcChange,
  addDays, projectMonthEnd, daysInMonth, MONTHLY_TARGET, fmtDate, shiftYear, monthTotal, shiftMonthSafe,
} from "@/lib/sales-analyzer";
import { monthlyOpSummary, revenueMix, timeMix } from "@/lib/operational";
import { generateInsights } from "@/lib/insight-generator";
import { activityRows, totalCost, costItems } from "@/lib/marketing-analysis";
import { Card, SectionTitle, EmptyState, Delta, Badge, KPICard, InsightCard, ProgressBar } from "@/components/ui";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export default function OverviewTab() {
  const { data, loading, error } = useSales();
  const { data: influencers } = useInfluencers();
  const latest = getLatestDate(data);

  const goal = useMemo(() => {
    if (!latest) return null;
    const y = +latest.slice(0, 4), m = +latest.slice(5, 7);
    const proj = projectMonthEnd(data, y, m, latest);
    const last = daysInMonth(y, m);
    const elapsed = +latest.slice(8, 10);
    return {
      y, m, last, elapsed,
      cur: proj.cur, progress: proj.cur / MONTHLY_TARGET, projected: proj.projected,
      remainDays: proj.remainDays, needPerDay: proj.needPerDay(MONTHLY_TARGET),
      gap: MONTHLY_TARGET - proj.cur,
    };
  }, [data, latest]);

  // KPI: 이번달 vs 전월 vs 작년
  const kpi = useMemo(() => {
    if (!latest) return null;
    const y = +latest.slice(0, 4), m = +latest.slice(5, 7);
    const cur = monthlyOpSummary(data, y, m);
    const pmDate = shiftMonthSafe(`${y}-${String(m).padStart(2, "0")}-01`, -1);
    const pm = monthlyOpSummary(data, +pmDate.slice(0, 4), +pmDate.slice(5, 7));
    const ly = monthlyOpSummary(data, y - 1, m);
    // 매출은 현재까지 누적 vs 작년 동기간/전월 동기간
    const monthStart = latest.slice(0, 8) + "01";
    const curRev = sumPeriod(data, monthStart, latest);
    const pmRev = sumPeriod(data, shiftMonthSafe(monthStart, -1), shiftMonthSafe(latest, -1));
    const lyRev = sumPeriod(data, shiftYear(monthStart, -1), shiftYear(latest, -1));
    const revMix = revenueMix(cur);
    const tMix = timeMix(cur);
    return { cur, pm, ly, curRev, pmRev, lyRev, revMix, tMix };
  }, [data, latest]);

  // 월별 매출 막대그래프 (2024/2025/2026 나란히)
  const monthlyBar = useMemo(() => {
    const arr: any[] = [];
    for (let m = 1; m <= 12; m++) {
      const r2024 = monthTotal(data, 2024, m).revenue;
      const r2025 = monthTotal(data, 2025, m).revenue;
      const r2026 = monthTotal(data, 2026, m).revenue;
      arr.push({
        month: `${m}월`,
        "2024": r2024 || null,
        "2025": r2025 || null,
        "2026": r2026 || null,
      });
    }
    return arr;
  }, [data]);

  // 30일 추이 (꺾은선, 2024/25/26 비교)
  const line30 = useMemo(() => {
    if (!latest) return [];
    const arr: any[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = addDays(latest, -i);
      const row: any = { date: d.slice(5) };
      row["2026"] = data.find((x) => x.date === d)?.revenue ?? null;
      row["2025"] = data.find((x) => x.date === shiftYear(d, -1))?.revenue ?? null;
      row["2024"] = data.find((x) => x.date === shiftYear(d, -2))?.revenue ?? null;
      arr.push(row);
    }
    return arr;
  }, [data, latest]);

  // 인플루언서 상태 집계 (자동)
  const infSummary = useMemo(() => {
    const total = influencers.length;
    const cost = influencers.reduce((s: number, i: any) => s + (i.cost || 0), 0);
    const byStatus: Record<string, number> = {};
    influencers.forEach((i: any) => {
      const st = i.status || "촬영 전";
      byStatus[st] = (byStatus[st] || 0) + 1;
    });
    return { total, cost, byStatus };
  }, [influencers]);

  const insights = useMemo(() => latest ? generateInsights(data, latest) : [], [data, latest]);

  if (loading) return <EmptyState message="데이터 불러오는 중..." />;
  if (error) return <EmptyState message={`오류: ${error}`} />;
  if (!goal || !latest || !kpi) return <EmptyState message="매출 데이터가 없습니다" />;

  const progressColor = goal.progress >= goal.elapsed / goal.last ? "#1E3A8A" : "#B45309";

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-2 text-sm">
        <span className="text-[#475569] font-bold">기준일</span>
        <span className="font-black text-black tnum">{fmtDate(latest, "long")}</span>
        <Badge tone="info">실시간</Badge>
      </div>

      {/* === 목표 진행 === */}
      <Card pad="p-6" className="bg-gradient-to-br from-[#1E3A8A] to-[#0F172A] border-[#0F172A]">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="text-lg font-black text-white">{goal.y}년 {goal.m}월 목표 진행</h2>
          <span className="text-xs text-white/80 font-bold">목표 5,000만원</span>
        </div>
        <p className="text-xs text-white/70 mb-4 font-bold">{goal.elapsed}일째 / 총 {goal.last}일 ({Math.round((goal.elapsed / goal.last) * 100)}% 경과)</p>
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-4xl font-black text-white tnum">{fmtKRW(goal.cur, { compact: true })}</span>
            <span className="text-lg font-black text-white/90 tnum">{(goal.progress * 100).toFixed(1)}%</span>
          </div>
          <ProgressBar pct={goal.progress} color={progressColor} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-white/20">
          <Mini label="남은 매출" value={fmtKRW(goal.gap, { compact: true })} />
          <Mini label="남은 일수" value={`${goal.remainDays}일`} />
          <Mini label="하루 필요" value={fmtKRW(goal.needPerDay, { compact: true })} />
          <Mini label="월말 예상" value={fmtKRW(goal.projected, { compact: true })} sub={`${fmtPct(goal.projected / MONTHLY_TARGET - 1)} ${goal.projected >= MONTHLY_TARGET ? "달성" : "미달"}`} />
        </div>
      </Card>

      {/* === 핵심 KPI === */}
      <div>
        <SectionTitle sub="이번 달 현재까지 누적 · 전월/작년 같은 기간 대비">핵심 지표</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KPICard label="이번달 매출" value={fmtKRW(kpi.curRev.revenue, { compact: true })} accent
            deltaPrev={calcChange(kpi.curRev.revenue, kpi.pmRev.revenue)}
            deltaYoy={kpi.lyRev.revenue ? calcChange(kpi.curRev.revenue, kpi.lyRev.revenue) : undefined} />
          <KPICard label="고객수(월누적)" value={kpi.cur.totalPeople.toLocaleString()} unit="명"
            deltaPrev={kpi.pm.totalPeople ? calcChange(kpi.cur.totalPeople, kpi.pm.totalPeople) : undefined}
            deltaYoy={kpi.ly.totalPeople ? calcChange(kpi.cur.totalPeople, kpi.ly.totalPeople) : undefined} />
          <KPICard label="일평균 팀수" value={kpi.cur.dailyAvgTeams} unit="팀"
            deltaPrev={kpi.pm.dailyAvgTeams ? calcChange(kpi.cur.dailyAvgTeams, kpi.pm.dailyAvgTeams) : undefined} />
          <KPICard label="평균 객단가" value={fmtKRW(kpi.cur.avgSpend, { compact: true })}
            deltaPrev={kpi.pm.avgSpend ? calcChange(kpi.cur.avgSpend, kpi.pm.avgSpend) : undefined} />
          <KPICard label="평균 회전율" value={kpi.cur.avgTurnover ? kpi.cur.avgTurnover.toFixed(2) : "—"}
            deltaPrev={kpi.pm.avgTurnover ? calcChange(kpi.cur.avgTurnover, kpi.pm.avgTurnover) : undefined} />
        </div>
      </div>

      {/* === 매출 구성 (예약/워크인 + 점심/저녁) === */}
      {(kpi.revMix || kpi.tMix) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {kpi.revMix && (
            <Card pad="p-4">
              <p className="text-sm font-extrabold text-black mb-3">예약 vs 워크인 매출</p>
              <div className="flex w-full h-7 rounded-lg overflow-hidden mb-2">
                <div style={{ width: `${kpi.revMix.reserve.pct * 100}%`, background: "#1E3A8A" }} className="flex items-center justify-center"><span className="text-[10px] font-extrabold text-white">예약 {(kpi.revMix.reserve.pct * 100).toFixed(0)}%</span></div>
                <div style={{ width: `${kpi.revMix.walkin.pct * 100}%`, background: "#0891B2" }} className="flex items-center justify-center"><span className="text-[10px] font-extrabold text-white">워크인 {(kpi.revMix.walkin.pct * 100).toFixed(0)}%</span></div>
              </div>
              <div className="flex justify-between text-xs font-bold text-[#475569]">
                <span>예약 {fmtKRW(kpi.revMix.reserve.amount, { compact: true })}</span>
                <span>워크인 {fmtKRW(kpi.revMix.walkin.amount, { compact: true })}</span>
              </div>
            </Card>
          )}
          {kpi.tMix && (
            <Card pad="p-4">
              <p className="text-sm font-extrabold text-black mb-3">점심 vs 저녁 매출</p>
              <div className="flex w-full h-7 rounded-lg overflow-hidden mb-2">
                <div style={{ width: `${kpi.tMix.lunch.pct * 100}%`, background: "#B45309" }} className="flex items-center justify-center"><span className="text-[10px] font-extrabold text-white">점심 {(kpi.tMix.lunch.pct * 100).toFixed(0)}%</span></div>
                <div style={{ width: `${kpi.tMix.dinner.pct * 100}%`, background: "#1E3A8A" }} className="flex items-center justify-center"><span className="text-[10px] font-extrabold text-white">저녁 {(kpi.tMix.dinner.pct * 100).toFixed(0)}%</span></div>
              </div>
              <div className="flex justify-between text-xs font-bold text-[#475569]">
                <span>점심 {fmtKRW(kpi.tMix.lunch.amount, { compact: true })}</span>
                <span>저녁 {fmtKRW(kpi.tMix.dinner.amount, { compact: true })}</span>
              </div>
            </Card>
          )}
        </div>
      )}
      <Card>
        <SectionTitle sub="2024 · 2025 · 2026년 같은 달끼리 나란히 비교">월별 매출 비교</SectionTitle>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyBar} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#0F172A", fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 10, fill: "#475569", fontWeight: 700 }} tickFormatter={(v) => `${Math.round(v / 10000000)}천만`} width={48} />
              <Tooltip contentStyle={{ fontSize: 13, fontWeight: 600 }} formatter={(v: any) => v ? `${Math.round(v).toLocaleString()}원` : "—"} />
              <Legend wrapperStyle={{ fontSize: 13, fontWeight: 700 }} />
              <Bar dataKey="2024" fill="#CBD5E1" radius={[3, 3, 0, 0]} />
              <Bar dataKey="2025" fill="#64748B" radius={[3, 3, 0, 0]} />
              <Bar dataKey="2026" fill="#1E3A8A" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* === 30일 추이 (꺾은선) === */}
      <Card>
        <SectionTitle sub="2024·2025·2026년 같은 기간 30일">최근 30일 매출 추이</SectionTitle>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={line30} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#0F172A", fontWeight: 700 }} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: "#475569", fontWeight: 700 }} tickFormatter={(v) => `${Math.round(v / 10000)}만`} width={48} />
              <Tooltip contentStyle={{ fontSize: 13, fontWeight: 600 }} formatter={(v: any) => v ? `${Math.round(v).toLocaleString()}원` : "—"} />
              <Legend iconType="line" wrapperStyle={{ fontSize: 13, fontWeight: 700 }} />
              <Line type="monotone" dataKey="2024" stroke="#CBD5E1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="2025" stroke="#64748B" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="2026" stroke="#1E3A8A" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* === 마케팅 요약 (비용 + 활동 표) === */}
      <Card>
        <SectionTitle sub="이때까지 집행한 비용과 활동 내역">마케팅 요약</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-[#1E3A8A] rounded-2xl p-4">
            <p className="text-xs font-bold text-white/80 mb-1">누적 마케팅 비용</p>
            <p className="text-2xl font-black text-white tnum">{fmtKRW(totalCost, { compact: true })}</p>
          </div>
          <div className="bg-white border-2 border-[#CBD5E1] rounded-2xl p-4">
            <p className="text-xs font-bold text-[#475569] mb-1">메타광고</p>
            <p className="text-xl font-black text-black tnum">{fmtKRW(costItems.filter(c => c.type === "meta").reduce((s, c) => s + c.cost, 0), { compact: true })}</p>
          </div>
          <div className="bg-white border-2 border-[#CBD5E1] rounded-2xl p-4">
            <p className="text-xs font-bold text-[#475569] mb-1">인플루언서</p>
            <p className="text-xl font-black text-black tnum">{fmtKRW(costItems.filter(c => c.type === "influencer").reduce((s, c) => s + c.cost, 0), { compact: true })}</p>
          </div>
          <div className="bg-white border-2 border-[#CBD5E1] rounded-2xl p-4">
            <p className="text-xs font-bold text-[#475569] mb-1">진행 중</p>
            <p className="text-xl font-black text-black tnum">{costItems.filter(c => c.status === "ongoing").length}건</p>
          </div>
        </div>
        {/* 활동 표 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[#CBD5E1] bg-[#F1F5F9] text-[#475569]">
                <th className="text-left py-2 px-2 font-extrabold text-xs">시점</th>
                <th className="text-left py-2 px-2 font-extrabold text-xs">채널</th>
                <th className="text-left py-2 px-2 font-extrabold text-xs">누가</th>
                <th className="text-left py-2 px-2 font-extrabold text-xs">활동</th>
                <th className="text-center py-2 px-2 font-extrabold text-xs">상태</th>
                <th className="text-right py-2 px-2 font-extrabold text-xs">비용</th>
              </tr>
            </thead>
            <tbody>
              {activityRows.map((r, i) => (
                <tr key={i} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                  <td className="py-2.5 px-2 font-bold text-black tnum whitespace-nowrap">{fmtDate(r.date, "md")}</td>
                  <td className="py-2.5 px-2"><Badge tone={r.channel === "메타광고" ? "info" : "good"}>{r.channel}</Badge></td>
                  <td className="py-2.5 px-2 text-black font-bold text-xs whitespace-nowrap">{r.who}</td>
                  <td className="py-2.5 px-2 text-[#334155] font-medium text-xs">{r.activity}</td>
                  <td className="py-2.5 px-2 text-center"><Badge tone={r.status === "완료" ? "good" : r.status === "편집 중" ? "info" : "warn"}>{r.status}</Badge></td>
                  <td className="py-2.5 px-2 text-right font-extrabold text-black tnum">{fmtKRW(r.cost, { compact: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* === 인플루언서 요약 (자동 집계) === */}
      <Card>
        <SectionTitle sub="표에서 상태를 바꾸면 여기 숫자도 자동으로 갱신됩니다">인플루언서 현황</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#1E3A8A] rounded-2xl p-4">
            <p className="text-xs font-bold text-white/80 mb-1">총 진행</p>
            <p className="text-2xl font-black text-white tnum">{infSummary.total}명</p>
          </div>
          <div className="bg-white border-2 border-[#CBD5E1] rounded-2xl p-4">
            <p className="text-xs font-bold text-[#475569] mb-1">총 비용</p>
            <p className="text-xl font-black text-black tnum">{fmtKRW(infSummary.cost, { compact: true })}</p>
          </div>
          <div className="bg-white border-2 border-[#CBD5E1] rounded-2xl p-4 col-span-2">
            <p className="text-xs font-bold text-[#475569] mb-2">진행 상태</p>
            <div className="flex flex-wrap gap-2">
              {["촬영 전", "촬영 완료", "편집 중", "업로드 완료"].map((st) => (
                <span key={st} className="text-xs font-bold text-black">
                  {st} <span className="font-black text-[#1E3A8A]">{infSummary.byStatus[st] || 0}명</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* === 자동 인사이트 === */}
      {insights.length > 0 && (
        <div>
          <SectionTitle sub="현재 데이터에서 발견된 패턴과 권장 액션">자동 인사이트</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((ins, i) => <InsightCard key={i} {...ins} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[10px] text-white/70 font-bold uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xl font-black text-white tnum">{value}</p>
      {sub && <p className="text-[10px] text-white/70 mt-0.5 font-bold">{sub}</p>}
    </div>
  );
}
