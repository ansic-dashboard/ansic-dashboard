/**
 * 운영지표 (예약/워크인/유입경로/회전율) 결합 + 월별 집계
 * - operational.json: 2024-01-01 ~ 2026-05-20 (매출표 + P&L현황 파싱)
 */
import type { DailySales } from "@/types";

export type OpRecord = {
  reserveTeams?: number;
  reservePeople?: number;
  walkinTeams?: number;
  walkinPeople?: number;
  totalTeams?: number;
  totalPeople?: number;
  visitPeople?: number;
  phoneIn?: number;
  catchIn?: number;
  naverIn?: number;
  turnover?: number;
  reserveRev?: number;
  walkinRev?: number;
  lunchRev?: number;
  dinnerRev?: number;
};

let _opCache: Record<string, OpRecord> | null = null;

export async function loadOperational(): Promise<Record<string, OpRecord>> {
  if (_opCache) return _opCache;
  try {
    const res = await fetch("/data/operational.json");
    const json = await res.json();
    _opCache = json.data || {};
    return _opCache!;
  } catch {
    return {};
  }
}

/** 일별 매출에 운영지표 결합 */
export function mergeOperational(
  sales: DailySales[],
  op: Record<string, OpRecord>
): DailySales[] {
  return sales.map((d) => {
    const o = op[d.date];
    if (!o) return d;
    return { ...d, ...o };
  });
}

export type MonthlyOpSummary = {
  ym: string;              // 2026-05
  days: number;            // 영업일수
  totalRevenue: number;
  dailyAvgRevenue: number;
  totalPeople: number;     // 총 방문 인원
  dailyAvgPeople: number;  // 일평균 인원 (반올림)
  totalTeams: number;
  dailyAvgTeams: number;   // 일평균 팀수 (반올림)
  avgTurnover: number;     // 평균 회전율
  avgSpend: number;        // 평균 객단가 = 매출/인원
  deliveryRevenue: number;
  // 유입경로 합계
  phoneIn: number;
  catchIn: number;
  naverIn: number;
  reservePeople: number;
  walkinPeople: number;
  // 매출 비중
  reserveRev: number;
  walkinRev: number;
  lunchRev: number;
  dinnerRev: number;
};

/** 특정 월의 운영지표 집계 */
export function monthlyOpSummary(merged: DailySales[], year: number, month: number): MonthlyOpSummary {
  const ym = `${year}-${String(month).padStart(2, "0")}`;
  const rows = merged.filter((d) => d.date.startsWith(ym));
  const days = rows.length;

  const sum = (key: keyof DailySales) =>
    rows.reduce((s, d) => s + ((d[key] as number) || 0), 0);

  const totalRevenue = sum("revenue");
  const totalPeople = sum("totalPeople") || sum("visitPeople");
  const totalTeams = sum("totalTeams");
  const deliveryRevenue = sum("deliveryRevenue");
  const phoneIn = sum("phoneIn");
  const catchIn = sum("catchIn");
  const naverIn = sum("naverIn");
  const reservePeople = sum("reservePeople");
  const walkinPeople = sum("walkinPeople");
  const reserveRev = sum("reserveRev");
  const walkinRev = sum("walkinRev");
  const lunchRev = sum("lunchRev");
  const dinnerRev = sum("dinnerRev");

  // 회전율: 값이 있는 날만 평균
  const turnoverVals = rows.map((d) => d.turnover).filter((v): v is number => typeof v === "number" && v > 0);
  const avgTurnover = turnoverVals.length ? turnoverVals.reduce((s, v) => s + v, 0) / turnoverVals.length : 0;

  return {
    ym,
    days,
    totalRevenue,
    dailyAvgRevenue: days ? totalRevenue / days : 0,
    totalPeople,
    dailyAvgPeople: days ? Math.round(totalPeople / days) : 0,
    totalTeams,
    dailyAvgTeams: days ? Math.round(totalTeams / days) : 0,
    avgTurnover,
    avgSpend: totalPeople ? Math.round(totalRevenue / totalPeople) : 0,
    deliveryRevenue,
    phoneIn,
    catchIn,
    naverIn,
    reservePeople,
    walkinPeople,
    reserveRev,
    walkinRev,
    lunchRev,
    dinnerRev,
  };
}

/** 유입경로 비율 계산 */
export function inflowBreakdown(summary: MonthlyOpSummary) {
  const total = summary.phoneIn + summary.catchIn + summary.naverIn;
  if (total === 0) return null;
  return {
    total,
    phone: { count: summary.phoneIn, pct: summary.phoneIn / total },
    catch: { count: summary.catchIn, pct: summary.catchIn / total },
    naver: { count: summary.naverIn, pct: summary.naverIn / total },
    dominant:
      summary.phoneIn >= summary.catchIn && summary.phoneIn >= summary.naverIn ? "유선전화" :
      summary.catchIn >= summary.naverIn ? "캐치테이블" : "네이버예약",
  };
}

/** 예약 vs 워크인 매출 비중 */
export function revenueMix(summary: MonthlyOpSummary) {
  const total = summary.reserveRev + summary.walkinRev;
  if (total === 0) return null;
  return {
    total,
    reserve: { amount: summary.reserveRev, pct: summary.reserveRev / total },
    walkin: { amount: summary.walkinRev, pct: summary.walkinRev / total },
  };
}

/** 점심 vs 저녁 매출 비중 */
export function timeMix(summary: MonthlyOpSummary) {
  const total = summary.lunchRev + summary.dinnerRev;
  if (total === 0) return null;
  return {
    total,
    lunch: { amount: summary.lunchRev, pct: summary.lunchRev / total },
    dinner: { amount: summary.dinnerRev, pct: summary.dinnerRev / total },
  };
}
