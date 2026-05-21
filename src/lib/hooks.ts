"use client";
import { useEffect, useState, useCallback } from "react";
import type { DailySales } from "@/types";

export function useSales() {
  const [data, setData] = useState<DailySales[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/sheets", { cache: "no-store" });
      const j = await r.json();
      if (j.ok) {
        setData(j.data);
        setError(null);
      } else setError(j.error ?? "데이터 로드 실패");
    } catch (e: any) {
      setError(e?.message ?? "네트워크 오류");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

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
