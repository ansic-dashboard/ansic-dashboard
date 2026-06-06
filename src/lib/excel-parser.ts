/**
 * 안식 대시보드 — 엑셀 업로드 파서 (서버 전용)
 *
 * ⚠️ 실제 업로드 파일을 직접 열어 구조를 검증한 결과를 그대로 반영함.
 *   (A) 안식_전체_매출표.xlsx  — 시트 "YYYY년 매출", 월별 "합산" 컬럼
 *   (B) 안식_P_L.xlsx          — "N월P&L"(매출) + "N월현황"(인원)
 *   (C) 요일별_시간대별_*.xls   — 점심(11~15시)/저녁(16~21시), 구버전 BIFF
 *
 * 파싱 라이브러리: SheetJS(xlsx) 단독. .xls/.xlsx 모두 처리.
 *
 * ★ 핵심 주의 (검증으로 확인된 함정) ★
 *  - P&L 시트는 A열이 비어 SheetJS가 !ref를 "B1~"로 잡아 컬럼이 1칸 밀린다.
 *    → readSheetAOA()에서 !ref를 항상 A1부터 강제 재설정하여 인덱스를 고정한다.
 *  - 엑셀에 이미 계산된 합계(월 "합산" 컬럼, "▶ 일계 매출" 행)를 그대로 사용.
 *    임의 재계산 금지.
 *  - 라벨은 공백 무시 부분일치로 매칭(실제 라벨 띄어쓰기가 문서와 다름).
 */
import * as XLSX from "xlsx";
import type { MonthlyRow, HourlyRow } from "./hourly-types";
export type { MonthlyRow, HourlyRow } from "./hourly-types";

// ───────────────────────── 공통 유틸 ─────────────────────────

export type ParseError = { file: string; detail: string };
export class ExcelParseError extends Error {
  constructor(public file: string, public detail: string) {
    super(`[${file}] ${detail}`);
  }
}

/** 시트를 2차원 배열로. A1부터 강제 정렬해 컬럼 인덱스를 고정한다. */
function readSheetAOA(ws: XLSX.WorkSheet): any[][] {
  if (ws["!ref"]) {
    const range = XLSX.utils.decode_range(ws["!ref"]);
    range.s.c = 0; // A열부터
    range.s.r = 0; // 1행부터
    ws["!ref"] = XLSX.utils.encode_range(range);
  }
  return XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: true, defval: null });
}

const norm = (s: unknown) => String(s ?? "").replace(/\s/g, "");

/** 라벨(공백무시 부분일치)로 행 인덱스 찾기. col=라벨이 있는 컬럼 후보들 */
function findRowByLabel(aoa: any[][], keyword: string, labelCols = [0, 1, 2]): number {
  const k = norm(keyword);
  return aoa.findIndex((r) =>
    labelCols.some((c) => r[c] && norm(r[c]).includes(k))
  );
}

const toNum = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[,\s원]/g, ""));
    return isNaN(n) ? 0 : n;
  }
  return 0;
};

// ───────────────────────── 타입 ─────────────────────────
// MonthlyRow, HourlyRow 는 ./hourly-types 에서 import (위 re-export 참조)

const WEEKDAY_MAP: Record<string, number> = {
  일요일: 0, 월요일: 1, 화요일: 2, 수요일: 3, 목요일: 4, 금요일: 5, 토요일: 6,
  일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6,
};

// ─────────────── (A) 매출표 .xlsx ───────────────
/**
 * 시트명: "2026년 매출 (3월까지만)" 등. 헤더(0행)에 "NN.MM합계(합산)" 컬럼.
 * 라벨(col0): 총매출/POS/배달/예약인원/워크인/총방문인원.
 */
export function parseSalesTable(buf: Buffer | ArrayBuffer): MonthlyRow[] {
  const FILE = "연간 매출표";
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buf, { type: "buffer", cellDates: true });
  } catch (e: any) {
    throw new ExcelParseError(FILE, `파일을 열 수 없습니다: ${e?.message ?? e}`);
  }

  const out: MonthlyRow[] = [];

  for (const sheetName of wb.SheetNames) {
    const ym4 = sheetName.match(/(\d{4})\s*년\s*매출/);
    if (!ym4) continue; // "YYYY년 매출" 형태 시트만
    const year = Number(ym4[1]);
    const aoa = readSheetAOA(wb.Sheets[sheetName]);
    if (aoa.length < 5) continue;

    const header = aoa[0] ?? [];

    // 라벨 행 인덱스 (공백무시 부분일치)
    const rTotal = findRowByLabel(aoa, "모든매출");
    const rPos = findRowByLabel(aoa, "안식POS총매출");
    const rDeli = findRowByLabel(aoa, "배달어플매출총합계");
    const rReserve = findRowByLabel(aoa, "예약자중방문한인원수");
    const rWalkin = findRowByLabel(aoa, "워크인고객방문인원수");
    let rVisit = findRowByLabel(aoa, "총방문한인원");
    if (rVisit < 0) rVisit = findRowByLabel(aoa, "총방문한인원수");

    if (rTotal < 0) {
      throw new ExcelParseError(
        FILE,
        `'${sheetName}' 시트에서 '모든 매출 총합계' 행을 찾지 못했습니다. 매출표 양식이 맞는지 확인해주세요.`
      );
    }

    // "합산" 컬럼만 골라 월별로 읽기
    header.forEach((h, col) => {
      if (typeof h !== "string" || !h.includes("합산")) return;
      // "26.01합계 (합산)" → 월
      const m = h.match(/(\d{2})\.(\d{2})/);
      if (!m) return;
      const yy = 2000 + Number(m[1]);
      const mm = Number(m[2]);
      if (yy !== year) return; // 시트 연도와 헤더 연도 정합성
      const ym = `${yy}-${String(mm).padStart(2, "0")}`;

      const total = toNum(aoa[rTotal]?.[col]);
      if (!total) return; // 빈 월 skip

      out.push({
        ym,
        total_revenue: total,
        pos_revenue: rPos >= 0 ? toNum(aoa[rPos][col]) : 0,
        delivery_revenue: rDeli >= 0 ? toNum(aoa[rDeli][col]) : 0,
        reserve_people: rReserve >= 0 ? toNum(aoa[rReserve][col]) : 0,
        walkin_people: rWalkin >= 0 ? toNum(aoa[rWalkin][col]) : 0,
        visit_people: rVisit >= 0 ? toNum(aoa[rVisit][col]) : 0,
        source: "매출표",
      });
    });
  }

  if (out.length === 0) {
    throw new ExcelParseError(FILE, "월별 '합산' 컬럼을 하나도 찾지 못했습니다. 헤더에 'NN.MM합계(합산)' 형식이 있는지 확인해주세요.");
  }
  return out;
}

// ─────────────── (B) P&L .xlsx ───────────────
/**
 * "N월P&L" 시트: 행4 일자(idx3,11,19...8칸간격), 행109="▶ 일계 매출",
 *   N일 매출칸 = idx 10 + 8*(N-1).
 *   행101=점심,102=저녁,103=쿠팡,104=배민,105=네이버QR,106=푸드콘,107=선결제,108=환자식.
 * "N월현황" 시트: 행2 헤더, 행3부터 일자별.
 *   idx3=예약인원, idx12=워크인인원, idx14=총방문인원.
 * P&L은 일자별 → 월합계로 집계. (이미 계산된 행 값을 더하기만 함)
 */
export function parsePL(buf: Buffer | ArrayBuffer, defaultYear = new Date().getFullYear()): MonthlyRow[] {
  const FILE = "P&L";
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buf, { type: "buffer" });
  } catch (e: any) {
    throw new ExcelParseError(FILE, `파일을 열 수 없습니다: ${e?.message ?? e}`);
  }

  // 월별로 매출/인원을 모은다
  const byMonth: Record<string, MonthlyRow> = {};

  for (const sheetName of wb.SheetNames) {
    const mPL = sheetName.match(/(\d{1,2})\s*월\s*P&?L/i);
    const mST = sheetName.match(/(\d{1,2})\s*월\s*현황/);

    if (mPL) {
      const month = Number(mPL[1]);
      const ym = `${defaultYear}-${String(month).padStart(2, "0")}`;
      const aoa = readSheetAOA(wb.Sheets[sheetName]);

      const rPos1 = findRowByLabel(aoa, "점심매출"); // 점심
      const rPos2 = findRowByLabel(aoa, "저녁매출"); // 저녁
      const rCoupang = findRowByLabel(aoa, "쿠팡매출");
      const rBaemin = findRowByLabel(aoa, "배민매출");
      const rDaily = findRowByLabel(aoa, "일계매출");

      if (rDaily < 0) {
        throw new ExcelParseError(FILE, `'${sheetName}' 시트에서 '▶ 일계 매출' 행을 찾지 못했습니다.`);
      }

      // 일자 칸: 행4(idx4)에서 "N일" 위치를 스캔.
      // ★ 각 일자는 8칸 블록의 첫 칸(일자=idx3), 그 날의 채널 매출은 블록 끝(매출=idx10).
      //   즉 데이터 칸 = 일자칸 + DATA_OFFSET(7). (검증: 1일 일자 idx3 → 매출 idx10)
      const DATA_OFFSET = 7;
      const dateRow = aoa[4] ?? [];
      const dayCols: number[] = [];
      dateRow.forEach((v, c) => {
        if (typeof v === "string" && /^\d{1,2}일$/.test(v.trim())) dayCols.push(c);
      });
      if (dayCols.length === 0) {
        throw new ExcelParseError(FILE, `'${sheetName}' 시트에서 일자('1일','2일'...) 헤더를 찾지 못했습니다.`);
      }

      let posSum = 0, deliSum = 0;
      for (const c0 of dayCols) {
        const c = c0 + DATA_OFFSET; // 매출 데이터 칸
        const lunch = toNum(aoa[rPos1]?.[c]);
        const dinner = toNum(aoa[rPos2]?.[c]);
        const coupang = rCoupang >= 0 ? toNum(aoa[rCoupang][c]) : 0;
        const baemin = rBaemin >= 0 ? toNum(aoa[rBaemin][c]) : 0;
        posSum += lunch + dinner;
        deliSum += coupang + baemin;
      }
      // 총매출은 "일계 매출" 행 합 (이미 계산된 값을 그대로 더함)
      let totalSum = 0;
      for (const c0 of dayCols) totalSum += toNum(aoa[rDaily]?.[c0 + DATA_OFFSET]);

      byMonth[ym] = {
        ...(byMonth[ym] ?? emptyMonth(ym)),
        ym,
        total_revenue: totalSum,
        pos_revenue: posSum,
        delivery_revenue: deliSum,
        source: "P&L",
      };
    }

    if (mST) {
      const month = Number(mST[1]);
      const ym = `${defaultYear}-${String(month).padStart(2, "0")}`;
      const aoa = readSheetAOA(wb.Sheets[sheetName]);

      // 행3(idx3)부터 일자별. 컬럼: 예약인원=3, 워크인=12, 총방문=14
      let reserve = 0, walkin = 0, visit = 0;
      for (let r = 3; r < aoa.length; r++) {
        const row = aoa[r];
        if (!row || row[0] == null) continue;
        // 날짜 셀: Date 객체 / "YYYY-MM" 문자열 / 엑셀 시리얼 숫자(40000~60000)
        const d0 = row[0];
        const isDate =
          d0 instanceof Date ||
          /\d{4}-\d{1,2}/.test(String(d0)) ||
          (typeof d0 === "number" && d0 > 40000 && d0 < 60000);
        if (!isDate) continue;
        reserve += toNum(row[3]);
        walkin += toNum(row[12]);
        visit += toNum(row[14]);
      }
      byMonth[ym] = {
        ...(byMonth[ym] ?? emptyMonth(ym)),
        ym,
        reserve_people: reserve,
        walkin_people: walkin,
        visit_people: visit,
        source: "P&L",
      };
    }
  }

  const out = Object.values(byMonth);
  if (out.length === 0) {
    throw new ExcelParseError(FILE, "'N월P&L' 또는 'N월현황' 시트를 찾지 못했습니다.");
  }
  return out;
}

function emptyMonth(ym: string): MonthlyRow {
  return {
    ym, total_revenue: 0, pos_revenue: 0, delivery_revenue: 0,
    reserve_people: 0, walkin_people: 0, visit_people: 0, source: "P&L",
  };
}

// ─────────────── (C) 시간대별 .xls ───────────────
/**
 * 행2: "조회일자 : 2026-01-01 ~ 2026-05-20  시간대 : 점심"
 * 행5: 시간대 헤더 (col4부터 3칸씩) "점심 [11]시" / "저녁 [16]시"
 * 행6: "실매출","매출건수","고객수" 반복
 * 행7~13: 요일별(일~토). col0=요일, col1~3=합계, col4~ 시간대별 3칸씩.
 */
export function parseHourly(buf: Buffer | ArrayBuffer, fileName = ""): HourlyRow[] {
  const FILE = `시간대별(${fileName || "?"})`;
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buf, { type: "buffer" });
  } catch (e: any) {
    throw new ExcelParseError(FILE, `파일을 열 수 없습니다(.xls 형식 확인): ${e?.message ?? e}`);
  }

  const aoa = readSheetAOA(wb.Sheets[wb.SheetNames[0]]);
  if (aoa.length < 8) throw new ExcelParseError(FILE, "행 수가 너무 적습니다. 시간대별 양식이 맞는지 확인해주세요.");

  // 조회기간 + 점심/저녁 판별
  const periodCell = String(aoa[2]?.[0] ?? aoa[1]?.[0] ?? "");
  const pm = periodCell.match(/(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/);
  const period_start = pm?.[1] ?? "";
  const period_end = pm?.[2] ?? "";
  const year = period_start ? Number(period_start.slice(0, 4)) : new Date().getFullYear();

  // 시간대 헤더 행 찾기 (보통 idx5). "[NN]시" 패턴 포함된 행
  let hdrRow = aoa.findIndex((r) => r?.some((c: any) => /\[\d{1,2}\]\s*시/.test(String(c ?? ""))));
  if (hdrRow < 0) throw new ExcelParseError(FILE, "시간대 헤더('점심 [11]시' 등)를 찾지 못했습니다.");

  // 컬럼 → 시간/식사 매핑 (col4부터)
  const colInfo: { col: number; hour: number; meal: "점심" | "저녁" }[] = [];
  for (let c = 4; c < aoa[hdrRow].length; c += 3) {
    const label = String(aoa[hdrRow][c] ?? "");
    const hm = label.match(/(점심|저녁)\s*\[(\d{1,2})\]/);
    if (hm) colInfo.push({ col: c, hour: Number(hm[2]), meal: hm[1] as "점심" | "저녁" });
  }
  if (colInfo.length === 0) throw new ExcelParseError(FILE, "시간대 컬럼을 해석하지 못했습니다.");

  // 데이터 행: 헤더+2 부터 요일명이 있는 행
  const out: HourlyRow[] = [];
  for (let r = hdrRow + 2; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row) continue;
    const wdName = String(row[0] ?? "").trim();
    if (wdName === "합계" || wdName === "") continue; // 합계행/빈행 skip
    const weekday = WEEKDAY_MAP[wdName];
    if (weekday === undefined) continue;

    for (const { col, hour, meal } of colInfo) {
      const revenue = toNum(row[col]);
      const count = toNum(row[col + 1]);
      const customers = toNum(row[col + 2]);
      if (revenue === 0 && count === 0 && customers === 0) continue; // 빈 칸 skip
      out.push({ weekday, hour, meal, revenue, count, customers, year, period_start, period_end });
    }
  }

  if (out.length === 0) throw new ExcelParseError(FILE, "요일별 데이터 행을 찾지 못했습니다.");
  return out;
}

/** 파일명/시트로 점심·저녁·매출표·P&L 종류 추정 */
export function detectFileType(fileName: string, buf: Buffer | ArrayBuffer):
  "sales_table" | "pl" | "hourly_lunch" | "hourly_dinner" | "unknown" {
  const n = fileName.toLowerCase();
  if (n.endsWith(".xls") || /시간대|점심|저녁/.test(fileName)) {
    if (/저녁/.test(fileName)) return "hourly_dinner";
    if (/점심/.test(fileName)) return "hourly_lunch";
    // 내용으로 판별
    try {
      const wb = XLSX.read(buf, { type: "buffer" });
      const aoa = readSheetAOA(wb.Sheets[wb.SheetNames[0]]);
      const txt = JSON.stringify(aoa.slice(0, 6));
      if (/저녁/.test(txt)) return "hourly_dinner";
      if (/점심/.test(txt)) return "hourly_lunch";
    } catch {}
  }
  if (/매출표|전체.*매출/.test(fileName)) return "sales_table";
  if (/p_?l|p&l|손익/i.test(fileName)) return "pl";
  // 내용으로 최종 판별
  try {
    const wb = XLSX.read(buf, { type: "buffer" });
    const names = wb.SheetNames.join(" ");
    if (/년\s*매출/.test(names)) return "sales_table";
    if (/P&?L|현황/i.test(names)) return "pl";
  } catch {}
  return "unknown";
}
