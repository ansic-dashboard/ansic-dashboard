import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const SEOUL = { lat: 37.5665, lon: 126.9780 };
export const revalidate = 1800;

export async function GET() {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, note: "OPENWEATHER_API_KEY 미설정 — 날씨 기능 비활성", data: null });
  }
  try {
    const cur = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${SEOUL.lat}&lon=${SEOUL.lon}&appid=${apiKey}&units=metric&lang=kr`,
      { next: { revalidate: 1800 } }
    ).then((r) => r.json());

    const data = {
      tempMin: cur.main?.temp_min,
      tempMax: cur.main?.temp_max,
      temp: cur.main?.temp,
      humidity: cur.main?.humidity,
      condition: cur.weather?.[0]?.description ?? "",
      rain: cur.rain?.["1h"] ?? 0,
    };

    // 오늘 날씨를 Supabase에 자동 기록 (매일 누적)
    const sb = getSupabase();
    if (sb) {
      const today = new Date().toISOString().slice(0, 10);
      await sb.from("weather_log").upsert({
        date: today,
        temp_min: data.tempMin, temp_max: data.tempMax, temp: data.temp,
        humidity: data.humidity, rain: data.rain, condition: data.condition,
        recorded_at: new Date().toISOString(),
      }, { onConflict: "date" });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "weather fetch failed" }, { status: 500 });
  }
}
