import type { DailySales } from "@/types";

export type Period = {
  label: string;
  from: string;
  to: string;
  revenue: number;
  days: number;
  dailyAvg: number;
};

export function getDekad(date: string): 1 | 2 | 3 {
  const d = parseInt(date.slice(8, 10), 10);
  if (d <= 10) return 1;
  if (d <= 20) return 2;
  return 3;
}

export function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonths(date: string, months: number): string {
  const d = new Date(date + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function shiftYear(date: string, years: number): string {
  const d = new Date(date + "T00:00:00");
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

export function sumPeriod(
  data: DailySales[],
  from: string,
  to: string,
  label = ""
): Period {
  const filtered = data.filter((d) => d.date >= from && d.date <= to);
  const revenue = filtered.reduce((s, d) => s + d.revenue, 0);
  const days = filtered.length;
  return {
    label,
    from,
    to,
    revenue,
    days,
    dailyAvg: days > 0 ? revenue / days : 0,
  };
}

export function dekadSummary(
  data: DailySales[],
  year: number,
  month: number,
  dekad: 1 | 2 | 3
): Period {
  const mPadded = String(month).padStart(2, "0");
  const start = dekad === 1 ? 1 : dekad === 2 ? 11 : 21;
  const lastDay = new Date(year, month, 0).getDate();
  const end = dekad === 1 ? 10 : dekad === 2 ? 20 : lastDay;
  const from = `${year}-${mPadded}-${String(start).padStart(2, "0")}`;
  const to = `${year}-${mPadded}-${String(end).padStart(2, "0")}`;
  return sumPeriod(data, from, to, `${year}.${month} ${dekad === 1 ? "초순" : dekad === 2 ? "중순" : "하순"}`);
}

/** 월 전체 매출 (year-month 형식) */
export function monthTotal(data: DailySales[], year: number, month: number): Period {
  const mPadded = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  const from = `${year}-${mPadded}-01`;
  const to = `${year}-${mPadded}-${String(lastDay).padStart(2, "0")}`;
  return sumPeriod(data, from, to, `${year}.${month}월`);
}

/** 월의 마지막 날까지 일수 */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** 월 시작~latest 까지 데이터로 월말 예상 매출 추정 */
export function projectMonthEnd(
  data: DailySales[],
  year: number,
  month: number,
  latestDate: string
): { cur: number; projected: number; remainDays: number; needPerDay: (target: number) => number } {
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = daysInMonth(year, month);
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const cur = sumPeriod(data, monthStart, latestDate);
  const elapsedDays = cur.days;
  const remainDays = Math.max(0, lastDay - parseInt(latestDate.slice(8, 10), 10));
  const dailyAvg = elapsedDays > 0 ? cur.revenue / elapsedDays : 0;
  const projected = cur.revenue + dailyAvg * remainDays;
  return {
    cur: cur.revenue,
    projected,
    remainDays,
    needPerDay: (target: number) => {
      if (remainDays <= 0) return 0;
      return Math.max(0, (target - cur.revenue) / remainDays);
    },
  };
}

export function calcChange(current: number, base: number): number | null {
  if (!base || base === 0) return null;
  return (current - base) / base;
}

export function getLatestDate(data: DailySales[]): string | null {
  if (data.length === 0) return null;
  return data[data.length - 1].date;
}

export function getCurrentWeek(latestDate: string): { from: string; to: string } {
  const d = new Date(latestDate + "T00:00:00");
  const day = d.getDay();
  const monOffset = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + monOffset);
  return {
    from: mon.toISOString().slice(0, 10),
    to: latestDate,
  };
}

export function getCurrentMonth(latestDate: string): { from: string; to: string } {
  return {
    from: latestDate.slice(0, 8) + "01",
    to: latestDate,
  };
}

/** 한국어 통화 포맷 */
export function fmtKRW(n: number, opts: { compact?: boolean; sign?: boolean } = {}): string {
  if (n == null || isNaN(n)) return "—";
  const sign = opts.sign && n > 0 ? "+" : "";
  if (opts.compact) {
    if (Math.abs(n) >= 100000000) return `${sign}${(n / 100000000).toFixed(1)}억`;
    if (Math.abs(n) >= 10000) return `${sign}${(n / 10000).toFixed(0)}만`;
  }
  return `${sign}${Math.round(n).toLocaleString("ko-KR")}원`;
}

export function fmtPct(n: number | null, digits = 1, withSign = true): string {
  if (n == null || isNaN(n)) return "—";
  const sign = withSign && n > 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(digits)}%`;
}

export function fmtCount(n: number | null | undefined, unit = ""): string {
  if (n == null) return "—";
  return `${Math.round(n)}${unit}`;
}

/** 한국어 날짜 포맷 */
export function fmtDate(date: string, format: "short" | "long" | "md" = "short"): string {
  const d = new Date(date + "T00:00:00");
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  if (format === "long") return `${y}년 ${m}월 ${day}일 (${weekday})`;
  if (format === "md") return `${m}/${day}(${weekday})`;
  return `${m}월 ${day}일`;
}

/** 월 목표 매출 (고정 5천만원) */
export const MONTHLY_TARGET = 50_000_000;
