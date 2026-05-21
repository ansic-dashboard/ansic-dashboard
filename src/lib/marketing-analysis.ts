/**
 * 마케팅 효과 분석 — 엑셀 "안식_마케팅_통합_보고서.xlsx" 그대로
 * 출처: 매출 증감폭 비교 시트
 */

// 핵심 요약 (엑셀 R6:R8)
export const summaryStatements = [
  "마케팅 시작한 2월 말부터 매출 떨어지던 흐름이 멈추고 다시 상승 진행 (2025년 동월 대비 격차 좁혀짐)",
  "마케팅 비용 약 1,042만원 투입, 추정 추가 매출 약 937만원 발생 — 비용과 효과 거의 본전 수준",
  "5월은 인플루언서 누적 효과로 일평균 매출 상승 진행 중 (전월 대비 +19.7%)",
];

// 월별 매출 + 전월 대비 증감폭 (엑셀 R11~R16)
export type MonthlyRow = {
  month: string;
  y2024Sales: number;
  y2025Sales: number;
  y2026Sales: number;
  y2024Change: number | null;  // 전월 대비 증감폭 (소수)
  y2025Change: number | null;
  y2026Change: number | null;
  diff: number | null;            // 2026 - 2025
  marketing: string;
  note?: string;
};

export const monthlyRows: MonthlyRow[] = [
  {
    month: "1월",
    y2024Sales: 28944050, y2025Sales: 28241550, y2026Sales: 30103570,
    y2024Change: null, y2025Change: null, y2026Change: null, diff: null,
    marketing: "기준점",
  },
  {
    month: "2월",
    y2024Sales: 30944300, y2025Sales: 30509000, y2026Sales: 24008500,
    y2024Change: 0.0691, y2025Change: 0.0803, y2026Change: -0.2025, diff: -0.2828,
    marketing: "2.28 메타광고 1차 시작",
  },
  {
    month: "3월",
    y2024Sales: 32157410, y2025Sales: 42124900, y2026Sales: 34066750,
    y2024Change: 0.0392, y2025Change: 0.3807, y2026Change: 0.4189, diff: 0.0382,
    marketing: "★ 메타광고 본격 반영",
  },
  {
    month: "4월",
    y2024Sales: 37612950, y2025Sales: 39067500, y2026Sales: 37198300,
    y2024Change: 0.1697, y2025Change: -0.0726, y2026Change: 0.0919, diff: 0.1645,
    marketing: "★ 메타광고 2차 + 4.16 인플루언서 시작",
  },
  {
    month: "5월 (17일치)",
    y2024Sales: 39287950, y2025Sales: 45432907, y2026Sales: 23610000,
    y2024Change: 0.0445, y2025Change: 0.1629, y2026Change: -0.3653, diff: null,  // 단순 비교 불가
    marketing: "5/17까지 잠정치 — 인플루언서 진행 중",
    note: "월 절반치라 직접 비교 불가",
  },
];

// 케이터링 조정 후 참고 비교 (엑셀 R24~)
export const cateringAdjustmentNote = {
  title: "케이터링 조정 후 참고 비교 (2025년 3월)",
  description: "2025년 3월에는 일회성 대규모 케이터링 매출이 포함되어 있어, 평소 매출 흐름과 비교 시 왜곡이 발생합니다. 케이터링 매출(약 280만원)을 제외하고 비교하면 다음과 같습니다.",
  rows: [
    { label: "2025년 3월 실제 매출", value: 42124900 },
    { label: "케이터링 매출 (참고: 일회성)", value: 2800000 },
    { label: "케이터링 조정 후 2025년 3월 매출", value: 39324900 },
    { label: "2026년 3월 매출", value: 34066750 },
    { label: "조정 후 차이 (2026 - 2025)", value: 34066750 - 39324900 },
  ],
  conclusion: "케이터링 효과를 제외하면 2025년 대비 격차가 크게 줄어듭니다.",
};

// 마케팅 비용 타임라인 (엑셀의 "어떤 마케팅" 컬럼 + 비용 기준)
export type CostTimelineItem = {
  date: string;
  type: "meta" | "influencer";
  title: string;
  cost: number;
  details: { label: string; amount: number }[];
  status: "completed" | "ongoing";
  note?: string;
};

export const costTimeline: CostTimelineItem[] = [
  {
    date: "2026-02-27",
    type: "meta",
    title: "메타광고 1차",
    cost: 4362621,
    details: [
      { label: "촬영비", amount: 1000000 },
      { label: "광고비", amount: 2912621 },
      { label: "관리비", amount: 450000 },
    ],
    status: "completed",
    note: "드리븐 진행",
  },
  {
    date: "2026-04-14",
    type: "meta",
    title: "메타광고 2차",
    cost: 1906225,
    details: [
      { label: "광고비", amount: 1456225 },
      { label: "관리비", amount: 450000 },
    ],
    status: "ongoing",
    note: "예산 초과 진행 중 — 드리븐 점검 필요",
  },
  {
    date: "2026-04-16",
    type: "influencer",
    title: "4월 인플루언서 3명",
    cost: 1950000,
    details: [
      { label: "서울핫플", amount: 800000 },
      { label: "헤이지혜", amount: 900000 },
      { label: "아야미", amount: 250000 },
    ],
    status: "completed",
  },
  {
    date: "2026-05-23",
    type: "influencer",
    title: "5월 인플루언서 3명",
    cost: 2200000,
    details: [
      { label: "최호준", amount: 800000 },
      { label: "머스트잇", amount: 650000 },
      { label: "고민", amount: 800000 },
    ],
    status: "ongoing",
    note: "촬영·업로드 진행 중",
  },
];

export const totalCost = costTimeline.reduce((s, c) => s + c.cost, 0);

// 마케팅으로 늘어난 추정 매출 (엑셀 별도 시트)
export type AddedRow = {
  segment: string;
  basis: string;
  added: number;
};

export const addedRows: AddedRow[] = [
  { segment: "2월 → 3월", basis: "2026년 2월 매출 24,008,500 × 19.1%", added: 4580567 },
  { segment: "3월 → 4월", basis: "2026년 3월 매출 34,066,750 × 4.9%", added: 1683140 },
  { segment: "4월 → 5월", basis: "4월 일평균 1,239,943 × 13.2% × 19일", added: 3118791 },
];
export const addedTotal = addedRows.reduce((s, r) => s + r.added, 0);

// 마케팅 시작 전 (1→2월) 참고
export const preMarketingNote = {
  title: "참고: 마케팅 시작 전 (1→2월)",
  detail: "2024년 +6.9% / 2025년 +8.0% / 자연 흐름이라면 +7% 예상 / 실제 2026년 -20.2%. 약 790만원 감소된 상태로 마케팅 시작.",
  conclusion: "→ 마케팅이 '매출 신규 창출'보다는 '하락하던 흐름을 멈춘 것'에 가까움",
};

// 자연 평균이라는 용어 → 명확하게
export const TERMINOLOGY = {
  natural: "직전 2년 평균 변화율",
  marketingEffect: "마케팅 추정 효과 (직전 2년 평균 변화 대비 초과분)",
};
