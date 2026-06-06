/** 업로드 데이터 공유 타입 (클라이언트/서버 공용, 의존성 없음) */
export type MonthlyRow = {
  ym: string;
  total_revenue: number;
  pos_revenue: number;
  delivery_revenue: number;
  reserve_people: number;
  walkin_people: number;
  visit_people: number;
  source: "매출표" | "P&L";
};

export type HourlyRow = {
  weekday: number;
  hour: number;
  meal: "점심" | "저녁";
  revenue: number;
  count: number;
  customers: number;
  year: number;
  period_start: string;
  period_end: string;
};
