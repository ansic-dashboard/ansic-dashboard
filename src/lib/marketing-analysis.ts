/**
 * 마케팅 효과 분석 — 인플루언서 엑셀 "매출 증감폭 비교" 시트 값 그대로
 * 용어: '보정/조정' 대신 '케이터링 매출 제외/포함'으로 표기
 * 모든 추정 매출 계산은 엑셀 값 사용 (임의 재계산 금지)
 */

// ── 월별 총매출 비교 (엑셀 R12~R17) ──
// 케이터링 포함 = 원본, 케이터링 제외 = 보정
export type MonthlyCompareRow = {
  month: string;
  y2024: number;
  y2025full: number;       // 2025 케이터링 포함(원본)
  y2025exCatering: number; // 2025 케이터링 제외
  y2026: number;
  vs2025full: number | null;
  vs2025ex: number | null;
  marketing: string;
  hasCatering?: boolean;
};

export const monthlyCompare: MonthlyCompareRow[] = [
  { month: "1월", y2024: 28653050, y2025full: 28241550, y2025exCatering: 28241550, y2026: 30103570, vs2025full: null, vs2025ex: null, marketing: "마케팅 시작 전" },
  { month: "2월", y2024: 30944300, y2025full: 30509000, y2025exCatering: 30509000, y2026: 24008500, vs2025full: -0.2131, vs2025ex: -0.2131, marketing: "2/27 메타광고 시작" },
  { month: "3월", y2024: 32157410, y2025full: 42347800, y2025exCatering: 36775550, y2026: 34066750, vs2025full: -0.1955, vs2025ex: -0.0737, marketing: "메타광고 본격 반영", hasCatering: true },
  { month: "4월", y2024: 37555950, y2025full: 38839500, y2025exCatering: 38839500, y2026: 37059600, vs2025full: -0.0458, vs2025ex: -0.0458, marketing: "메타 2차 + 인플루언서 3명" },
  { month: "5월 (1~20일)", y2024: 25514350, y2025full: 28136557, y2025exCatering: 28136557, y2026: 29202650, vs2025full: 0.0379, vs2025ex: 0.0379, marketing: "인플루언서 누적" },
];

// ── 마케팅 효과 분석 (엑셀 R52~55): 자연 증가 vs 올해 실제 증가 ──
export type EffectRow = {
  span: string;
  marketing: string;
  y2024: number;       // 2024 증가폭
  y2025: number;       // 2025 증가폭
  natural: number;     // 자연 평균 (2024·2025 평균)
  y2026: number;       // 2026 실제 증가폭
  effect: number;      // 마케팅 효과 (%p 차이)
  addedRevenue: number;// 늘어난 추정 매출 (원)
  formula: string;     // 계산식 설명
  highlight?: boolean;
};

export const effectRows: EffectRow[] = [
  { span: "2월 → 3월", marketing: "메타광고 1차 (2/27)", y2024: 0.068, y2025: 0.388, natural: 0.228, y2026: 0.419, effect: 0.191, addedRevenue: 4580567, formula: "2026년 2월 매출 2,401만 × 19.1%", highlight: true },
  { span: "3월 → 4월", marketing: "메타광고 2차 (4/14) + 4월 인플루언서 3명", y2024: 0.168, y2025: -0.083, natural: 0.043, y2026: 0.092, effect: 0.049, addedRevenue: 1683140, formula: "2026년 3월 매출 3,407만 × 4.9%" },
  { span: "4월 → 5월", marketing: "메타 2차 진행 + 인플 누적 + 5월 인플(촬영 중)", y2024: 0.033, y2025: 0.097, natural: 0.065, y2026: 0.197, effect: 0.132, addedRevenue: 3118791, formula: "2026년 4월 일평균 124만 × 13.2% × 19일", highlight: true },
];

export const addedRevenueTotal = 9382498;  // 마케팅으로 늘어난 추정 매출 합계 (엑셀 R62)

// ── 마케팅 비용 (엑셀 R66~70) ──
export type CostItem = {
  date: string;
  type: "meta" | "influencer";
  title: string;
  cost: number;
  details: { label: string; amount: number }[];
  status: "completed" | "ongoing";
  note?: string;
};

export const costItems: CostItem[] = [
  { date: "2026-02-27", type: "meta", title: "메타광고 1차", cost: 4362621,
    details: [{ label: "촬영비", amount: 1000000 }, { label: "광고비", amount: 2912621 }, { label: "관리비", amount: 450000 }],
    status: "completed", note: "드리븐 진행" },
  { date: "2026-04-14", type: "meta", title: "메타광고 2차", cost: 1906225,
    details: [{ label: "광고비", amount: 1456225 }, { label: "관리비", amount: 450000 }],
    status: "ongoing", note: "예산 초과 진행 중" },
  { date: "2026-04-16", type: "influencer", title: "4월 인플루언서 3명", cost: 1950000,
    details: [{ label: "서울핫플", amount: 800000 }, { label: "헤이지혜", amount: 900000 }, { label: "아야미", amount: 250000 }],
    status: "completed" },
  { date: "2026-05-23", type: "influencer", title: "5월 인플루언서 3명", cost: 2200000,
    details: [{ label: "최호준", amount: 800000 }, { label: "머스트잇", amount: 650000 }, { label: "고민", amount: 750000 }],
    status: "ongoing", note: "촬영·업로드 진행 중" },
];

export const totalCost = 10418846;  // 엑셀 R70 (부가세 별도)

// ── 종합: 비용 대비 효과 (엑셀 R73~75) ──
export const summary = {
  totalCost: 10418846,
  addedRevenue: 9382498,
  diff: -1036348,  // 효과 - 비용 (아직 약간 마이너스 = 방어 단계)
};

// ── 마케팅 활동 표 (타임라인: 누가 언제 무엇을) ──
export type ActivityRow = {
  date: string;        // 시점
  channel: string;
  activity: string;
  who: string;         // 누가/대상
  status: string;
  cost: number;
};

export const activityRows: ActivityRow[] = [
  { date: "2026-02-27", channel: "메타광고", activity: "메타광고 1차 (촬영+광고+관리)", who: "드리븐", status: "완료", cost: 4362621 },
  { date: "2026-04-14", channel: "메타광고", activity: "메타광고 2차 (광고+관리)", who: "드리븐", status: "진행 중", cost: 1906225 },
  { date: "2026-04-16", channel: "인플루언서", activity: "릴스 업로드", who: "서울핫플 (51.3만)", status: "완료", cost: 800000 },
  { date: "2026-04-22", channel: "인플루언서", activity: "릴스 업로드", who: "헤이지혜 (23.8만)", status: "완료", cost: 900000 },
  { date: "2026-04-25", channel: "인플루언서", activity: "릴스 업로드", who: "아야미 (2.2만, 일본)", status: "완료", cost: 250000 },
  { date: "2026-05-20", channel: "인플루언서", activity: "촬영 완료·편집 중", who: "최호준 (4.5만)", status: "편집 중", cost: 800000 },
  { date: "2026-05-23", channel: "인플루언서", activity: "촬영 예정", who: "머스트잇 (7.8만)", status: "촬영 전", cost: 650000 },
  { date: "2026-05-29", channel: "인플루언서", activity: "촬영 예정", who: "고민 (5.9만)", status: "촬영 전", cost: 750000 },
];

// ── 핵심 요약 (편집 가능 기본값) ──
export const summaryStatements = [
  "마케팅은 '매출을 새로 늘리기'보다 '떨어지는 흐름을 막는' 역할에 가까웠습니다.",
  "마케팅 시작 전(1→2월)에는 예년 흐름보다 약 790만원 더 떨어졌지만, 시작 후에는 매월 자연 평균보다 +5~19%p 더 늘었습니다.",
  "3월 비교가 가장 중요 — 케이터링 700만원을 빼고 보면 2025년 대비 격차가 -19.6%에서 -7.4%로 줄어듭니다.",
];

// ── 케이터링 설명 ──
export const cateringNote = {
  title: "2025년 3월 케이터링 매출 이야기",
  description: "2025년 3월에는 평소 영업과 무관한 일회성 케이터링(단체 주문) 매출 약 700만원이 들어있었습니다. 그래서 작년과 공정하게 비교하려면 이 700만원을 빼고 봐야 합니다.",
  rows: [
    { label: "2025년 3월 매출 (케이터링 포함)", value: 42347800, type: "neutral" as const },
    { label: "− 케이터링 매출 (일회성 단체주문)", value: -7000000, type: "subtract" as const },
    { label: "+ 영업 못한 날 손실 보정 (3/19·3/20)", value: 1427750, type: "add" as const },
    { label: "= 2025년 3월 매출 (케이터링 제외)", value: 36775550, type: "result" as const },
    { label: "2026년 3월 매출", value: 34066750, type: "neutral" as const },
    { label: "차이 (2026 − 2025, 케이터링 제외 기준)", value: 34066750 - 36775550, type: "diff" as const },
  ],
  conclusion: "케이터링 700만원을 빼고 비교하면, 작년 대비 부족분이 -19.6%에서 -7.4%로 크게 줄어듭니다.",
};

// 참고/주의 (편집 가능 기본값)
export const preMarketingNote = {
  reference: "마케팅 시작 전(1→2월)에는 예년이라면 자연스럽게 늘 시기인데도 매출이 -3.6% 빠졌습니다(예년 평균 +11.8%). 즉 마케팅이 없었다면 더 떨어졌을 가능성이 큽니다.",
  caution: "여기 '늘어난 추정 매출'은 마케팅만의 효과로 단정할 수 없습니다. 봄철 정원 시즌, 테라스 좌석, VIP 멤버십, 날씨, 캐치테이블 노출 등 여러 요인이 함께 작용했습니다. 또 인플루언서 효과는 게시 후 몇 주~몇 달 뒤 누적으로 나타나고, 5월은 아직 1~20일치만 반영된 잠정치입니다.",
};
