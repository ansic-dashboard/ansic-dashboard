import { NextResponse } from "next/server";
import { fetchAllSales } from "@/lib/sales-fetcher";

export const revalidate = 300; // 5분

export async function GET() {
  try {
    const data = await fetchAllSales();
    return NextResponse.json({ ok: true, count: data.length, data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "fetch failed" },
      { status: 500 }
    );
  }
}
