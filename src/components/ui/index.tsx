import React from "react";

export function Card({
  children,
  className = "",
  pad = "p-5",
}: {
  children: React.ReactNode;
  className?: string;
  pad?: string;
}) {
  return (
    <div className={`bg-white border border-[#CBD5E1] rounded-xl ${pad} ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-extrabold text-black">{children}</h2>
      {sub && <p className="text-sm text-[#334155] mt-1 font-medium">{sub}</p>}
    </div>
  );
}

/** 핵심 지표 카드 */
export function KPI({
  label,
  value,
  delta,
  deltaLabel,
  hint,
  size = "md",
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  delta?: number | null;
  deltaLabel?: string;
  hint?: string;
  size?: "sm" | "md" | "lg";
  highlight?: boolean;
}) {
  const sizeCls =
    size === "lg" ? "text-3xl md:text-4xl" : size === "sm" ? "text-xl" : "text-2xl md:text-3xl";
  const bg = highlight ? "bg-[#DBEAFE] border-[#1E3A8A]" : "bg-white border-[#CBD5E1]";
  return (
    <div className={`border-2 rounded-xl p-4 ${bg}`}>
      <p className="text-xs font-bold text-[#334155] mb-2 uppercase tracking-wide">{label}</p>
      <p className={`font-black text-black tnum leading-tight ${sizeCls}`}>{value}</p>
      {(delta !== undefined && delta !== null) && (
        <div className="mt-2 flex items-baseline gap-1.5">
          <Delta value={delta} />
          {deltaLabel && <span className="text-xs text-[#334155] font-semibold">{deltaLabel}</span>}
        </div>
      )}
      {hint && <p className="text-xs text-[#334155] mt-2 font-medium">{hint}</p>}
    </div>
  );
}

/** ▲▼ 증감 */
export function Delta({ value, suffix = "" }: { value: number | null | undefined; suffix?: string }) {
  if (value == null || isNaN(value)) {
    return <span className="text-xs text-[#64748B] font-bold">—</span>;
  }
  const isUp = value > 0;
  const isDown = value < 0;
  const color = isUp ? "text-[#15803D]" : isDown ? "text-[#B91C1C]" : "text-[#334155]";
  const arrow = isUp ? "▲" : isDown ? "▼" : "■";
  const pct = `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-extrabold tnum ${color}`}>
      <span className="text-xs">{arrow}</span>
      {pct}{suffix}
    </span>
  );
}

/** 인사이트 */
export function InsightCard({
  level,
  title,
  detail,
  action,
}: {
  level: "warn" | "info" | "good";
  title: string;
  detail?: string;
  action?: string;
}) {
  const stripe =
    level === "warn" ? "border-l-[#B91C1C] bg-[#FEF2F2]" :
    level === "good" ? "border-l-[#15803D] bg-[#F0FDF4]" :
    "border-l-[#1E3A8A] bg-[#EFF6FF]";
  const badge =
    level === "warn" ? "bg-[#B91C1C] text-white" :
    level === "good" ? "bg-[#15803D] text-white" :
    "bg-[#1E3A8A] text-white";
  const tag = level === "warn" ? "주의" : level === "good" ? "긍정" : "정보";
  return (
    <div className={`border border-[#CBD5E1] border-l-4 rounded-lg p-4 ${stripe}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${badge}`}>{tag}</span>
      </div>
      <p className="text-sm font-extrabold text-black leading-relaxed">{title}</p>
      {detail && <p className="text-xs text-[#334155] mt-1.5 leading-relaxed font-medium">{detail}</p>}
      {action && (
        <div className="mt-2 pt-2 border-t border-[#CBD5E1]/50">
          <p className="text-xs font-bold text-black">→ {action}</p>
        </div>
      )}
    </div>
  );
}

/** 통계 셀 */
export function StatCell({
  label,
  value,
  delta,
  helper,
}: {
  label: string;
  value: React.ReactNode;
  delta?: number | null;
  helper?: string;
}) {
  return (
    <div>
      <p className="text-xs text-[#334155] font-bold mb-1">{label}</p>
      <p className="text-base font-extrabold text-black tnum">{value}</p>
      {delta !== undefined && delta !== null && (
        <div className="mt-1"><Delta value={delta} /></div>
      )}
      {helper && <p className="text-[10px] text-[#64748B] mt-0.5 font-medium">{helper}</p>}
    </div>
  );
}

/** 뱃지 */
export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "info" | "down";
}) {
  const cls =
    tone === "good" ? "bg-[#15803D] text-white" :
    tone === "warn" ? "bg-[#B45309] text-white" :
    tone === "down" ? "bg-[#B91C1C] text-white" :
    tone === "info" ? "bg-[#1E3A8A] text-white" :
    "bg-[#334155] text-white";
  return (
    <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wide ${cls}`}>
      {children}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center text-sm text-[#334155] font-bold">
      {message}
    </div>
  );
}

/** 편집 가능 텍스트 */
export function EditableText({
  value,
  onSave,
  multiline = false,
  className = "",
  placeholder = "",
}: {
  value: string;
  onSave: (newValue: string) => void;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);

  React.useEffect(() => setDraft(value), [value]);

  const save = () => {
    if (draft !== value) onSave(draft);
    setEditing(false);
  };
  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-2">
        {multiline ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            className="w-full border border-[#1E3A8A] rounded px-2 py-1.5 text-sm font-medium text-black"
            autoFocus
          />
        ) : (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full border border-[#1E3A8A] rounded px-2 py-1.5 text-sm font-medium text-black"
            autoFocus
          />
        )}
        <div className="flex gap-2">
          <button onClick={save} className="text-xs font-bold bg-[#1E3A8A] text-white px-3 py-1 rounded">저장</button>
          <button onClick={cancel} className="text-xs font-bold text-[#334155]">취소</button>
        </div>
      </div>
    );
  }
  return (
    <div
      onClick={() => setEditing(true)}
      className={`cursor-pointer hover:bg-[#F1F5F9] -mx-1 px-1 rounded ${className}`}
      title="클릭해서 수정"
    >
      {value || <span className="text-[#64748B] italic font-medium">{placeholder || "클릭해서 입력"}</span>}
    </div>
  );
}
