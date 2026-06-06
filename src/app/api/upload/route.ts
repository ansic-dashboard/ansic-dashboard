/**
 * 엑셀 업로드 → 파싱 → Supabase 저장 (전체 교체 방식)
 * POST: multipart/form-data, field "files" (여러 개 가능)
 *
 * 정책:
 *  - 같은 종류 파일 재업로드 시 delete-then-insert (upsert 아님). 직원이 매번
 *    "기간 전체" 파일을 올리므로 누적 금지.
 *  - 매출표(A)에 있는 달은 매출표 우선, 없는 최근 달만 P&L 보충.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import {
  parseSalesTable, parsePL, parseHourly, detectFileType, ExcelParseError,
  type MonthlyRow, type HourlyRow,
} from "@/lib/excel-parser";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Result = { file: string; type: string; rows: number; note?: string };

export async function POST(req: NextRequest) {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase가 설정되지 않았습니다." }, { status: 503 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "업로드 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ ok: false, error: "업로드된 파일이 없습니다." }, { status: 400 });
  }

  const results: Result[] = [];
  const errors: string[] = [];

  // 수집 버킷
  let salesRows: MonthlyRow[] | null = null;
  let plRows: MonthlyRow[] | null = null;
  // ★ 부분 교체: 점심/저녁을 각각 따로 관리. 올라온 meal만 교체한다.
  const hourlyByMeal: Record<"점심" | "저녁", HourlyRow[]> = { 점심: [], 저녁: [] };
  const mealsTouched = new Set<"점심" | "저녁">();
  let salesTouched = false;

  for (const file of files) {
    const name = file.name;
    let buf: Buffer;
    try {
      buf = Buffer.from(await file.arrayBuffer());
    } catch {
      errors.push(`'${name}' 파일을 읽지 못했습니다.`);
      continue;
    }

    const type = detectFileType(name, buf);
    try {
      if (type === "sales_table") {
        salesRows = parseSalesTable(buf);
        salesTouched = true;
        results.push({ file: name, type: "연간 매출표", rows: salesRows.length });
      } else if (type === "pl") {
        const yr = guessYear(name);
        plRows = parsePL(buf, yr);
        salesTouched = true;
        results.push({ file: name, type: "P&L", rows: plRows.length });
      } else if (type === "hourly_lunch" || type === "hourly_dinner") {
        const rows = parseHourly(buf, name);
        const meal: "점심" | "저녁" = type === "hourly_lunch" ? "점심" : "저녁";
        // 파일이 실제로 담고 있는 meal을 신뢰 (파일명 오인 방지)
        const realMeal = rows[0]?.meal ?? meal;
        hourlyByMeal[realMeal].push(...rows);
        mealsTouched.add(realMeal);
        results.push({
          file: name,
          type: realMeal === "점심" ? "시간대별(점심)" : "시간대별(저녁)",
          rows: rows.length,
          note: rows[0] ? `${rows[0].period_start}~${rows[0].period_end}` : undefined,
        });
        await touchLog(sb, realMeal === "점심" ? "hourly_lunch" : "hourly_dinner", name, rows);
      } else {
        errors.push(`'${name}': 파일 종류를 인식하지 못했습니다. (매출표/P&L/시간대별 점심·저녁 중 하나여야 합니다)`);
      }
    } catch (e: any) {
      if (e instanceof ExcelParseError) errors.push(e.message);
      else errors.push(`'${name}' 파싱 중 오류: ${e?.message ?? e}`);
    }
  }

  // ── 월별 매출 저장 (매출표 우선 + P&L 보충) ──
  if (salesTouched && (salesRows || plRows)) {
    const merged = mergeMonthly(salesRows ?? [], plRows ?? []);
    try {
      // 전체 교체
      await sb.from("monthly_sales").delete().neq("ym", "__none__");
      if (merged.length) {
        const { error } = await sb.from("monthly_sales").insert(
          merged.map((m) => ({ ...m, updated_at: new Date().toISOString() }))
        );
        if (error) throw error;
      }
      if (salesRows) await touchLogSimple(sb, "sales_table", "연간 매출표", salesRows.length);
      if (plRows) await touchLogSimple(sb, "pl", "P&L", plRows.length);
    } catch (e: any) {
      errors.push(`월별 매출 저장 실패: ${e?.message ?? e}`);
    }
  }

  // ── 시간대별 저장 (★ 부분 교체: 올라온 meal만 삭제·재삽입, 나머지 meal은 보존) ──
  for (const meal of mealsTouched) {
    const rows = hourlyByMeal[meal];
    try {
      // 해당 meal 데이터만 삭제 (다른 meal은 그대로 둠)
      await sb.from("hourly_sales").delete().eq("meal", meal);
      // 500행씩 청크 insert
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500).map((r) => ({
          year: r.year, weekday: r.weekday, hour: r.hour, meal: r.meal,
          revenue: r.revenue, count: r.count, customers: r.customers,
          period_start: r.period_start || null, period_end: r.period_end || null,
          updated_at: new Date().toISOString(),
        }));
        const { error } = await sb.from("hourly_sales").insert(chunk);
        if (error) throw error;
      }
    } catch (e: any) {
      errors.push(`시간대별(${meal}) 저장 실패: ${e?.message ?? e}`);
    }
  }

  const ok = results.length > 0 && errors.length === 0;
  return NextResponse.json({
    ok: results.length > 0,
    results,
    errors,
    message: ok
      ? `${results.length}개 파일 처리 완료`
      : results.length > 0
        ? `${results.length}개 처리, ${errors.length}개 오류`
        : "처리된 파일이 없습니다.",
  });
}

// 파일명에서 연도 추정 (P&L용)
function guessYear(name: string): number {
  const m = name.match(/(20\d{2})/);
  return m ? Number(m[1]) : new Date().getFullYear();
}

// 매출표 우선 + P&L 보충
function mergeMonthly(sales: MonthlyRow[], pl: MonthlyRow[]): MonthlyRow[] {
  const map = new Map<string, MonthlyRow>();
  for (const m of sales) map.set(m.ym, m); // 매출표 먼저
  for (const m of pl) if (!map.has(m.ym)) map.set(m.ym, m); // 없는 달만 P&L
  return Array.from(map.values()).sort((a, b) => a.ym.localeCompare(b.ym));
}

async function touchLog(sb: any, type: string, name: string, rows: HourlyRow[]) {
  await sb.from("upload_log").upsert({
    file_type: type,
    filename: name,
    period_start: rows[0]?.period_start || null,
    period_end: rows[0]?.period_end || null,
    row_count: rows.length,
    last_uploaded_at: new Date().toISOString(),
  }, { onConflict: "file_type" }).then(() => {}, () => {});
}

async function touchLogSimple(sb: any, type: string, name: string, count: number) {
  await sb.from("upload_log").upsert({
    file_type: type, filename: name, row_count: count,
    last_uploaded_at: new Date().toISOString(),
  }, { onConflict: "file_type" }).then(() => {}, () => {});
}

// GET: 저장된 데이터 + 업로드 이력 조회
export async function GET() {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: true, monthly: [], hourly: [], log: [] });
  const [monthly, hourly, log] = await Promise.all([
    sb.from("monthly_sales").select("*").order("ym"),
    sb.from("hourly_sales").select("*"),
    sb.from("upload_log").select("*"),
  ]);
  return NextResponse.json({
    ok: true,
    monthly: monthly.data ?? [],
    hourly: hourly.data ?? [],
    log: log.data ?? [],
  });
}
