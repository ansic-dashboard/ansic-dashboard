/**
 * 시간대별 매출 분석 계산
 * - 입력: hourly_sales(요일×시간×식사), monthly_sales
 * - 객단가 = POS매출 ÷ 총방문인원 (배달 제외, 공식 고정)
 * - 2024년 시간대 데이터는 인원 누락 → 객단가 비교에서 제외(연도 태그로 구분)
 */
import type { HourlyRow, MonthlyRow } from "./hourly-types";

export const HOURS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
export const LUNCH_HOURS = [11, 12, 13, 14, 15];
export const DINNER_HOURS = [16, 17, 18, 19, 20, 21];

export type HourBucket = { hour: number; revenue: number; count: number; customers: number };
export type WeekdayBucket = { weekday: number; name: string; revenue: number; count: number; customers: number };

export type HourlyAnalysis = {
  year: number | null;
  periodStart: string;
  periodEnd: string;
  // 점심/저녁
  lunchRevenue: number;
  dinnerRevenue: number;
  lunchShare: number; // 0~1
  dinnerShare: number;
  // 시간대별 (11~21)
  byHour: (HourBucket & { share: number })[];
  peakHour: number | null;
  lowHour: number | null;
  // 요일별
  byWeekday: (WeekdayBucket & { share: number; avgCheck: number | null })[];
  bestWeekday: number | null;
  worstWeekday: number | null;
  // 히트맵 (요일 × 시간)
  heatmap: number[][]; // [weekday 0~6][hourIndex 0~10] = revenue
  heatmapMax: number;
  totalRevenue: number;
};

/** 핵심 분석: 특정 연도 데이터로 시간대 분석 */
export function analyzeHourly(rows: HourlyRow[], year?: number): HourlyAnalysis {
  const data = year ? rows.filter((r) => r.year === year) : rows;
  const yr = year ?? (data[0]?.year ?? null);

  const periodStart = data[0]?.period_start ?? "";
  const periodEnd = data[0]?.period_end ?? "";

  // 시간대별 집계
  const hourMap = new Map<number, HourBucket>();
  HOURS.forEach((h) => hourMap.set(h, { hour: h, revenue: 0, count: 0, customers: 0 }));
  // 요일별 집계
  const wdMap = new Map<number, WeekdayBucket>();
  for (let w = 0; w < 7; w++) wdMap.set(w, { weekday: w, name: WEEKDAYS[w], revenue: 0, count: 0, customers: 0 });
  // 히트맵
  const heatmap: number[][] = Array.from({ length: 7 }, () => new Array(HOURS.length).fill(0));

  let lunchRevenue = 0, dinnerRevenue = 0, total = 0;

  for (const r of data) {
    const hb = hourMap.get(r.hour);
    if (hb) { hb.revenue += r.revenue; hb.count += r.count; hb.customers += r.customers; }
    const wb = wdMap.get(r.weekday);
    if (wb) { wb.revenue += r.revenue; wb.count += r.count; wb.customers += r.customers; }
    const hi = HOURS.indexOf(r.hour);
    if (hi >= 0) heatmap[r.weekday][hi] += r.revenue;
    if (r.meal === "점심") lunchRevenue += r.revenue;
    else dinnerRevenue += r.revenue;
    total += r.revenue;
  }

  const byHour = HOURS.map((h) => {
    const b = hourMap.get(h)!;
    return { ...b, share: total > 0 ? b.revenue / total : 0 };
  });
  const nonZeroHours = byHour.filter((b) => b.revenue > 0);
  const peakHour = nonZeroHours.length ? nonZeroHours.reduce((a, b) => (b.revenue > a.revenue ? b : a)).hour : null;
  const lowHour = nonZeroHours.length ? nonZeroHours.reduce((a, b) => (b.revenue < a.revenue ? b : a)).hour : null;

  const byWeekday = Array.from(wdMap.values()).map((b) => ({
    ...b,
    share: total > 0 ? b.revenue / total : 0,
    avgCheck: b.customers > 0 ? Math.round(b.revenue / b.customers) : null,
  }));
  const wdNonZero = byWeekday.filter((b) => b.revenue > 0);
  const bestWeekday = wdNonZero.length ? wdNonZero.reduce((a, b) => (b.revenue > a.revenue ? b : a)).weekday : null;
  const worstWeekday = wdNonZero.length ? wdNonZero.reduce((a, b) => (b.revenue < a.revenue ? b : a)).weekday : null;

  const heatmapMax = Math.max(0, ...heatmap.flat());

  return {
    year: yr,
    periodStart, periodEnd,
    lunchRevenue, dinnerRevenue,
    lunchShare: total > 0 ? lunchRevenue / total : 0,
    dinnerShare: total > 0 ? dinnerRevenue / total : 0,
    byHour, peakHour, lowHour,
    byWeekday, bestWeekday, worstWeekday,
    heatmap, heatmapMax,
    totalRevenue: total,
  };
}

/** 두 연도 비교 (시간대별 증감) */
export function compareYears(rows: HourlyRow[], yearA: number, yearB: number) {
  const a = analyzeHourly(rows, yearA);
  const b = analyzeHourly(rows, yearB);
  const hourDelta = HOURS.map((h, i) => {
    const av = a.byHour[i].revenue;
    const bv = b.byHour[i].revenue;
    return {
      hour: h,
      prev: bv,
      cur: av,
      delta: bv > 0 ? (av - bv) / bv : null,
      diff: av - bv,
    };
  });
  // 감소액 순위 (가장 많이 줄어든 시간대)
  const declines = [...hourDelta].filter((d) => d.diff < 0).sort((x, y) => x.diff - y.diff);
  return { a, b, hourDelta, declines, yearA, yearB };
}

/** 객단가 = POS매출 ÷ 총방문인원 (배달 제외) */
export function avgCheck(m: MonthlyRow): number | null {
  if (!m.visit_people) return null;
  return Math.round(m.pos_revenue / m.visit_people);
}

/** 월별 비교(전년 동월 대비) */
export function buildMonthlyComparison(monthly: MonthlyRow[]) {
  const byYm = new Map(monthly.map((m) => [m.ym, m]));
  return monthly
    .slice()
    .sort((a, b) => a.ym.localeCompare(b.ym))
    .map((m) => {
      const [y, mo] = m.ym.split("-").map(Number);
      const prevYm = `${y - 1}-${String(mo).padStart(2, "0")}`;
      const prev = byYm.get(prevYm);
      const ac = avgCheck(m);
      const acPrev = prev ? avgCheck(prev) : null;
      return {
        ym: m.ym,
        revenue: m.total_revenue,
        revenueYoy: prev?.total_revenue ? (m.total_revenue - prev.total_revenue) / prev.total_revenue : null,
        visit: m.visit_people,
        visitYoy: prev?.visit_people ? (m.visit_people - prev.visit_people) / prev.visit_people : null,
        avgCheck: ac,
        avgCheckYoy: ac && acPrev ? (ac - acPrev) / acPrev : null,
        delivery: m.delivery_revenue,
        deliveryYoy: prev?.delivery_revenue ? (m.delivery_revenue - prev.delivery_revenue) / prev.delivery_revenue : null,
      };
    });
}

export const krw = (n: number) => n.toLocaleString("ko-KR");
export const man = (n: number) => `${Math.round(n / 10000).toLocaleString()}만`;
