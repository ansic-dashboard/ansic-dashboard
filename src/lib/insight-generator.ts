import type { DailySales } from "@/types";
import { sumPeriod, addDays, fmtPct, fmtKRW, shiftYear } from "./sales-analyzer";

export type Insight = {
  level: "warn" | "info" | "good";
  title: string;
  detail?: string;
  action?: string;
};

const WD = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 원인 분석형 인사이트
 * 단순 수치 나열이 아니라 "왜 그런지" 추론 + 행동 제안
 */
export function generateInsights(data: DailySales[], latestDate: string): Insight[] {
  const out: Insight[] = [];
  if (data.length === 0) return out;

  // ── 1. 이번 주 vs 지난 주 (원인 추론) ──
  const w1 = sumPeriod(data, addDays(latestDate, -6), latestDate);
  const w2 = sumPeriod(data, addDays(latestDate, -13), addDays(latestDate, -7));
  if (w1.dailyAvg > 0 && w2.dailyAvg > 0) {
    const ch = (w1.dailyAvg - w2.dailyAvg) / w2.dailyAvg;
    if (Math.abs(ch) > 0.08) {
      // 원인 추론: 어느 요일/유입경로가 변화를 만들었나
      const cause = diagnoseWeekChange(data, latestDate);
      if (ch < 0) {
        out.push({
          level: "warn",
          title: `이번 주 일평균이 지난 주보다 ${fmtPct(ch)} 하락`,
          detail: cause.detail,
          action: cause.action,
        });
      } else {
        out.push({
          level: "good",
          title: `이번 주 일평균이 지난 주보다 ${fmtPct(ch)} 상승`,
          detail: cause.detail,
          action: cause.action,
        });
      }
    }
  }

  // ── 2. 요일별 약세 진단 (원인 추론) ──
  const wd = diagnoseWeekday(data, latestDate);
  if (wd) out.push(wd);

  // ── 3. 유입경로 변화 진단 ──
  const inflow = diagnoseInflow(data, latestDate);
  if (inflow) out.push(inflow);

  // ── 4. 이번 달 vs 작년 동기간 ──
  const monthStart = latestDate.slice(0, 8) + "01";
  const cur = sumPeriod(data, monthStart, latestDate);
  const ly = sumPeriod(data, shiftYear(monthStart, -1), shiftYear(latestDate, -1));
  if (cur.revenue > 0 && ly.revenue > 0) {
    const ch = (cur.revenue - ly.revenue) / ly.revenue;
    if (ch < -0.05) {
      out.push({
        level: "warn",
        title: `이번 달 누적이 작년 같은 기간보다 ${fmtPct(ch)} 부족`,
        detail: `이번 달 ${fmtKRW(cur.revenue, { compact: true })} · 작년 ${fmtKRW(ly.revenue, { compact: true })}. 작년에는 봄철 예약이 몰린 시기였을 가능성이 있어, 예약 채널(캐치테이블·네이버) 노출을 높이면 격차를 줄일 수 있습니다.`,
        action: "남은 영업일 캐치테이블 상위노출 + 네이버 예약 유도 강화",
      });
    } else if (ch > 0.05) {
      out.push({
        level: "good",
        title: `이번 달 누적이 작년 같은 기간보다 ${fmtPct(ch)} 증가`,
        detail: `이번 달 ${fmtKRW(cur.revenue, { compact: true })} · 작년 ${fmtKRW(ly.revenue, { compact: true })}. 최근 진행한 마케팅(메타광고·인플루언서)이 신규 유입을 만들어낸 것으로 추정됩니다.`,
      });
    }
  }

  return out.slice(0, 4);
}

/** 주간 변화의 원인 추론 */
function diagnoseWeekChange(data: DailySales[], latestDate: string): { detail: string; action: string } {
  const thisWeek = data.filter((d) => d.date >= addDays(latestDate, -6) && d.date <= latestDate);
  const lastWeek = data.filter((d) => d.date >= addDays(latestDate, -13) && d.date <= addDays(latestDate, -7));

  // 워크인 vs 예약 어느 쪽이 변했나
  const sumKey = (arr: DailySales[], k: keyof DailySales) =>
    arr.reduce((s, d) => s + ((d[k] as number) || 0), 0);

  const twWalkin = sumKey(thisWeek, "walkinPeople");
  const lwWalkin = sumKey(lastWeek, "walkinPeople");
  const twReserve = sumKey(thisWeek, "reservePeople");
  const lwReserve = sumKey(lastWeek, "reservePeople");

  const walkinDiff = twWalkin - lwWalkin;
  const reserveDiff = twReserve - lwReserve;

  let detail = `이번 주 일평균 ${fmtKRW(sumPeriod(thisWeek.length ? thisWeek : [], "0", "9")?.dailyAvg || avgRev(thisWeek), { compact: true })}, 지난 주 ${fmtKRW(avgRev(lastWeek), { compact: true })}. `;

  if (Math.abs(walkinDiff) >= Math.abs(reserveDiff) && walkinDiff !== 0) {
    detail += walkinDiff < 0
      ? `특히 워크인(현장 방문) 손님이 ${Math.abs(walkinDiff)}명 줄어든 것이 주요 원인으로 보입니다. 날씨나 거리 유동인구 영향일 수 있습니다.`
      : `워크인(현장 방문) 손님이 ${walkinDiff}명 늘어 매출 상승을 이끌었습니다.`;
    return {
      detail,
      action: walkinDiff < 0
        ? "점심 워크인 유도를 위해 인스타·캐치테이블 '실시간 빈자리' 노출 강화"
        : "워크인 흐름 유지 — 현재 노출 채널 그대로 운영",
    };
  } else if (reserveDiff !== 0) {
    detail += reserveDiff < 0
      ? `예약 손님이 ${Math.abs(reserveDiff)}명 줄었습니다. 예약 채널 노출이 약해졌을 수 있습니다.`
      : `예약 손님이 ${reserveDiff}명 늘었습니다. 예약 채널이 잘 작동하고 있습니다.`;
    return {
      detail,
      action: reserveDiff < 0
        ? "캐치테이블·네이버 예약 노출 점검 및 광고 예산 재배분"
        : "예약 유입 호조 — 캐치테이블·네이버 노출 유지",
    };
  }

  return { detail, action: "유입 채널별 노출 상태 점검" };
}

function avgRev(arr: DailySales[]): number {
  if (!arr.length) return 0;
  return arr.reduce((s, d) => s + d.revenue, 0) / arr.length;
}

/** 요일 약세 진단 */
function diagnoseWeekday(data: DailySales[], latestDate: string): Insight | null {
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
    if (ch < -0.15 && (!worst || ch < worst.ch)) worst = { wd: i, ch, avg };
  }
  if (!worst) return null;

  const dayName = WD[worst.wd];
  const gap = overallAvg - worst.avg;
  let why = "", action = "";
  if (worst.wd === 1) {
    why = "월요일은 외식 수요 자체가 적은 날이라 구조적 약세입니다. 다만 점심 직장인 수요는 공략 여지가 있습니다.";
    action = "월요일 런치 한정 세트 + 점심 시간대 인스타 광고 집중";
  } else if (worst.wd === 0 || worst.wd === 6) {
    why = "주말은 예약보다 워크인 비중이 큰데, 현장 유입이 약하면 바로 매출에 반영됩니다.";
    action = "주말 캐치테이블 '실시간 예약' 상단노출 + 정원 사진 인스타 부스팅";
  } else {
    why = `${dayName}요일은 예약·워크인 모두 평균을 밑돕니다. 특정 채널 노출 부족일 가능성이 있습니다.`;
    action = `${dayName}요일 타깃 캐치테이블·네이버 예약 노출 강화`;
  }

  return {
    level: "warn",
    title: `${dayName}요일 매출이 평균보다 ${fmtPct(worst.ch)} 낮음 (약 ${fmtKRW(gap, { compact: true })} 차이)`,
    detail: `최근 4주 ${dayName}요일 일평균 ${fmtKRW(worst.avg, { compact: true })} · 전체 일평균 ${fmtKRW(overallAvg, { compact: true })}. ${why}`,
    action,
  };
}

/** 유입경로 진단 */
function diagnoseInflow(data: DailySales[], latestDate: string): Insight | null {
  const monthStart = latestDate.slice(0, 8) + "01";
  const cur = data.filter((d) => d.date >= monthStart && d.date <= latestDate);
  const phone = cur.reduce((s, d) => s + (d.phoneIn || 0), 0);
  const catchT = cur.reduce((s, d) => s + (d.catchIn || 0), 0);
  const naver = cur.reduce((s, d) => s + (d.naverIn || 0), 0);
  const total = phone + catchT + naver;
  if (total < 10) return null;

  const dominant = phone >= catchT && phone >= naver ? { name: "유선전화", n: phone } :
                   catchT >= naver ? { name: "캐치테이블", n: catchT } : { name: "네이버예약", n: naver };
  const pct = dominant.n / total;

  if (dominant.name === "유선전화" && pct > 0.5) {
    return {
      level: "info",
      title: `이번 달 예약의 ${fmtPct(pct, 0)}가 유선전화 유입`,
      detail: `전화 ${phone}건 · 캐치테이블 ${catchT}건 · 네이버 ${naver}건. 전화 의존도가 높으면 영업시간 외 예약을 놓칠 수 있습니다. 온라인 예약(캐치테이블·네이버)을 키우면 24시간 예약 유입이 가능합니다.`,
      action: "캐치테이블·네이버 예약 링크를 인스타 프로필·DM에 상시 노출",
    };
  }
  return {
    level: "info",
    title: `이번 달 예약 유입 1위는 ${dominant.name} (${fmtPct(pct, 0)})`,
    detail: `전화 ${phone}건 · 캐치테이블 ${catchT}건 · 네이버 ${naver}건. ${dominant.name} 채널이 가장 활발합니다.`,
    action: `${dominant.name} 노출을 유지하면서 약한 채널도 보완`,
  };
}
