"use client";
import { useEffect, useState, useCallback } from "react";
import type { DailySales } from "@/types";
import { loadOperational, mergeOperational } from "./operational";

/** 매출 + 운영지표 결합 */
export function useSales() {
  const [data, setData] = useState<DailySales[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [salesRes, op] = await Promise.all([
        fetch("/api/sheets", { cache: "no-store" }).then((r) => r.json()),
        loadOperational(),
      ]);
      if (salesRes.ok) {
        const merged = mergeOperational(salesRes.data, op);
        setData(merged);
        setError(null);
      } else setError(salesRes.error ?? "데이터 로드 실패");
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  return { data, loading, error, reload };
}

export function useCampaigns() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/marketing-cost");
      const j = await r.json();
      if (j.ok) setData(j.data ?? []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { data, loading, reload };
}

export function useInfluencers() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/influencer");
      const j = await r.json();
      if (j.ok) setData(j.data ?? []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { data, loading, reload };
}

export function useWeather() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch("/api/weather").then((r) => r.json()).then((j) => {
      if (j.ok) setData(j.data);
    }).catch(() => {});
  }, []);
  return data;
}

/** 시간대별 업로드 데이터 (monthly_sales / hourly_sales / upload_log) */
export function useHourlyData() {
  const [monthly, setMonthly] = useState<any[]>([]);
  const [hourly, setHourly] = useState<any[]>([]);
  const [log, setLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/upload", { cache: "no-store" });
      const j = await r.json();
      if (j.ok) {
        setMonthly(j.monthly ?? []);
        setHourly(j.hourly ?? []);
        setLog(j.log ?? []);
      }
    } catch { /* noop */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  return { monthly, hourly, log, loading, reload };
}

/** 편집 가능 노트 (Supabase 저장) */
export function useNotes() {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const r = await fetch("/api/notes");
      const j = await r.json();
      if (j.ok) {
        const map: Record<string, string> = {};
        (j.data ?? []).forEach((n: any) => { map[n.key] = n.value; });
        setNotes(map);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const saveNote = useCallback(async (key: string, value: string) => {
    setNotes((prev) => ({ ...prev, [key]: value }));
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    }).catch(() => {});
  }, []);

  return { notes, loading, saveNote, reload };
}
