/**
 * 신규 기능(A 일일보고 · B 연월별평균 · C 요일별평균 · F 목표추세) 공용 분석 헬퍼
 * - 모든 매출/인원 값은 useSales()가 합쳐준 DailySales 기준
 * - 평균 팀/인원은 반올림 정수 (보고 규칙)
 * - 객단가 = 총매출 ÷ 총방문인원 (배달 제외)
 */
import type { DailySales } from "@/types";

export const WEEKDAY_KR = ["일", "월", "화", "수", "목", "금", "토"];
export const DEFAULT_MONTHLY_TARGET = 50_000_000;

/** 점심/저녁 매출 (operational lunchRev/dinnerRev 우선, 없으면 historical lunchRevenue/dinnerRevenue) */
export function lunchOf(d: DailySales): number {
  return (d.lunchRev ?? d.lunchRevenue ?? 0) || 0;
}
export function dinnerOf(d: DailySales): number {
  return (d.dinnerRev ?? d.dinnerRevenue ?? 0) || 0;
}
/** 객단가: 인원이 있을 때만 */
export function spendOf(d: DailySales): number | null {
  const ppl = d.totalPeople ?? d.visitPeople ?? 0;
  return ppl > 0 ? Math.round(d.revenue / ppl) : null;
}

export type DailyRow = DailySales & { _dateObj: Date };

export function withDateObj(data: DailySales[]): DailyRow[] {
  return data.map((d) => ({ ...d, _dateObj: new Date(d.date + "T00:00:00") }));
}

export function ymd(dt: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}
export function addDaysStr(dateStr: string, days: number): string {
  const dt = new Date(dateStr + "T00:00:00");
  dt.setDate(dt.getDate() + days);
  return ymd(dt);
}

/** 데이터가 있는 가장 최근 날짜 */
export function latestDateWith(data: DailySales[]): string | null {
  const valid = data.filter((d) => d.revenue > 0).map((d) => d.date).sort();
  return valid.length ? valid[valid.length - 1] : null;
}

export type DayAvg = {
  count: number;
  revenue: number;       // 평균 매출
  lunch: number;
  dinner: number;
  teams: number;         // 평균 팀 (반올림)
  people: number;        // 평균 인원 (반올림)
  spend: number;         // 평균 객단가
  reserveTeams: number;
  walkinTeams: number;
};

/** 일별 레코드 배열의 평균(반올림 적용) */
export function avgOf(rows: DailySales[]): DayAvg {
  const n = rows.length;
  if (!n) return { count: 0, revenue: 0, lunch: 0, dinner: 0, teams: 0, people: 0, spend: 0, reserveTeams: 0, walkinTeams: 0 };
  const sum = (f: (d: DailySales) => number) => rows.reduce((s, d) => s + (f(d) || 0), 0);
  const revenue = sum((d) => d.revenue);
  const people = sum((d) => d.totalPeople ?? d.visitPeople ?? 0);
  const teams = sum((d) => d.totalTeams ?? 0);
  // 인원/팀이 기록된 날만으로 평균 계산
  const peopleDays = rows.filter((d) => (d.totalPeople ?? d.visitPeople ?? 0) > 0);
  const teamDays = rows.filter((d) => (d.totalTeams ?? 0) > 0);
  const peopleSum = peopleDays.reduce((s, d) => s + (d.totalPeople ?? d.visitPeople ?? 0), 0);
  return {
    count: n,
    revenue: Math.round(revenue / n),
    lunch: Math.round(sum(lunchOf) / n),
    dinner: Math.round(sum(dinnerOf) / n),
    teams: teamDays.length ? Math.round(teams / teamDays.length) : 0,
    people: peopleDays.length ? Math.round(people / peopleDays.length) : 0,
    spend: peopleSum > 0 ? Math.round(revenue / peopleSum) : 0,
    reserveTeams: rows.length ? Math.round(sum((d) => d.reserveTeams ?? 0) / n) : 0,
    walkinTeams: rows.length ? Math.round(sum((d) => d.walkinTeams ?? 0) / n) : 0,
  };
}

/** 같은 요일 평균: 주어진 기간(from~to, inclusive) 안에서 weekday가 같은 날들의 평균 */
export function sameWeekdayAvg(data: DailySales[], weekday: number, from: string, to: string): DayAvg {
  const rows = data.filter((d) => d.date >= from && d.date <= to && new Date(d.date + "T00:00:00").getDay() === weekday && d.revenue > 0);
  return avgOf(rows);
}

/** 월별 평균 (특정 연·월) */
export function monthAvg(data: DailySales[], year: number, month: number): DayAvg {
  const ym = `${year}-${String(month).padStart(2, "0")}`;
  return avgOf(data.filter((d) => d.date.startsWith(ym) && d.revenue > 0));
}

/** 연도별 평균 */
export function yearAvg(data: DailySales[], year: number): DayAvg {
  return avgOf(data.filter((d) => d.date.startsWith(`${year}-`) && d.revenue > 0));
}

/** 요일별 평균 (전체 데이터 또는 특정 연도) */
export function weekdayAvgTable(data: DailySales[], year?: number): DayAvg[] {
  const base = year ? data.filter((d) => d.date.startsWith(`${year}-`)) : data;
  const out: DayAvg[] = [];
  for (let w = 0; w < 7; w++) {
    out.push(avgOf(base.filter((d) => new Date(d.date + "T00:00:00").getDay() === w && d.revenue > 0)));
  }
  return out;
}

/** 월별 총매출 (목표 추세용) */
export function monthlyTotals(data: DailySales[], year: number): { month: number; total: number; days: number }[] {
  const out: { month: number; total: number; days: number }[] = [];
  for (let m = 1; m <= 12; m++) {
    const ym = `${year}-${String(m).padStart(2, "0")}`;
    const rows = data.filter((d) => d.date.startsWith(ym) && d.revenue > 0);
    out.push({ month: m, total: rows.reduce((s, d) => s + d.revenue, 0), days: rows.length });
  }
  return out;
}

/** 변화율 (현재-기준)/기준 */
export function change(cur: number, base: number): number | null {
  if (!base) return null;
  return (cur - base) / base;
}
