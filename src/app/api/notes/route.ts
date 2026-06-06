import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: true, data: [] });
  const { data, error } = await sb.from("editable_notes").select("*");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase 미설정" }, { status: 503 });
  const { key, value } = await req.json();
  const { data, error } = await sb
    .from("editable_notes")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" })
    .select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
