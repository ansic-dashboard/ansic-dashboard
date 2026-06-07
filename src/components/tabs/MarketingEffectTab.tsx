"use client";
import { useMemo } from "react";
import { useSales } from "@/lib/hooks";
import { Card, SectionTitle, EmptyState, Badge, Delta } from "@/components/ui";
import { fmtKRW, fmtPct, calcChange, getLatestDate, sumPeriod, shiftYear, monthTotal, daysInMonth } from "@/lib/sales-analyzer";
import {
  campaigns, plannedCampaigns, paidTotal, plannedTotal, grandTotal,
  metaPaid, influencerPaid, cateringNote,
} from "@/lib/marketing-analysis";

const MONTH_LABEL = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

export default function MarketingEffectTab() {
  const { data, loading } = useSales();
  const latest = getLatestDate(data);

  // 오늘(클라이언트)
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // 월별 매출 2025 vs 2026 (현재 달은 같은 기간)
  const monthly = useMemo(() => {
    if (!latest) return [];
    const curY = +latest.slice(0, 4), curM = +latest.slice(5, 7), curD = +latest.slice(8, 10);
    const rows: { m: number; label: string; y2025: number; y2026: number; partial: boolean; ch: number | null }[] = [];
    for (let m = 1; m <= curM; m++) {
      const mp = String(m).padStart(2, "0");
      const isCur = m === curM;
      const endDay = isCur ? curD : daysInMonth(2026, m);
      const r2026 = sumPeriod(data, `2026-${mp}-01`, `2026-${mp}-${String(endDay).padStart(2, "0")}`).revenue;
      const r2025 = sumPeriod(data, `2025-${mp}-01`, `2025-${mp}-${String(endDay).padStart(2, "0")}`).revenue;
      if (r2026 === 0 && r2025 === 0) continue;
      rows.push({ m, label: MONTH_LABEL[m - 1] + (isCur ? ` (1~${curD}일)` : ""), y2025: r2025, y2026: r2026, partial: isCur, ch: calcChange(r2026, r2025) });
    }
    return rows;
  }, [data, latest]);

  // 마케팅 효과 — "흐름(전월 대비 증감폭)" 기준, 2025년과만 비교
  //  전체 매출 감소(신상붐 소진)는 마케팅 탓이 아니므로, 절대액이 아니라
  //  '월별 증감폭이 작년보다 얼마나 더 좋아졌는가'로 마케팅 기여분을 추정한다. (엑셀 2번째 시트 방식)
  const effect = useMemo(() => {
    if (!latest) return null;
    const fullMonth = (y: number, m: number) => monthTotal(data, y, m).revenue;
    const curM = +latest.slice(5, 7);
    // 완료된 달만 사용 (현재 진행 달 제외)
    const lastComplete = curM - 1;
    const rows: { span: string; g2025: number | null; g2026: number | null; effect: number; added: number }[] = [];
    let added = 0;
    for (let m = 3; m <= lastComplete; m++) {  // 2→3월부터 (메타 2/27 시작)
      const g2025 = calcChange(fullMonth(2025, m), fullMonth(2025, m - 1));
      const g2026 = calcChange(fullMonth(2026, m), fullMonth(2026, m - 1));
      if (g2025 == null || g2026 == null) continue;
      const eff = g2026 - g2025;
      const add = eff * fullMonth(2026, m);
      added += add;
      rows.push({ span: `${m - 1}→${m}월`, g2025, g2026, effect: eff, added: add });
    }
    // 절대액 맥락 (2/27~latest)
    const absCur = sumPeriod(data, "2026-02-27", latest).revenue;
    const absLy = sumPeriod(data, shiftYear("2026-02-27", -1), shiftYear(latest, -1)).revenue;
    return { rows, added, diff: added - paidTotal, absCur, absLy, absGap: absCur - absLy };
  }, [data, latest]);

  if (loading) return <EmptyState message="데이터 불러오는 중..." />;
  if (!latest || !effect) return <EmptyState message="데이터 없음" />;

  // 타임라인 범위: 2/1 ~ 7/31
  const tlStart = new Date("2026-02-01").getTime();
  const tlEnd = new Date("2026-07-31").getTime();
  const span = tlEnd - tlStart;
  const pos = (d: string) => ((new Date(d).getTime() - tlStart) / span) * 100;
  const todayPos = Math.min(100, Math.max(0, pos(todayStr)));

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <SectionTitle sub="2026년 마케팅이 매출에 어떤 영향을 줬는지 — 2025년 같은 기간과만 비교합니다">마케팅 효과</SectionTitle>
        </div>
        <p className="text-[12px] text-[#475569] font-semibold">오늘 {now.getMonth() + 1}/{now.getDate()} 기준 · 최종 매출 입력일 {latest.slice(5).replace("-", "/")}</p>
      </div>

      {/* 비용 요약: 집행 완료 / 예정 / 총합 */}
      <div>
        <SectionTitle sub="실제 나간 비용과 앞으로 나갈(예정) 비용을 나눠서 봅니다 · 부가세 별도">마케팅 비용</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#1E3A8A] rounded-2xl p-4">
            <p className="text-xs font-bold text-white/80 mb-1">집행 완료(실제 나감)</p>
            <p className="text-2xl font-black text-white tnum">{fmtKRW(paidTotal, { compact: true })}</p>
            <p className="text-[10px] text-white/70 font-bold mt-1">메타 {fmtKRW(metaPaid, { compact: true })} · 인플 {fmtKRW(influencerPaid, { compact: true })}</p>
          </div>
          <div className="bg-white border-2 border-dashed border-[#94A3B8] rounded-2xl p-4">
            <p className="text-xs font-bold text-[#475569] mb-1">예정(아직 안 나감)</p>
            <p className="text-2xl font-black text-[#475569] tnum">{plannedTotal > 0 ? fmtKRW(plannedTotal, { compact: true }) : "미확정"}</p>
            <p className="text-[10px] text-[#94A3B8] font-bold mt-1">6·7월 인플루언서 견적 진행 중</p>
          </div>
          <div className="bg-white border-2 border-[#1E3A8A] rounded-2xl p-4">
            <p className="text-xs font-bold text-[#1E3A8A] mb-1">총합 (예정 포함)</p>
            <p className="text-2xl font-black text-[#1E3A8A] tnum">{fmtKRW(grandTotal, { compact: true })}</p>
            <p className="text-[10px] text-[#64748B] font-bold mt-1">{plannedTotal > 0 ? "확정 비용 + 예정" : "현재 = 집행 완료액"}</p>
          </div>
          <div className="bg-white border-2 border-[#CBD5E1] rounded-2xl p-4">
            <p className="text-xs font-bold text-[#475569] mb-1">진행 중 캠페인</p>
            <p className="text-2xl font-black text-black tnum">{campaigns.filter((c) => c.end === null).length}건</p>
            <p className="text-[10px] text-[#64748B] font-bold mt-1">메타 자체운영 등</p>
          </div>
        </div>
      </div>

      {/* 타임라인 (간트) */}
      <Card>
        <SectionTitle sub="각 광고·인플루언서가 언제 시작해서 언제까지인지 · 빨간 선이 오늘">마케팅 타임라인</SectionTitle>
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* 월 눈금 */}
            <div className="relative h-6 mb-1 ml-40">
              {["2월", "3월", "4월", "5월", "6월", "7월"].map((mm, i) => (
                <span key={mm} className="absolute text-[11px] font-bold text-[#64748B]" style={{ left: `${(i / 6) * 100}%` }}>{mm}</span>
              ))}
            </div>
            <div className="relative">
              {/* 오늘 선 */}
              <div className="absolute top-0 bottom-0 w-[2px] bg-[#B91C1C] z-10" style={{ left: `calc(10rem + ${todayPos}% * (100% - 10rem) / 100)` }}>
                <span className="absolute -top-0 left-1 text-[9px] font-black text-[#B91C1C] whitespace-nowrap">오늘</span>
              </div>
              <div className="space-y-1.5">
                {campaigns.map((c) => {
                  const left = Math.max(0, pos(c.start));
                  const right = c.end === null ? todayPos : Math.min(100, pos(c.end));
                  const width = Math.max(1.5, right - left);
                  const color = c.channel === "meta" ? "#1E3A8A" : "#0891B2";
                  const ongoing = c.end === null;
                  return (
                    <div key={c.id} className="flex items-center gap-2">
                      <div className="w-40 shrink-0 text-[11px] font-bold text-black truncate pr-2">
                        {c.label}{c.followers ? <span className="text-[#94A3B8]"> {c.followers}</span> : ""}
                      </div>
                      <div className="relative flex-1 h-5 bg-[#F1F5F9] rounded">
                        <div className="absolute h-5 rounded flex items-center px-1.5" style={{ left: `${left}%`, width: `${width}%`, background: color, opacity: ongoing ? 0.85 : 1 }}>
                          <span className="text-[9px] font-extrabold text-white whitespace-nowrap">{ongoing ? "진행 중" : c.status}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-4 mt-3 text-[11px] font-bold text-[#475569]">
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "#1E3A8A" }} /> 메타광고</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "#0891B2" }} /> 인플루언서</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-[2px]" style={{ background: "#B91C1C" }} /> 오늘</span>
        </div>
      </Card>

      {/* 월별 매출 2025 vs 2026 */}
      <Card>
        <SectionTitle sub="월마다 2026년 매출을 2025년 같은 기간과 나란히 — 마케팅 시작(2/27) 이후 흐름을 봅니다">월별 매출: 2026년 vs 2025년</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[#CBD5E1] bg-[#F1F5F9] text-[#475569]">
                <th className="text-left py-2 px-2 font-extrabold text-xs">월</th>
                <th className="text-right py-2 px-2 font-extrabold text-xs">2025년</th>
                <th className="text-right py-2 px-2 font-extrabold text-xs">2026년</th>
                <th className="text-right py-2 px-2 font-extrabold text-xs">차이</th>
                <th className="text-right py-2 px-2 font-extrabold text-xs">증감률</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((r) => (
                <tr key={r.m} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                  <td className="py-2.5 px-2 font-bold text-black">{r.label}{r.m === 3 ? <span className="ml-1 text-[10px] text-[#B45309] font-bold">*케이터링</span> : ""}</td>
                  <td className="py-2.5 px-2 text-right text-[#475569] tnum font-bold">{fmtKRW(r.y2025, { compact: true })}</td>
                  <td className="py-2.5 px-2 text-right text-black tnum font-extrabold">{fmtKRW(r.y2026, { compact: true })}</td>
                  <td className={`py-2.5 px-2 text-right tnum font-extrabold ${r.y2026 - r.y2025 >= 0 ? "text-[#15803D]" : "text-[#B91C1C]"}`}>{r.y2026 - r.y2025 >= 0 ? "+" : ""}{fmtKRW(r.y2026 - r.y2025, { compact: true })}</td>
                  <td className="py-2.5 px-2 text-right"><Delta value={r.ch} inline /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-[#64748B] font-semibold mt-3">* 2025년 3월은 일회성 케이터링 약 700만원이 포함돼 작년 숫자가 높습니다. 이 점을 감안해 보세요.</p>
      </Card>

      {/* 비용 대비 이득 (흐름 방식) */}
      <Card>
        <SectionTitle sub="마케팅이 '하락 흐름을 얼마나 늦췄는가'를 2025년 증감폭과 비교해 추정 · 완료된 달만">마케팅 비용과 이득</SectionTitle>

        {/* 흐름 효과 표 */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[#CBD5E1] bg-[#F1F5F9] text-[#475569]">
                <th className="text-left py-2 px-2 font-extrabold text-xs">구간</th>
                <th className="text-right py-2 px-2 font-extrabold text-xs">2025 증감폭</th>
                <th className="text-right py-2 px-2 font-extrabold text-xs">2026 증감폭</th>
                <th className="text-right py-2 px-2 font-extrabold text-xs">작년보다 더 늘어난 매출</th>
              </tr>
            </thead>
            <tbody>
              {effect.rows.map((r) => (
                <tr key={r.span} className="border-b border-[#E2E8F0]">
                  <td className="py-2.5 px-2 font-bold text-black">{r.span}</td>
                  <td className="py-2.5 px-2 text-right tnum font-bold text-[#475569]">{fmtPct(r.g2025)}</td>
                  <td className="py-2.5 px-2 text-right tnum font-bold text-black">{fmtPct(r.g2026)}</td>
                  <td className={`py-2.5 px-2 text-right tnum font-extrabold ${r.added >= 0 ? "text-[#15803D]" : "text-[#B91C1C]"}`}>{r.added >= 0 ? "+" : ""}{fmtKRW(r.added, { compact: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-[#F0FDF4] border border-[#15803D]/30 rounded-2xl p-4">
            <p className="text-xs font-bold text-[#15803D] mb-1">마케팅으로 늘어난 추정 매출 (이득)</p>
            <p className={`text-xl font-black tnum ${effect.added >= 0 ? "text-[#15803D]" : "text-[#B91C1C]"}`}>{effect.added >= 0 ? "+" : ""}{fmtKRW(effect.added, { compact: true })}</p>
            <p className="text-[10px] text-[#64748B] font-bold mt-1">2025년 흐름보다 더 늘어난 분</p>
          </div>
          <div className="bg-[#F1F5F9] rounded-2xl p-4">
            <p className="text-xs font-bold text-[#475569] mb-1">집행 비용</p>
            <p className="text-xl font-black text-black tnum">{fmtKRW(paidTotal, { compact: true })}</p>
            <p className="text-[10px] text-[#64748B] font-bold mt-1">메타 + 인플루언서</p>
          </div>
          <div className="bg-white border-2 border-[#1E3A8A] rounded-2xl p-4">
            <p className="text-xs font-bold text-[#1E3A8A] mb-1">마케팅 비용과 이득의 차액</p>
            <p className={`text-xl font-black tnum ${effect.diff >= 0 ? "text-[#15803D]" : "text-[#B45309]"}`}>{effect.diff >= 0 ? "+" : ""}{fmtKRW(effect.diff, { compact: true })}</p>
            <p className="text-[10px] text-[#64748B] font-bold mt-1">{effect.diff >= 0 ? "이득이 비용을 넘어섬" : "회수 진행 중"}</p>
          </div>
        </div>

        <div className="p-4 bg-[#EFF6FF] border border-[#1E3A8A]/20 rounded-xl space-y-1.5">
          <p className="text-sm font-bold text-black">
            ▣ 마케팅 시작 후 월별 증감폭이 2025년보다 좋아진 만큼을 더하면, 작년 흐름 대비 약 <span className={`font-black ${effect.added >= 0 ? "text-[#15803D]" : "text-[#B91C1C]"}`}>{fmtKRW(effect.added)}</span>의 매출이 더 발생한 것으로 추정됩니다. 집행 비용({fmtKRW(paidTotal, { compact: true })})과 비교하면 {effect.diff >= 0 ? "이득이 더 큽니다." : "아직 비용을 다 회수하진 못했습니다."}
          </p>
          <p className="text-xs text-[#475569] font-semibold pt-1">※ 봄 시즌·날씨·VIP 멤버십 등 다른 요인도 섞여 있어 전부 마케팅 효과로 단정하긴 어렵습니다. 인플루언서는 게시 후 누적으로 나타나므로 6·7월까지 지켜볼 필요가 있습니다. 2025년 3월은 케이터링 700만원 포함이라 그 구간 증감폭은 작년이 부풀려져 있습니다.</p>
        </div>
      </Card>
    </div>
  );
}
