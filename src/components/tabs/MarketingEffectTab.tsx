"use client";
import { useMemo, useState } from "react";
import { useCampaigns } from "@/lib/hooks";
import {
  summaryStatements, monthlyRows, cateringAdjustmentNote, costTimeline,
  totalCost, addedRows, addedTotal, preMarketingNote
} from "@/lib/marketing-analysis";
import { fmtKRW, fmtPct, fmtDate } from "@/lib/sales-analyzer";
import { Card, SectionTitle, Delta, Badge, EditableText } from "@/components/ui";

export default function MarketingEffectTab() {
  const { data: campaigns, reload } = useCampaigns();
  
  // 핵심 요약 편집 가능 (로컬 스토리지)
  const [editableSummary, setEditableSummary] = useState<string[]>(summaryStatements);

  // 캠페인 비용 합계
  const dbCostTotal = useMemo(() => {
    if (!campaigns || campaigns.length === 0) return totalCost;
    return campaigns.reduce((s: number, c: any) => s + (c.cost ?? 0), 0);
  }, [campaigns]);

  return (
    <div className="space-y-6">
      {/* 1. 핵심 요약 */}
      <Card>
        <SectionTitle sub="2026.05 기준 한 페이지 요약 (각 줄 클릭해서 수정 가능)">핵심 요약</SectionTitle>
        <ol className="space-y-3">
          {editableSummary.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed">
              <span className="font-black text-[#1E3A8A] tnum shrink-0 text-base">{i + 1}.</span>
              <div className="flex-1">
                <EditableText
                  value={s}
                  onSave={(v) => {
                    const next = [...editableSummary];
                    next[i] = v;
                    setEditableSummary(next);
                  }}
                  multiline
                  className="text-black font-bold leading-relaxed"
                />
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {/* 2. 월별 매출 + 전월 대비 증감폭 비교 */}
      <Card>
        <SectionTitle sub="2024 · 2025 · 2026년 월별 매출과 전월 대비 증감폭 — 같은 달끼리 3개년 비교">
          ① 월별 총매출 및 전월 대비 증감폭
        </SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[#CBD5E1] text-[#334155] bg-[#F1F5F9]">
                <th className="text-left py-2 px-2 font-extrabold text-xs">월</th>
                <th className="text-right py-2 px-2 font-extrabold text-xs">2024 매출</th>
                <th className="text-right py-2 px-2 font-extrabold text-xs">2025 매출</th>
                <th className="text-right py-2 px-2 font-extrabold text-xs">2026 매출</th>
                <th className="text-right py-2 px-2 font-extrabold text-xs">2024 증감</th>
                <th className="text-right py-2 px-2 font-extrabold text-xs">2025 증감</th>
                <th className="text-right py-2 px-2 font-extrabold text-xs">2026 증감</th>
                <th className="text-right py-2 px-2 font-extrabold text-xs">차이<br/>(2026-2025)</th>
                <th className="text-left py-2 px-2 font-extrabold text-xs">마케팅 활동</th>
              </tr>
            </thead>
            <tbody>
              {monthlyRows.map((r, i) => (
                <tr key={i} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                  <td className="py-3 px-2 font-extrabold text-black">{r.month}</td>
                  <td className="py-3 px-2 text-right tnum text-[#334155] font-medium">{(r.y2024Sales / 10000).toFixed(0)}만</td>
                  <td className="py-3 px-2 text-right tnum text-[#334155] font-medium">{(r.y2025Sales / 10000).toFixed(0)}만</td>
                  <td className="py-3 px-2 text-right tnum font-extrabold text-black">{(r.y2026Sales / 10000).toFixed(0)}만</td>
                  <td className="py-3 px-2 text-right tnum"><Delta value={r.y2024Change} /></td>
                  <td className="py-3 px-2 text-right tnum"><Delta value={r.y2025Change} /></td>
                  <td className="py-3 px-2 text-right tnum"><Delta value={r.y2026Change} /></td>
                  <td className="py-3 px-2 text-right tnum">
                    {r.diff !== null ? <Delta value={r.diff} suffix="p" /> : <span className="text-xs text-[#64748B] font-bold">비교 불가</span>}
                  </td>
                  <td className="py-3 px-2 text-[10px] text-[#334155] font-bold">{r.marketing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[#64748B] mt-3 font-medium">
          ※ "증감" = 같은 연도 안에서 직전 달과 비교한 증감률 (예: 2026년 2월 증감 = (2026.02 - 2026.01) / 2026.01)
        </p>
      </Card>

      {/* 3. 케이터링 조정 후 참고 비교 */}
      <Card className="bg-[#FFFBEB] border-[#B45309]">
        <div className="flex items-baseline gap-2 mb-3">
          <Badge tone="warn">참고</Badge>
          <SectionTitle sub={cateringAdjustmentNote.description}>
            ② {cateringAdjustmentNote.title}
          </SectionTitle>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {cateringAdjustmentNote.rows.map((row, i) => (
              <tr key={i} className={`border-b border-[#FCD34D] ${i === cateringAdjustmentNote.rows.length - 1 ? 'bg-white' : ''}`}>
                <td className="py-2 px-2 font-bold text-black">{row.label}</td>
                <td className={`py-2 px-2 text-right tnum font-extrabold ${
                  i === cateringAdjustmentNote.rows.length - 1 
                    ? (row.value < 0 ? 'text-[#B91C1C]' : 'text-[#15803D]')
                    : 'text-black'
                }`}>
                  {fmtKRW(row.value, { sign: i === cateringAdjustmentNote.rows.length - 1 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-sm font-extrabold text-[#B45309] mt-3">→ {cateringAdjustmentNote.conclusion}</p>
      </Card>

      {/* 4. 마케팅 비용 타임라인 */}
      <Card>
        <SectionTitle sub="진행 날짜순으로 정리한 비용 흐름">③ 마케팅 비용 타임라인</SectionTitle>
        <CostTimeline campaigns={campaigns} />
        <div className="mt-4 pt-4 border-t-2 border-[#CBD5E1] flex items-baseline justify-between">
          <span className="text-sm font-extrabold text-black">총 마케팅 비용</span>
          <span className="text-2xl font-black text-[#1E3A8A] tnum">{fmtKRW(dbCostTotal)}</span>
        </div>
      </Card>

      {/* 5. 추정 추가 매출 */}
      <Card>
        <SectionTitle sub="해당 월 매출 × 마케팅 효과(%p) = 마케팅으로 인해 추가로 발생한 것으로 추정되는 매출">
          ④ 마케팅으로 늘어난 추정 매출
        </SectionTitle>
        <div className="space-y-2">
          {addedRows.map((r, i) => (
            <div key={i} className="flex items-baseline justify-between bg-white border border-[#CBD5E1] rounded-lg p-3">
              <div>
                <p className="text-sm font-extrabold text-black">{r.segment}</p>
                <p className="text-xs text-[#334155] font-medium mt-0.5">{r.basis}</p>
              </div>
              <p className="text-lg font-black text-[#15803D] tnum">+{fmtKRW(r.added, { compact: true })}</p>
            </div>
          ))}
          <div className="flex items-baseline justify-between bg-[#DBEAFE] border-2 border-[#1E3A8A] rounded-lg p-4 mt-3">
            <p className="text-sm font-extrabold text-[#1E3A8A]">합계</p>
            <p className="text-2xl font-black text-[#1E3A8A] tnum">+{fmtKRW(addedTotal, { compact: true })}</p>
          </div>
        </div>
      </Card>

      {/* 6. 종합 비교 */}
      <Card>
        <SectionTitle>⑤ 종합 — 비용 대비 효과</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white border border-[#CBD5E1] rounded-lg p-4 text-center">
            <p className="text-xs text-[#334155] font-bold mb-1">마케팅 비용</p>
            <p className="text-2xl font-black text-black tnum">{fmtKRW(dbCostTotal, { compact: true })}</p>
          </div>
          <div className="bg-white border border-[#CBD5E1] rounded-lg p-4 text-center">
            <p className="text-xs text-[#334155] font-bold mb-1">추정 추가 매출</p>
            <p className="text-2xl font-black text-black tnum">{fmtKRW(addedTotal, { compact: true })}</p>
          </div>
          <div className={`border-2 rounded-lg p-4 text-center ${
            addedTotal - dbCostTotal >= 0 ? "bg-[#F0FDF4] border-[#15803D]" : "bg-[#FEF2F2] border-[#B91C1C]"
          }`}>
            <p className="text-xs text-[#334155] font-bold mb-1">차액 (효과 − 비용)</p>
            <p className={`text-2xl font-black tnum ${addedTotal - dbCostTotal >= 0 ? "text-[#15803D]" : "text-[#B91C1C]"}`}>
              {fmtKRW(addedTotal - dbCostTotal, { compact: true, sign: true })}
            </p>
          </div>
        </div>
      </Card>

      {/* 7. 참고: 마케팅 시작 전 */}
      <Card className="bg-[#F1F5F9] border-[#CBD5E1]">
        <div className="flex items-baseline gap-2 mb-2">
          <Badge tone="neutral">참고</Badge>
          <h3 className="text-base font-extrabold text-black">{preMarketingNote.title}</h3>
        </div>
        <p className="text-sm text-black font-medium mb-2 leading-relaxed">{preMarketingNote.detail}</p>
        <p className="text-sm font-extrabold text-[#1E3A8A]">→ {preMarketingNote.conclusion}</p>
      </Card>

      {/* 8. 주의 */}
      <Card className="bg-[#FEF2F2] border-[#B91C1C]">
        <div className="flex items-baseline gap-2 mb-2">
          <Badge tone="down">주의</Badge>
          <h3 className="text-base font-extrabold text-black">이 추정 매출, 다 마케팅 덕은 아닐 수 있음</h3>
        </div>
        <p className="text-sm font-bold text-black mb-2">함께 영향을 줬을 만한 요인들:</p>
        <ul className="space-y-1 text-sm text-black font-medium">
          <li>• 봄철 정원이 예쁜 시기 (4~5월)</li>
          <li>• 테라스 에어컨·폴딩도어 설치로 좌석 더 쓰게 됨</li>
          <li>• VIP 멤버십(구 화이트카드)으로 회사원 워크인 늘어남</li>
          <li>• 날씨, 캐치테이블 노출, 인근 매장 변화 등</li>
        </ul>
        <p className="text-xs font-bold text-[#B91C1C] mt-3 italic">
          → '마케팅을 포함한 여러 노력의 결과'로 봐주세요.
        </p>
      </Card>
    </div>
  );
}

/** 가로 타임라인 형태의 비용 표시 */
function CostTimeline({ campaigns }: { campaigns: any[] }) {
  const items = campaigns && campaigns.length > 0
    ? campaigns.map((c: any) => ({
        date: c.start_date,
        type: c.type,
        title: c.title,
        cost: c.cost,
        breakdown: c.cost_breakdown ?? [],
        status: c.status ?? "completed",
        description: c.description,
      }))
    : costTimeline.map(c => ({
        date: c.date,
        type: c.type,
        title: c.title,
        cost: c.cost,
        breakdown: c.details,
        status: c.status,
        description: c.note,
      }));

  const sorted = [...items].sort((a, b) => (a.date < b.date ? -1 : 1));

  return (
    <div className="relative">
      <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-[#CBD5E1]" />
      <div className="space-y-3">
        {sorted.map((item, i) => {
          const isOngoing = item.status === "ongoing";
          const dotColor = isOngoing ? "bg-[#B45309]" : "bg-[#15803D]";
          const typeColor = item.type === "meta" ? "bg-[#1E3A8A]" : "bg-[#15803D]";
          const typeLabel = item.type === "meta" ? "메타광고" : item.type === "influencer" ? "인플루언서" : "기타";
          return (
            <div key={i} className="relative pl-10">
              <div className={`absolute left-1 top-1 w-5 h-5 rounded-full ${dotColor} border-2 border-white ${isOngoing ? "pulse-dot" : ""}`} />
              <div className="bg-white border border-[#CBD5E1] rounded-lg p-3">
                <div className="flex items-baseline gap-2 flex-wrap mb-1">
                  <span className="text-sm font-extrabold text-black tnum">{fmtDate(item.date, "long")}</span>
                  <span className={`text-[10px] font-extrabold text-white px-1.5 py-0.5 rounded ${typeColor}`}>
                    {typeLabel}
                  </span>
                  {isOngoing ? <Badge tone="warn">진행 중</Badge> : <Badge tone="good">완료</Badge>}
                </div>
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <p className="text-base font-extrabold text-black">{item.title}</p>
                  <p className="text-lg font-black text-[#1E3A8A] tnum">{fmtKRW(item.cost)}</p>
                </div>
                {item.description && <p className="text-xs text-[#334155] mt-1 font-medium">{item.description}</p>}
                {item.breakdown && item.breakdown.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#E2E8F0]">
                    <p className="text-[10px] font-bold text-[#64748B] mb-1">비용 내역</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {item.breakdown.map((b: any, j: number) => (
                        <span key={j} className="text-xs text-black font-medium">
                          <span className="text-[#334155]">{b.label}</span> {fmtKRW(b.amount, { compact: true })}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
