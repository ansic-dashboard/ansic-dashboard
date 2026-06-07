/** 시간대별 매출 분석 데이터 (시간대별_매출_분석.xlsx 기준, 1~5월 동일기간 / 단위: 원) */
export type HourRow = { hour: string; part: "lunch" | "dinner"; y2025: number; y2026: number };
export const HOURLY: HourRow[] = [
  { hour: "11시", part: "lunch", y2025: 1715116, y2026: 1584800 },
  { hour: "12시", part: "lunch", y2025: 34151606, y2026: 31159550 },
  { hour: "13시", part: "lunch", y2025: 37781222, y2026: 36165000 },
  { hour: "14시", part: "lunch", y2025: 20685149, y2026: 20079800 },
  { hour: "15시", part: "lunch", y2025: 1014412, y2026: 1310070 },
  { hour: "16시", part: "dinner", y2025: 209208, y2026: 427000 },
  { hour: "17시", part: "dinner", y2025: 6090244, y2026: 3584550 },
  { hour: "18시", part: "dinner", y2025: 16882284, y2026: 12125850 },
  { hour: "19시", part: "dinner", y2025: 25846374, y2026: 16826900 },
  { hour: "20시", part: "dinner", y2025: 19112669, y2026: 13829400 },
  { hour: "21시", part: "dinner", y2025: 2204622, y2026: 3450500 },
];
// 요일별 (만원 → 원)
const W = (v: number) => v * 10000;
export type WeekdayRow = { day: string; lunch25: number; lunch26: number; dinner25: number; dinner26: number };
export const WEEKDAY: WeekdayRow[] = [
  { day: "월", lunch25: W(1208), lunch26: W(1215), dinner25: W(735), dinner26: W(646) },
  { day: "화", lunch25: W(1418), lunch26: W(1362), dinner25: W(849), dinner26: W(653) },
  { day: "수", lunch25: W(1544), lunch26: W(1586), dinner25: W(974), dinner26: W(690) },
  { day: "목", lunch25: W(1474), lunch26: W(1272), dinner25: W(1096), dinner26: W(556) },
  { day: "금", lunch25: W(1473), lunch26: W(1351), dinner25: W(1046), dinner26: W(896) },
  { day: "토", lunch25: W(1213), lunch26: W(1054), dinner25: W(1297), dinner26: W(940) },
  { day: "일", lunch25: W(1205), lunch26: W(1189), dinner25: W(1038), dinner26: W(644) },
];
