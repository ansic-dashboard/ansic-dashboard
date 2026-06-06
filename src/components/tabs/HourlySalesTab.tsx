"use client";
import { useState, useRef, useCallback } from "react";
import { Card, SectionTitle, Badge } from "@/components/ui";
import { useHourlyData } from "@/lib/hooks";
import HourlyAnalysisSection from "@/components/HourlyAnalysisSection";
import HourlyFindingsSummary from "@/components/HourlyFindingsSummary";

const TYPE_LABEL: Record<string, string> = {
  sales_table: "연간 매출표",
  pl: "P&L",
  hourly_lunch: "시간대별(점심)",
  hourly_dinner: "시간대별(저녁)",
};

function fmtDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function HourlySalesTab() {
  const { hourly, log, loading, reload } = useHourlyData();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ results?: any[]; errors?: string[]; message?: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const lastUpdate = log.length
    ? log.reduce((a: any, b: any) => (new Date(b.last_uploaded_at) > new Date(a.last_uploaded_at) ? b : a)).last_uploaded_at
    : undefined;

  const upload = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setUploading(true);
    setResult(null);
    try {
      const fd = new FormData();
      arr.forEach((f) => fd.append("files", f));
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json();
      setResult(j);
      if (j.ok) await reload();
    } catch (e: any) {
      setResult({ errors: [`업로드 실패: ${e?.message ?? "네트워크 오류"}`] });
    } finally {
      setUploading(false);
    }
  }, [reload]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) upload(e.dataTransfer.files);
  }, [upload]);

  return (
    <div className="space-y-6">
      <SectionTitle sub="OKPOS 엑셀(연간매출표 · P&L · 시간대별 점심/저녁)을 올리면 자동으로 분석합니다">
        시간대별 매출 관리
      </SectionTitle>

      {/* 분석 확정 결론 (항상 표시) */}
      <HourlyFindingsSummary />

      {/* 업로드 박스 */}
      <Card>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`rounded-xl border-2 border-dashed cursor-pointer transition-colors p-8 text-center ${
            dragging ? "border-[#1E3A8A] bg-[#EFF6FF]" : "border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#185FA5]"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".xls,.xlsx"
            className="hidden"
            onChange={(e) => e.target.files && upload(e.target.files)}
          />
          <div className="text-3xl mb-2">📁</div>
          {uploading ? (
            <p className="text-sm font-extrabold text-[#1E3A8A]">분석 중…</p>
          ) : (
            <>
              <p className="text-sm font-extrabold text-black">엑셀 파일을 여기로 끌어다 놓거나 클릭해서 선택</p>
              <p className="text-xs text-[#475569] mt-1 font-semibold">.xlsx · .xls 여러 개 동시 업로드 가능 · 같은 종류는 최신 파일로 교체됩니다</p>
            </>
          )}
        </div>

        {/* 마지막 업데이트 */}
        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
          <p className="text-xs font-bold text-[#475569]">
            마지막 업데이트: <span className="tnum font-extrabold text-black">{fmtDateTime(lastUpdate)}</span>
          </p>
          <div className="flex gap-1 flex-wrap">
            {log.map((l: any) => (
              <span key={l.file_type} title={`${fmtDateTime(l.last_uploaded_at)} · ${l.row_count}행`}>
                <Badge tone="neutral">{TYPE_LABEL[l.file_type] ?? l.file_type}</Badge>
              </span>
            ))}
          </div>
        </div>

        {/* 결과 / 에러 메시지 */}
        {result && (
          <div className="mt-3 space-y-2">
            {result.results && result.results.length > 0 && (
              <div className="rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] p-3">
                <p className="text-xs font-extrabold text-[#15803D] mb-1">✓ {result.message}</p>
                {result.results.map((r: any, i: number) => (
                  <p key={i} className="text-[11px] text-[#334155] font-semibold">
                    · {r.file} → {r.type} {r.rows}건{r.note ? ` (${r.note})` : ""}
                  </p>
                ))}
              </div>
            )}
            {result.errors && result.errors.length > 0 && (
              <div className="rounded-lg bg-[#FEF2F2] border border-[#FECACA] p-3">
                <p className="text-xs font-extrabold text-[#B91C1C] mb-1">⚠ 처리 중 문제</p>
                {result.errors.map((e: string, i: number) => (
                  <p key={i} className="text-[11px] text-[#7F1D1D] font-semibold">· {e}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 분석 결과 */}
      {loading ? (
        <div className="py-12 text-center text-sm text-[#475569] font-bold">불러오는 중…</div>
      ) : (
        <HourlyAnalysisSection hourlyRaw={hourly} />
      )}
    </div>
  );
}
