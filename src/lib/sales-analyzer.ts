import type { DailySales } from "@/types";

export type Period = {
  label: string; from: string; to: string;
  revenue: number; days: number; dailyAvg: number;
};

export function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 안전한 월 이동 (Date 오버플로우 회피) */
export function shiftMonthSafe(date: string, months: number): string {
  const y = parseInt(date.slice(0, 4), 10);
  const m = parseInt(date.slice(5, 7), 10);
  const d = parseInt(date.slice(8, 10), 10);
  let newY = y, newM = m + months;
  while (newM < 1) { newM += 12; newY--; }
  while (newM > 12) { newM -= 12; newY++; }
  const lastDay = new Date(newY, newM, 0).getDate();
  const newD = Math.min(d, lastDay);
  return `${newY}-${String(newM).padStart(2, "0")}-${String(newD).padStart(2, "0")}`;
}

/** 안전한 연 이동 */
export function shiftYear(date: string, years: number): string {
  const y = parseInt(date.slice(0, 4), 10);
  const m = parseInt(date.slice(5, 7), 10);
  const d = parseInt(date.slice(8, 10), 10);
  const newY = y + years;
  const lastDay = new Date(newY, m, 0).getDate();
  const newD = Math.min(d, lastDay);
  return `${newY}-${String(m).padStart(2, "0")}-${String(newD).padStart(2, "0")}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function sumPeriod(data: DailySales[], from: string, to: string, label = ""): Period {
  const filtered = data.filter((d) => d.date >= from && d.date <= to);
  const revenue = filtered.reduce((s, d) => s + d.revenue, 0);
  const days = filtered.length;
  return { label, from, to, revenue, days, dailyAvg: days > 0 ? revenue / days : 0 };
}

export function monthTotal(data: DailySales[], year: number, month: number): Period {
  const mp = String(month).padStart(2, "0");
  const last = daysInMonth(year, month);
  return sumPeriod(data, `${year}-${mp}-01`, `${year}-${mp}-${String(last).padStart(2, "0")}`, `${year}.${month}월`);
}

export function projectMonthEnd(data: DailySales[], year: number, month: number, latestDate: string) {
  const mp = String(month).padStart(2, "0");
  const last = daysInMonth(year, month);
  const cur = sumPeriod(data, `${year}-${mp}-01`, latestDate);
  const elapsed = cur.days;
  const remainDays = Math.max(0, last - parseInt(latestDate.slice(8, 10), 10));
  const dailyAvg = elapsed > 0 ? cur.revenue / elapsed : 0;
  return {
    cur: cur.revenue,
    projected: cur.revenue + dailyAvg * remainDays,
    remainDays,
    needPerDay: (target: number) => remainDays <= 0 ? 0 : Math.max(0, (target - cur.revenue) / remainDays),
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
  return { from: mon.toISOString().slice(0, 10), to: latestDate };
}

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

export function fmtDate(date: string, format: "short" | "long" | "md" = "short"): string {
  const d = new Date(date + "T00:00:00");
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  const wd = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  if (format === "long") return `${y}년 ${m}월 ${day}일 (${wd})`;
  if (format === "md") return `${m}/${day}(${wd})`;
  return `${m}월 ${day}일`;
}

export const MONTHLY_TARGET = 50_000_000;
