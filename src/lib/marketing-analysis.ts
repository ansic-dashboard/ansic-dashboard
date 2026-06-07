/**
 * 마케팅 데이터 (캠페인·비용·타임라인)
 * - 효과(이득) 계산은 MarketingEffectTab에서 "라이브 매출(2026) vs 2025년 같은 기간"으로 계산한다.
 *   (2024·2025 평균 같은 '예년' 개념은 쓰지 않는다. 오직 2025년과만 비교.)
 * - 비용은 집행 완료 / 예정(미집행)으로 분리한다.
 */

export type Campaign = {
  id: string;
  label: string;
  channel: "meta" | "influencer";
  followers?: string;
  start: string;          // 시작(촬영·게시) 날짜
  end: string | null;     // null = 진행 중(ongoing)
  cost: number;
  paid: boolean;          // 비용 집행 완료 여부
  status: string;         // 표시용 상태
  videoUrl?: string;
};

// ── 집행 완료(비용 나간) 캠페인 ──
export const campaigns: Campaign[] = [
  { id: "meta1", label: "메타광고 1차 (드리븐 대행)", channel: "meta", start: "2026-02-27", end: "2026-04-13", cost: 4450000, paid: true, status: "완료" },
  { id: "meta2", label: "메타광고 2차 (자체 운영)", channel: "meta", start: "2026-04-14", end: null, cost: 1906225, paid: true, status: "진행 중" },
  { id: "inf_seoulhotple", label: "서울핫플", followers: "51.3만", channel: "influencer", start: "2026-04-16", end: "2026-05-16", cost: 800000, paid: true, status: "업로드 완료" },
  { id: "inf_heyjihye", label: "헤이지혜", followers: "23.8만", channel: "influencer", start: "2026-04-23", end: "2026-05-23", cost: 900000, paid: true, status: "업로드 완료" },
  { id: "inf_ayami", label: "아야미 (일본)", followers: "2.2만", channel: "influencer", start: "2026-04-24", end: "2026-05-24", cost: 250000, paid: true, status: "업로드 완료" },
  { id: "inf_choi", label: "최호준", followers: "4.5만", channel: "influencer", start: "2026-05-11", end: "2026-06-11", cost: 800000, paid: true, status: "업로드 완료" },
  { id: "inf_musteat", label: "머스트잇", followers: "7.8만", channel: "influencer", start: "2026-05-23", end: "2026-06-23", cost: 650000, paid: true, status: "업로드 완료" },
  { id: "inf_komin", label: "고민", followers: "5.9만", channel: "influencer", start: "2026-05-29", end: "2026-06-29", cost: 800000, paid: true, status: "업로드 완료" },
];

// ── 예정(미집행) — 6·7월 인플루언서 견적 진행 중 (확정 시 입력) ──
export const plannedCampaigns: Campaign[] = [
  // 아직 확정된 6·7월 인플루언서가 없어 비용 미확정. 확정되면 여기에 추가.
];

export const paidTotal = campaigns.reduce((s, c) => s + c.cost, 0);            // 집행 완료 합계
export const plannedTotal = plannedCampaigns.reduce((s, c) => s + c.cost, 0);   // 예정(미집행) 합계
export const grandTotal = paidTotal + plannedTotal;                            // 총합(미래 포함)

export const metaPaid = campaigns.filter((c) => c.channel === "meta").reduce((s, c) => s + c.cost, 0);
export const influencerPaid = campaigns.filter((c) => c.channel === "influencer").reduce((s, c) => s + c.cost, 0);

// ── 2025년 3월 케이터링 안내 (일회성 700만 — 작년 비교 시 참고) ──
export const cateringNote = {
  title: "2025년 3월 케이터링 매출 참고",
  description:
    "2025년 3월에는 평소 영업과 무관한 일회성 케이터링(단체 주문) 매출 약 700만원이 포함돼 있었습니다. 그래서 2025년 3월과 비교할 때는 이 700만원이 작년 숫자를 부풀린다는 점을 감안해서 봐야 합니다.",
};

// ── 활동 표(통합요약에서 사용) ──
export type ActivityRow = { date: string; channel: string; activity: string; who: string; status: string; cost: number };
export const activityRows: ActivityRow[] = campaigns.map((c) => ({
  date: c.start,
  channel: c.channel === "meta" ? "메타광고" : "인플루언서",
  activity: c.channel === "meta" ? c.label : "릴스 업로드",
  who: c.channel === "meta" ? "드리븐/자체" : `${c.label} (${c.followers})`,
  status: c.status,
  cost: c.cost,
}));

// 통합요약 호환용 (기존 import 유지)
export const costItems = campaigns.map((c) => ({
  date: c.start, type: c.channel, title: c.label, cost: c.cost,
  details: [] as { label: string; amount: number }[],
  status: c.end === null ? "ongoing" : "completed",
}));
export const totalCost = paidTotal;
