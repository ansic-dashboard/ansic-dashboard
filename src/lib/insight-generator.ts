import type { DailySales } from "@/types";
import { sumPeriod, addDays, fmtPct, fmtKRW, calcChange, shiftYear } from "./sales-analyzer";

export type Insight = {
  level: "warn" | "info" | "good";
  title: string;
  detail?: string;
  action?: string;
};

/** 자동 인사이트 — 행동 제안형 */
export function generateInsights(data: DailySales[], latestDate: string): Insight[] {
  const insights: Insight[] = [];
  if (data.length === 0) return insights;

  // 요일별 약세 진단
  const weekdayWeak = checkWeekdayWeak(data, latestDate);
  if (weekdayWeak) insights.push(weekdayWeak);

  // 최근 7일 vs 직전 7일
  const w1 = sumPeriod(data, addDays(latestDate, -6), latestDate);
  const w2 = sumPeriod(data, addDays(latestDate, -13), addDays(latestDate, -7));
  if (w1.dailyAvg > 0 && w2.dailyAvg > 0) {
    const ch = (w1.dailyAvg - w2.dailyAvg) / w2.dailyAvg;
    if (Math.abs(ch) > 0.10) {
      const gap = w1.dailyAvg - w2.dailyAvg;
      if (ch < 0) {
        insights.push({
          level: "warn",
          title: `이번 주 일평균 매출이 지난 주보다 ${fmtPct(ch)} 하락`,
          detail: `이번 주 일평균 ${fmtKRW(w1.dailyAvg, { compact: true })} · 지난 주 ${fmtKRW(w2.dailyAvg, { compact: true })} (하루 약 ${fmtKRW(Math.abs(gap), { compact: true })} 차이)`,
          action: "메타광고 노출 실적 확인 + 예약 채널(캐치테이블/네이버) 노출 점검 필요",
        });
      } else {
        insights.push({
          level: "good",
          title: `이번 주 일평균 매출이 지난 주보다 ${fmtPct(ch)} 상승`,
          detail: `이번 주 일평균 ${fmtKRW(w1.dailyAvg, { compact: true })} · 지난 주 ${fmtKRW(w2.dailyAvg, { compact: true })}`,
          action: "최근 진행한 인플루언서·메타광고 캠페인 효과로 추정 — 현재 운영 유지",
        });
      }
    }
  }

  // 이번 달 vs 작년 동기간
  const monthStart = latestDate.slice(0, 8) + "01";
  const cur = sumPeriod(data, monthStart, latestDate);
  const lyStart = shiftYear(monthStart, -1);
  const lyEnd = shiftYear(latestDate, -1);
  const ly = sumPeriod(data, lyStart, lyEnd);
  if (cur.revenue > 0 && ly.revenue > 0) {
    const ch = (cur.revenue - ly.revenue) / ly.revenue;
    if (ch < -0.05) {
      insights.push({
        level: "warn",
        title: `이번 달 누적 매출이 작년 같은 기간보다 ${fmtPct(ch)} 부족`,
        detail: `이번 달 ${fmtKRW(cur.revenue, { compact: true })} · 작년 같은 기간 ${fmtKRW(ly.revenue, { compact: true })} (${fmtKRW(cur.revenue - ly.revenue, { compact: true, sign: true })})`,
        action: "남은 영업일 동안 일평균 매출 끌어올리기 위해 워크인 유도 + 예약 채널 강화 필요",
      });
    } else if (ch > 0.05) {
      insights.push({
        level: "good",
        title: `이번 달 누적 매출이 작년 같은 기간보다 ${fmtPct(ch)} 증가`,
        detail: `이번 달 ${fmtKRW(cur.revenue, { compact: true })} · 작년 같은 기간 ${fmtKRW(ly.revenue, { compact: true })}`,
      });
    }
  }

  return insights.slice(0, 4);
}

function checkWeekdayWeak(data: DailySales[], latestDate: string): Insight | null {
  const names = ["일", "월", "화", "수", "목", "금", "토"];
  // 최근 4주 데이터로 요일별 평균 계산
  const last28 = data.filter((d) => d.date >= addDays(latestDate, -27) && d.date <= latestDate);
  if (last28.length < 14) return null;

  const byWd: number[][] = Array.from({ length: 7 }, () => []);
  last28.forEach((d) => byWd[d.weekday].push(d.revenue));

  const overallAvg = last28.reduce((s, d) => s + d.revenue, 0) / last28.length;

  let worst: { wd: number; ch: number; avg: number } | null = null;
  for (let i = 0; i < 7; i++) {
    if (byWd[i].length < 2) continue;
    const avg = byWd[i].reduce((s, x) => s + x, 0) / byWd[i].length;
    const ch = (avg - overallAvg) / overallAvg;
    if (ch < -0.15 && (worst == null || ch < worst.ch)) {
      worst = { wd: i, ch, avg };
    }
  }
  if (!worst) return null;

  const gap = overallAvg - worst.avg;
  const dayName = names[worst.wd];
  let action = "";
  if (worst.wd === 0 || worst.wd === 6) {
    // 주말
    action = `주말은 워크인 유도가 핵심 — 인스타그램 캐러셀 + 캐치테이블 핫플레이스 노출 강화`;
  } else if (worst.wd === 1) {
    action = `월요일 약세는 일반적인 패턴이나, 점심 시간대 직장인 워크인 유도 시도 (런치 세트 인스타 광고)`;
  } else {
    action = `${dayName}요일 평일 약세 — 예약 채널(캐치테이블/네이버) 노출 + 점심 워크인 유도 필요`;
  }

  return {
    level: "warn",
    title: `${dayName}요일 매출이 평균보다 ${fmtPct(worst.ch)} 낮음 (약 ${fmtKRW(gap, { compact: true })} 차이)`,
    detail: `최근 4주 ${dayName}요일 일평균 ${fmtKRW(worst.avg, { compact: true })} · 전체 일평균 ${fmtKRW(overallAvg, { compact: true })}`,
    action,
  };
}
