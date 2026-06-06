/**
 * 매출 데이터 fetcher (v2)
 * - 2024 ~ 2026.03: public/data/historical.json (정적 파일, 미리 파싱됨)
 * - 2026.04 ~ : 안식 P&L 시트 실시간 fetch
 *
 * P&L 시트 구조 (이전 대화에서 확정):
 * - 시트명: "{N}월P&L" (4월P&L, 5월P&L, ...)
 * - 110행 = ▶ 일계 매출
 * - 5행 = 일자 헤더 (병합셀이라 컬럼 직접 매핑)
 * - 1일 매출 = K열 (11번째 컬럼)
 * - 2일 = S열 (19), 3일 = AA열 (27), ... 8칸씩 증가
 * - N일 일계매출 = 110행, 컬럼 (11 + 8*(N-1))
 */
import type { DailySales } from "@/types";

const SHEET_ID_PL = "1qPOpBA6b43nXp_s5Hs1QkR27f90ONLVg";

// 컬럼 번호(1-based) → A1 표기법 (예: 27 → "AA")
function colToA1(col: number): string {
  let s = '';
  while (col > 0) {
    const m = (col - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    col = Math.floor((col - 1) / 26);
  }
  return s;
}

// 월의 마지막 날 (2026년 기준)
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// gviz API로 P&L 시트 특정 범위 fetch
async function fetchGvizRange(sheetName: string, range: string): Promise<any[][]> {
  const params = new URLSearchParams({
    sheet: sheetName,
    range,
    tqx: "out:json",
    headers: "0",
  });
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID_PL}/gviz/tq?${params}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`gviz fetch failed: ${res.status}`);
  const text = await res.text();
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  const json = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  const rows = json.table.rows as any[];
  return rows.map((r) => r.c.map((cell: any) => (cell ? cell.v : null)));
}

/** P&L 시트 한 달 데이터 fetch
 * - 110행만 가져옴 (1열부터 N+7번째 컬럼까지)
 * - N일 매출 = 110행 (11 + 8*(N-1))번째 컬럼
 */
async function fetchPLMonth(year: number, month: number): Promise<DailySales[]> {
  const daysInMonth = lastDayOfMonth(year, month);
  const lastCol = 11 + 8 * (daysInMonth - 1); // 31일 = 251번째 컬럼
  const sheetName = `${month}월P&L`;
  const range = `A110:${colToA1(lastCol)}110`;
  
  let rows: any[][];
  try {
    rows = await fetchGvizRange(sheetName, range);
  } catch (e) {
    // 해당 월 시트가 아직 없음
    return [];
  }
  if (!rows || rows.length === 0) return [];
  
  const row = rows[0]; // 110행 한 줄
  const result: DailySales[] = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const colIdx = 11 + 8 * (day - 1) - 1; // 0-based
    const val = row[colIdx];
    if (typeof val !== "number" || val <= 0) continue;
    
    const date = new Date(year, month - 1, day);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    result.push({
      date: dateStr,
      weekday: date.getDay(),
      revenue: val,
    });
  }
  return result;
}

/** historical.json (2024-2026.03) 불러오기 */
async function fetchHistorical(): Promise<DailySales[]> {
  try {
    // 빌드 시점에는 public 파일을 fs로 읽고, 런타임은 fetch
    if (typeof window === 'undefined') {
      // 서버 환경
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'public', 'data', 'historical.json');
      const content = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(content);
      return convertHistorical(json);
    } else {
      // 클라이언트 환경
      const res = await fetch('/data/historical.json');
      const json = await res.json();
      return convertHistorical(json);
    }
  } catch (e) {
    console.error('historical.json load failed:', e);
    return [];
  }
}

function convertHistorical(json: any): DailySales[] {
  if (!json?.data) return [];
  const result: DailySales[] = [];
  for (const [dateStr, day] of Object.entries(json.data as Record<string, any>)) {
    if (!day || typeof day.total !== 'number' || day.total <= 0) continue;
    const date = new Date(dateStr + 'T00:00:00');
    result.push({
      date: dateStr,
      weekday: date.getDay(),
      revenue: day.total,
      lunchRevenue: day.lunch,
      dinnerRevenue: day.dinner,
    });
  }
  return result;
}

/** 모든 매출 데이터 통합 fetch */
export async function fetchAllSales(): Promise<DailySales[]> {
  // 1. 정적 데이터 (2024 ~ 2026.03)
  const historical = await fetchHistorical();
  
  // 2. P&L 시트 (2026.04 ~ 현재 월)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  const plPromises: Promise<DailySales[]>[] = [];
  // 2026년 4월부터 현재 월까지
  if (currentYear === 2026) {
    for (let m = 4; m <= currentMonth; m++) {
      plPromises.push(fetchPLMonth(2026, m).catch(() => []));
    }
  } else if (currentYear > 2026) {
    // 2026년 전체 + 다음 해
    for (let m = 4; m <= 12; m++) {
      plPromises.push(fetchPLMonth(2026, m).catch(() => []));
    }
    for (let m = 1; m <= currentMonth; m++) {
      plPromises.push(fetchPLMonth(currentYear, m).catch(() => []));
    }
  }
  
  const plArrays = await Promise.all(plPromises);
  const pl = plArrays.flat();
  
  // 합치고 중복 제거 (검증된 historical.json 우선, P&L은 historical에 없는 최신 날짜만 보충)
  const map = new Map<string, DailySales>();
  for (const d of historical) map.set(d.date, d);
  for (const d of pl) if (!map.has(d.date)) map.set(d.date, d); // historical에 없는 날짜만 추가
  
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
}
