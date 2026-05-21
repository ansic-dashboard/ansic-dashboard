import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = getSupabase();
  if (!sb) {
    return NextResponse.json({ ok: true, data: [], note: "Supabase 미설정 - .env 확인" });
  }
  const { data, error } = await sb
    .from("marketing_campaigns")
    .select("*")
    .order("start_date", { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase 미설정" }, { status: 503 });
  const body = await req.json();
  const { data, error } = await sb
    .from("marketing_campaigns")
    .insert({
      start_date: body.startDate,
      type: body.type,
      title: body.title,
      description: body.description ?? "",
      cost: body.cost ?? 0,
      cost_breakdown: body.costBreakdown ?? [],
    })
    .select()
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function PATCH(req: NextRequest) {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase 미설정" }, { status: 503 });
  const body = await req.json();
  const { id, ...rest } = body;
  const update: any = { updated_at: new Date().toISOString() };
  if (rest.startDate !== undefined) update.start_date = rest.startDate;
  if (rest.type !== undefined) update.type = rest.type;
  if (rest.title !== undefined) update.title = rest.title;
  if (rest.description !== undefined) update.description = rest.description;
  if (rest.cost !== undefined) update.cost = rest.cost;
  if (rest.costBreakdown !== undefined) update.cost_breakdown = rest.costBreakdown;
  const { data, error } = await sb
    .from("marketing_campaigns")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(req: NextRequest) {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase 미설정" }, { status: 503 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const { error } = await sb.from("marketing_campaigns").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
