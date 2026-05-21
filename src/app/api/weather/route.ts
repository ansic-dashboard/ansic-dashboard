import { NextRequest, NextResponse } from "next/server";

// 서울 위도/경도
const SEOUL = { lat: 37.5665, lon: 126.9780 };

export const revalidate = 1800; // 30분

export async function GET(req: NextRequest) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      note: "OPENWEATHER_API_KEY 미설정",
      data: null,
    });
  }
  try {
    // 현재 날씨
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
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "weather fetch failed" },
      { status: 500 }
    );
  }
}
