"use client";
import { useEffect, useState } from "react";

export type MenuItem = { name: string; amount: number; count?: number };
export type MenuMonth = { 식사: MenuItem[]; 카페: MenuItem[]; foodTotal: number; cafeTotal: number };

/** /data/menu.json (P&L 식사/카페 메뉴별 매출, 월별) */
export function useMenu() {
  const [data, setData] = useState<Record<string, MenuMonth>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/data/menu.json")
      .then((r) => r.json())
      .then((j) => setData(j.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  return { data, loading };
}

/** 사용 가능한 월 목록 (최신순) */
export function menuMonths(data: Record<string, MenuMonth>): string[] {
  return Object.keys(data).sort().reverse();
}
