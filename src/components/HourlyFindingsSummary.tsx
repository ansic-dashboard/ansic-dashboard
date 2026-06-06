"use client";
import { Card } from "@/components/ui";

/**
 * 시간대·요일 분석 확정 결론 (2026년 1~5월 기준)
 * - 출처: OKPOS 시간대별(점심/저녁) + 매출표 기반 분석 결과
 * - raw 시간대 파일이 업로드되기 전에도 항상 표시되는 요약
 */

const SHARE = [
  { day: "월", dinner: 32 },
  { day: "화", dinner: 33 },
  { day: "수", dinner: 31 },
  { day: "목", dinner: 30 },
  { day: "금", dinner: 38 },
  { day: "토", dinner: 47 },
  { day: "일", dinner: 41 },
];

function Stat({ label, value, sub, tone = "navy" }: { label: string; value: string; sub?: string; tone?: "navy" | "up" | "down" }) {
  const color = tone === "up" ? "#15803D" : tone === "down" ? "#B91C1C" : "#1E3A8A";
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <p className="text-xs font-bold text-[#475569]">{label}</p>
      <p className="tnum text-2xl font-extrabold mt-1" style={{ color }}>{value}</p>
      {sub && <p className="text-[11px] font-semibold text-[#64748B] mt-0.5">{sub}</p>}
    </div>
  );
}

export default function HourlyFindingsSummary() {
  const maxDinner = Math.max(...SHARE.map((s) => s.dinner));
  return (
    <Card>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <p className="text-base font-extrabold text-black">시간대·요일 분석 결론</p>
        <span className="text-[11px] font-bold text-[#64748B]">2026년 1~5월 · 전년 동기 대비</span>
      </div>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="점심 매출" value="-5%" sub="거의 유지" tone="down" />
        <Stat label="저녁 매출" value="-34%" sub="2월부터 붕괴" tone="down" />
        <Stat label="방문 인원" value="-21%" sub="매출 감소의 주원인" tone="down" />
        <Stat label="피크 시간" value="13시" sub="점심대 집중" tone="navy" />
      </div>

      {/* 유입 경로 */}
      <p className="text-sm font-extrabold text-black mt-5 mb-2">예약 유입 경로 변화</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="전화 예약" value="-49%" tone="down" />
        <Stat label="캐치테이블" value="-46%" tone="down" />
        <Stat label="네이버 조회" value="+66%" tone="up" />
        <Stat label="워크인(신규)" value="+15%" tone="up" />
      </div>

      {/* 요일별 저녁 비중 */}
      <p className="text-sm font-extrabold text-black mt-5 mb-2">요일별 저녁 매출 비중</p>
      <div className="space-y-1.5">
        {SHARE.map((s) => (
          <div key={s.day} className="flex items-center gap-3">
            <span className="w-6 text-xs font-extrabold text-[#334155]">{s.day}</span>
            <div className="flex-1 h-5 rounded bg-[#F1F5F9] overflow-hidden">
              <div
                className="h-full rounded"
                style={{
                  width: `${(s.dinner / maxDinner) * 100}%`,
                  background: s.dinner >= 45 ? "#1E3A8A" : s.dinner <= 32 ? "#CBD5E1" : "#60A5FA",
                }}
              />
            </div>
            <span className="tnum w-10 text-right text-xs font-extrabold text-black">{s.dinner}%</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] font-semibold text-[#64748B] mt-2">
        토요일 저녁이 가장 강하고(47%), 평일(특히 목요일 30%)은 저녁이 약합니다. 점심 11~15시 / 저녁 16~21시 기준.
      </p>

      {/* 진단 */}
      <div className="mt-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4">
        <p className="text-xs font-extrabold text-[#1E3A8A] mb-1">진단</p>
        <p className="text-[13px] font-semibold text-[#334155] leading-relaxed">
          매출 감소는 객단가 하락이 아니라 <b>방문 인원 감소</b> 때문입니다. 객단가는 오히려 올랐습니다.
          점심은 버티는데 평일 저녁이 빠졌고, 워크인(신규)은 늘었습니다. 신상 붐이 식은 자리를 재방문 고객이
          못 채운 것으로, 평일 저녁 디너 회복(재방문 유도)이 핵심 과제입니다.
        </p>
      </div>

      <p className="text-[11px] font-semibold text-[#94A3B8] mt-3">
        ※ 위 결론은 OKPOS 시간대별 자료로 분석한 확정 수치입니다. 아래에 시간대별 원본(.xls)을 올리면 월별·시간대별 상세가 자동으로 갱신됩니다.
      </p>
    </Card>
  );
}
