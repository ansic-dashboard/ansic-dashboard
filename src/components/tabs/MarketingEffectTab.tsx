"use client";
import { useMemo } from "react";
import { useSales, useNotes } from "@/lib/hooks";
import {
  summaryStatements, monthlyCompare, effectRows, addedRevenueTotal,
  cateringNote, costItems, totalCost, summary, activityRows, preMarketingNote,
} from "@/lib/marketing-analysis";
import { monthTotal, calcChange, fmtKRW, fmtPct, fmtDate, getLatestDate } from "@/lib/sales-analyzer";
import { Card, SectionTitle, Delta, Badge, EditableText, EmptyState, SummaryHeader } from "@/components/ui";

export default function MarketingEffectTab() {
  const { data, loading } = useSales();
  const { notes, saveNote } = useNotes();

  // 2026년 매출은 실시간으로 갱신 (과거는 고정)
  const liveMonthly = useMemo(() => {
    return monthlyCompare.map((row) => {
      const mNum = parseInt(row.month, 10);
      if (!mNum || mNum > 12 || row.month.includes("1~20")) return row;
      const live = monthTotal(data, 2026, mNum).revenue;
      if (live > 0) {
        return { ...row, y2026: live, vs2025full: calcChange(live, row.y2025full), vs2025ex: calcChange(live, row.y2025exCatering) };
      }
      return row;
    });
  }, [data]);

  if (loading) return <EmptyState message="데이터 불러오는 중..." />;
  const note = (key: string, def: string) => notes[key] ?? def;

  return (
    <div className="space-y-6">
      {/* === 상단 핵심 요약 === */}
      <SummaryHeader
        title="마케팅 효과 한눈에 보기"
        sub="2026년 2월 마케팅 시작 후 ~ 5월 20일 기준"
        metrics={[
          { label: "쓴 마케팅 비용", value: fmtKRW(totalCost, { compact: true }) },
          { label: "마케팅으로 늘어난 추정 매출", value: fmtKRW(addedRevenueTotal, { compact: true }), tone: "good" },
          { label: "아직 회수 못한 차액", value: fmtKRW(summary.diff, { compact: true }), tone: "down" },
          { label: "진행 중인 캠페인", value: `${costItems.filter(c => c.status === "ongoing").length}건`, tone: "warn" },
        ]}
      />

      {/* 핵심 요약 문장 (편집 가능) */}
      <Card>
        <SectionTitle sub="줄을 클릭하면 직접 수정할 수 있어요">핵심 요약</SectionTitle>
        <ol className="space-y-3">
          {summaryStatements.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-black text-[#1E3A8A] text-base shrink-0">{i + 1}.</span>
              <div className="flex-1"><EditableText value={note(`mkt_summary_${i}`, s)} onSave={(v) => saveNote(`mkt_summary_${i}`, v)} multiline className="text-black font-bold leading-relaxed" /></div>
            </li>
          ))}
        </ol>
      </Card>

      {/* === ① 비용 vs 늘어난 매출 (둘 다, 진행중 명시) === */}
      <Card>
        <SectionTitle sub="아직 진행 중이라 최종 결과가 아니에요">① 쓴 비용 vs 늘어난 매출</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-white border-2 border-[#CBD5E1] rounded-2xl p-4">
            <p className="text-xs font-extrabold text-[#475569] mb-1">쓴 마케팅 비용</p>
            <p className="text-2xl font-black text-black tnum">{fmtKRW(totalCost, { compact: true })}</p>
            <p className="text-[10px] text-[#64748B] font-bold mt-1">메타광고 + 인플루언서 (부가세 별도)</p>
          </div>
          <div className="bg-[#F0FDF4] border-2 border-[#15803D] rounded-2xl p-4">
            <p className="text-xs font-extrabold text-[#15803D] mb-1">마케팅으로 늘어난 추정 매출</p>
            <p className="text-2xl font-black text-[#15803D] tnum">{fmtKRW(addedRevenueTotal, { compact: true })}</p>
            <p className="text-[10px] text-[#15803D] font-bold mt-1">예년 자연 증가분을 뺀 추가 상승분</p>
          </div>
          <div className="bg-[#FEF2F2] border-2 border-[#B91C1C] rounded-2xl p-4">
            <p className="text-xs font-extrabold text-[#B91C1C] mb-1">아직 회수 못한 차액</p>
            <p className="text-2xl font-black text-[#B91C1C] tnum">{fmtKRW(summary.diff, { compact: true })}</p>
            <p className="text-[10px] text-[#B91C1C] font-bold mt-1">늘어난 매출 − 비용</p>
          </div>
        </div>
        <div className="p-4 bg-[#FFFBEB] border border-[#B45309] rounded-xl">
          <p className="text-sm font-bold text-black leading-relaxed">
            <span className="font-black">아직 비용을 다 회수하진 못했어요(약 -104만원).</span> 하지만 인플루언서·광고 효과는 보통 게시 후 몇 주~몇 달 뒤에 천천히 나타나고, <span className="font-black">5월은 아직 1~20일치만</span> 반영된 잠정치예요. 월 전체로 보면 차이는 더 좁혀질 가능성이 큽니다.
          </p>
        </div>
      </Card>

      {/* === ② 마케팅 활동 타임라인 (누가 언제 무엇을) === */}
      <Card>
        <SectionTitle sub="누가 · 언제 · 무엇을 했는지">② 마케팅 활동 타임라인</SectionTitle>
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

      {/* === ③ 마케팅 효과: 자연 증가 vs 올해 실제 === */}
      <Card>
        <SectionTitle sub="예년에 자연스럽게 늘던 만큼(자연 평균)을 빼고, 올해 더 늘어난 부분이 마케팅 효과">
          ③ 마케팅으로 더 늘어난 매출
        </SectionTitle>
        <div className="overflow-x-auto mb-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[#CBD5E1] bg-[#F1F5F9] text-[#475569]">
                <th className="text-left py-2 px-2 font-extrabold text-xs">구간</th>
                <th className="text-left py-2 px-2 font-extrabold text-xs">마케팅</th>
                <th className="text-right py-2 px-2 font-extrabold text-xs">예년 자연<br/>증가</th>
                <th className="text-right py-2 px-2 font-extrabold text-xs">올해 실제<br/>증가</th>
                <th className="text-right py-2 px-2 font-extrabold text-xs">마케팅<br/>효과</th>
                <th className="text-right py-2 px-2 font-extrabold text-xs">늘어난<br/>매출</th>
              </tr>
            </thead>
            <tbody>
              {effectRows.map((r, i) => (
                <tr key={i} className={`border-b border-[#E2E8F0] ${r.highlight ? "bg-[#F0FDF4]" : ""}`}>
                  <td className="py-3 px-2 font-extrabold text-black whitespace-nowrap">{r.span}</td>
                  <td className="py-3 px-2 text-[10px] text-[#475569] font-bold">{r.marketing}</td>
                  <td className="py-3 px-2 text-right tnum text-[#475569] font-medium">{fmtPct(r.natural)}</td>
                  <td className="py-3 px-2 text-right tnum font-black text-black">{fmtPct(r.y2026)}</td>
                  <td className="py-3 px-2 text-right tnum"><span className="font-black text-[#15803D]">+{(r.effect * 100).toFixed(1)}%p</span></td>
                  <td className="py-3 px-2 text-right tnum font-black text-[#1E3A8A]">{fmtKRW(r.addedRevenue, { compact: true })}</td>
                </tr>
              ))}
              <tr className="bg-[#1E3A8A]">
                <td colSpan={5} className="py-3 px-2 font-black text-white text-right">마케팅으로 늘어난 추정 매출 합계</td>
                <td className="py-3 px-2 text-right font-black text-white tnum">{fmtKRW(addedRevenueTotal, { compact: true })}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[#64748B] font-medium leading-relaxed">
          ※ 계산 방법: 각 구간의 '늘어난 매출' = 그 달 매출 × 마케팅 효과(%p). 예) 2→3월은 {effectRows[0].formula}.
        </p>
      </Card>

      {/* === ④ 월별 총매출 비교 === */}
      <Card>
        <SectionTitle sub="2026년 매출은 실시간으로 자동 갱신 · 2025년은 케이터링 포함/제외 둘 다 표시">
          ④ 작년·재작년과 월별 매출 비교
        </SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[#CBD5E1] bg-[#F1F5F9] text-[#475569]">
                <th className="text-left py-2 px-2 font-extrabold text-xs">월</th>
                <th className="text-right py-2 px-2 font-extrabold text-xs">2024</th>
                <th className="text-right py-2 px-2 font-extrabold text-xs">2025<br/>(케이터링 포함)</th>
                <th className="text-right py-2 px-2 font-extrabold text-xs">2025<br/>(케이터링 제외)</th>
                <th className="text-right py-2 px-2 font-extrabold text-xs">2026</th>
                <th className="text-right py-2 px-2 font-extrabold text-xs">작년 대비<br/>(제외 기준)</th>
              </tr>
            </thead>
            <tbody>
              {liveMonthly.map((r, i) => (
                <tr key={i} className={`border-b border-[#E2E8F0] hover:bg-[#F8FAFC] ${r.hasCatering ? "bg-[#FFFBEB]" : ""}`}>
                  <td className="py-3 px-2 font-extrabold text-black">{r.month}</td>
                  <td className="py-3 px-2 text-right tnum text-[#64748B] font-medium">{(r.y2024 / 10000).toFixed(0)}만</td>
                  <td className="py-3 px-2 text-right tnum text-[#475569] font-medium">{(r.y2025full / 10000).toFixed(0)}만</td>
                  <td className="py-3 px-2 text-right tnum font-bold text-black">{r.y2025exCatering !== r.y2025full ? `${(r.y2025exCatering / 10000).toFixed(0)}만` : "동일"}</td>
                  <td className="py-3 px-2 text-right tnum font-black text-black">{(r.y2026 / 10000).toFixed(0)}만</td>
                  <td className="py-3 px-2 text-right tnum">{r.vs2025ex !== null ? <Delta value={r.vs2025ex} inline /> : <span className="text-[10px] text-[#64748B] font-bold">기준</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[#64748B] mt-3 font-medium">※ 노란 줄(3월)은 케이터링 700만원이 들어있던 달이에요.</p>
      </Card>

      {/* === ⑤ 케이터링 매출 이야기 === */}
      <Card className="bg-[#FFFBEB] border-[#B45309]">
        <div className="flex items-baseline gap-2 mb-1"><Badge tone="warn">왜 따로 보나요?</Badge></div>
        <SectionTitle sub={cateringNote.description}>⑤ {cateringNote.title}</SectionTitle>
        <table className="w-full text-sm">
          <tbody>
            {cateringNote.rows.map((row, i) => {
              const t = row.type;
              const bg = t === "result" ? "bg-[#DBEAFE]" : "";
              const color = t === "add" ? "text-[#15803D]" : t === "subtract" ? "text-[#B91C1C]" :
                t === "result" ? "text-[#1E3A8A]" : t === "diff" ? (row.value < 0 ? "text-[#B91C1C]" : "text-[#15803D]") : "text-black";
              return (
                <tr key={i} className={`border-b border-[#FCD34D] ${bg}`}>
                  <td className="py-2.5 px-2 font-bold text-black">{row.label}</td>
                  <td className={`py-2.5 px-2 text-right tnum font-black ${color}`}>{t === "diff" ? fmtKRW(row.value, { sign: true }) : fmtKRW(Math.abs(row.value))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-sm font-black text-[#B45309] mt-3">→ {cateringNote.conclusion}</p>
      </Card>

      {/* === ⑥ 비용 상세 === */}
      <Card>
        <SectionTitle sub="실제로 돈이 나간 것만 (메타광고 · 인플루언서)">⑥ 마케팅 비용 상세</SectionTitle>
        <div className="space-y-3">
          {costItems.map((c, i) => (
            <div key={i} className="bg-white border border-[#CBD5E1] rounded-xl p-3">
              <div className="flex items-baseline gap-2 flex-wrap mb-1">
                <span className="text-sm font-black text-black tnum">{fmtDate(c.date, "long")}</span>
                <Badge tone={c.type === "meta" ? "info" : "good"}>{c.type === "meta" ? "메타광고" : "인플루언서"}</Badge>
                {c.status === "ongoing" ? <Badge tone="warn">진행 중</Badge> : <Badge tone="good">완료</Badge>}
              </div>
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <p className="text-base font-extrabold text-black">{c.title}</p>
                <p className="text-lg font-black text-[#1E3A8A] tnum">{fmtKRW(c.cost)}</p>
              </div>
              <div className="mt-2 pt-2 border-t border-[#E2E8F0] flex flex-wrap gap-x-3 gap-y-1">
                {c.details.map((b, j) => (
                  <span key={j} className="text-xs text-black font-medium"><span className="text-[#64748B]">{b.label}</span> {fmtKRW(b.amount, { compact: true })}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t-2 border-[#CBD5E1] flex items-baseline justify-between">
          <span className="text-sm font-black text-black">총 마케팅 비용 (부가세 별도)</span>
          <span className="text-2xl font-black text-[#1E3A8A] tnum">{fmtKRW(totalCost)}</span>
        </div>
      </Card>

      {/* === 참고 / 주의 (편집 가능) === */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-[#F1F5F9] border-[#CBD5E1]">
          <div className="mb-2"><Badge tone="neutral">참고하면 좋은 점</Badge></div>
          <EditableText value={note("mkt_reference", preMarketingNote.reference)} onSave={(v) => saveNote("mkt_reference", v)} multiline className="text-sm text-black font-bold leading-relaxed" />
        </Card>
        <Card className="bg-[#FEF2F2] border-[#B91C1C]">
          <div className="mb-2"><Badge tone="down">주의해서 볼 점</Badge></div>
          <EditableText value={note("mkt_caution", preMarketingNote.caution)} onSave={(v) => saveNote("mkt_caution", v)} multiline className="text-sm text-black font-bold leading-relaxed" />
        </Card>
      </div>
    </div>
  );
}
