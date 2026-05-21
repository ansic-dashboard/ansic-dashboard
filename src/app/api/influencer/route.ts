import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: true, data: [], note: "Supabase 미설정" });
  const { data, error } = await sb
    .from("influencers")
    .select("*")
    .order("month", { ascending: true })
    .order("shoot_date", { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase 미설정" }, { status: 503 });
  const body = await req.json();
  const { data, error } = await sb.from("influencers").insert({
    month: body.month,
    name: body.name,
    handle: body.handle ?? "",
    concept: body.concept ?? "",
    followers: body.followers ?? "",
    cost: body.cost ?? 0,
    video_url: body.videoUrl ?? "",
    shoot_date: body.shootDate || null,
    status: body.status ?? "촬영 전",
    strength: body.strength ?? "",
    caution: body.caution ?? "",
    renewal_opinion: body.renewalOpinion ?? "",
    insight: body.insight ?? {},
  }).select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function PATCH(req: NextRequest) {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase 미설정" }, { status: 503 });
  const body = await req.json();
  const { id, ...rest } = body;
  const update: any = { updated_at: new Date().toISOString() };
  const map: Record<string, string> = {
    month: "month", name: "name", handle: "handle", concept: "concept",
    followers: "followers", cost: "cost", videoUrl: "video_url",
    shootDate: "shoot_date", status: "status",
    strength: "strength", caution: "caution",
    renewalOpinion: "renewal_opinion", insight: "insight",
  };
  for (const [k, col] of Object.entries(map)) {
    if (rest[k] !== undefined) update[col] = rest[k] === "" ? null : rest[k];
  }
  const { data, error } = await sb.from("influencers").update(update).eq("id", id).select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(req: NextRequest) {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase 미설정" }, { status: 503 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const { error } = await sb.from("influencers").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
