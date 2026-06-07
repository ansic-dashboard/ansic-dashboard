import React from "react";

export function Card({ children, className = "", pad = "p-5" }: {
  children: React.ReactNode; className?: string; pad?: string;
}) {
  return <div className={`bg-white border border-[#CBD5E1] rounded-2xl ${pad} ${className}`}>{children}</div>;
}

export function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-black text-black">{children}</h2>
      {sub && <p className="text-sm text-[#475569] mt-1 font-semibold">{sub}</p>}
    </div>
  );
}

export function Delta({ value, suffix = "", inline = false }: { value: number | null | undefined; suffix?: string; inline?: boolean }) {
  if (value == null || isNaN(value)) return <span className="text-xs text-[#64748B] font-bold">—</span>;
  const isUp = value > 0, isDown = value < 0;
  const color = isUp ? "text-[#15803D]" : isDown ? "text-[#B91C1C]" : "text-[#475569]";
  const arrow = isUp ? "▲" : isDown ? "▼" : "■";
  const pct = `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
  return <span className={`inline-flex items-center gap-1 font-extrabold tnum ${inline ? "text-xs" : "text-sm"} ${color}`}><span className="text-[0.7em]">{arrow}</span>{pct}{suffix}</span>;
}

/** 큰 KPI 카드 (도식화 강조) */
export function KPICard({ label, value, unit, deltaPrev, deltaYoy, deltaPrevLabel = "전월 대비", deltaYoyLabel = "작년 대비", icon, accent }: {
  label: string; value: React.ReactNode; unit?: string;
  deltaPrev?: number | null; deltaYoy?: number | null;
  deltaPrevLabel?: string; deltaYoyLabel?: string;
  icon?: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-4 border-2 ${accent ? "bg-[#1E3A8A] border-[#1E3A8A]" : "bg-white border-[#CBD5E1]"}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className={accent ? "text-white" : "text-[#1E3A8A]"}>{icon}</span>}
        <p className={`text-xs font-extrabold uppercase tracking-wide ${accent ? "text-white/80" : "text-[#475569]"}`}>{label}</p>
      </div>
      <p className={`text-2xl md:text-[28px] font-black tnum leading-tight ${accent ? "text-white" : "text-black"}`}>
        {value}<span className="text-base font-bold ml-0.5">{unit}</span>
      </p>
      {(deltaPrev !== undefined || deltaYoy !== undefined) && (
        <div className={`mt-3 pt-2 border-t space-y-1 ${accent ? "border-white/20" : "border-[#E2E8F0]"}`}>
          {deltaPrev !== undefined && (
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold ${accent ? "text-white/70" : "text-[#64748B]"}`}>{deltaPrevLabel}</span>
              <Delta value={deltaPrev} inline />
            </div>
          )}
          {deltaYoy !== undefined && (
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold ${accent ? "text-white/70" : "text-[#64748B]"}`}>{deltaYoyLabel}</span>
              <Delta value={deltaYoy} inline />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "info" | "down" }) {
  const cls = tone === "good" ? "bg-[#15803D] text-white" : tone === "warn" ? "bg-[#B45309] text-white" :
    tone === "down" ? "bg-[#B91C1C] text-white" : tone === "info" ? "bg-[#1E3A8A] text-white" : "bg-[#475569] text-white";
  return <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wide ${cls}`}>{children}</span>;
}

export function EmptyState({ message }: { message: string }) {
  return <div className="py-12 text-center text-sm text-[#475569] font-bold">{message}</div>;
}

export function InsightCard({ level, title, detail, action }: { level: "warn" | "info" | "good"; title: string; detail?: string; action?: string }) {
  const stripe = level === "warn" ? "border-l-[#B91C1C] bg-[#FEF2F2]" : level === "good" ? "border-l-[#15803D] bg-[#F0FDF4]" : "border-l-[#1E3A8A] bg-[#EFF6FF]";
  const tag = level === "warn" ? "주의" : level === "good" ? "긍정" : "정보";
  const tone = level === "warn" ? "down" : level === "good" ? "good" : "info";
  return (
    <div className={`border border-[#CBD5E1] border-l-4 rounded-xl p-4 ${stripe}`}>
      <div className="mb-2"><Badge tone={tone as any}>{tag}</Badge></div>
      <p className="text-sm font-extrabold text-black leading-relaxed">{title}</p>
      {detail && <p className="text-xs text-[#334155] mt-1.5 leading-relaxed font-medium">{detail}</p>}
      {action && <div className="mt-2 pt-2 border-t border-[#CBD5E1]/60"><p className="text-xs font-extrabold text-black">→ {action}</p></div>}
    </div>
  );
}

/** 편집 가능 인사이트 카드 (자동 생성값을 기본으로, 수정 시 Supabase 저장) */
export function EditableInsightCard({ level, title, detail, action, noteKey, override, onSave }: {
  level: "warn" | "info" | "good"; title: string; detail?: string; action?: string;
  noteKey: string; override?: string; onSave: (key: string, value: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const autoText = [title, detail, action ? `→ ${action}` : ""].filter(Boolean).join("\n");
  const [draft, setDraft] = React.useState(override ?? autoText);
  React.useEffect(() => setDraft(override ?? autoText), [override, autoText]);

  const stripe = level === "warn" ? "border-l-[#B91C1C] bg-[#FEF2F2]" : level === "good" ? "border-l-[#15803D] bg-[#F0FDF4]" : "border-l-[#1E3A8A] bg-[#EFF6FF]";
  const tag = level === "warn" ? "주의" : level === "good" ? "긍정" : "정보";
  const tone = level === "warn" ? "down" : level === "good" ? "good" : "info";
  const display = override ?? autoText;

  return (
    <div className={`border border-[#CBD5E1] border-l-4 rounded-xl p-4 ${stripe}`}>
      <div className="mb-2 flex items-center justify-between">
        <Badge tone={tone as any}>{tag}</Badge>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-[10px] font-extrabold text-[#1E3A8A] opacity-60 hover:opacity-100">✎ 수정</button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={5} autoFocus
            className="w-full border-2 border-[#1E3A8A] rounded-lg px-2 py-1.5 text-xs font-medium text-black leading-relaxed" />
          <div className="flex gap-2">
            <button onClick={() => { onSave(noteKey, draft); setEditing(false); }} className="text-xs font-extrabold bg-[#1E3A8A] text-white px-3 py-1 rounded">저장</button>
            <button onClick={() => { setDraft(display); setEditing(false); }} className="text-xs font-bold text-[#475569]">취소</button>
            {override && <button onClick={() => { onSave(noteKey, ""); setEditing(false); }} className="text-xs font-bold text-[#B91C1C] ml-auto">자동값 복원</button>}
          </div>
        </div>
      ) : (
        <p className="text-xs text-black leading-relaxed font-medium whitespace-pre-line">{display}</p>
      )}
    </div>
  );
}

/** 편집 가능 텍스트 (Supabase 저장) */
export function EditableText({ value, onSave, multiline = false, className = "", placeholder = "" }: {
  value: string; onSave: (v: string) => void; multiline?: boolean; className?: string; placeholder?: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);
  const save = () => { if (draft !== value) onSave(draft); setEditing(false); };

  if (editing) {
    return (
      <div className="space-y-2">
        {multiline ? (
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} autoFocus
            className="w-full border-2 border-[#1E3A8A] rounded-lg px-2 py-1.5 text-sm font-medium text-black" />
        ) : (
          <input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus
            className="w-full border-2 border-[#1E3A8A] rounded-lg px-2 py-1.5 text-sm font-medium text-black" />
        )}
        <div className="flex gap-2">
          <button onClick={save} className="text-xs font-extrabold bg-[#1E3A8A] text-white px-3 py-1 rounded">저장</button>
          <button onClick={() => { setDraft(value); setEditing(false); }} className="text-xs font-bold text-[#475569]">취소</button>
        </div>
      </div>
    );
  }
  return (
    <div onClick={() => setEditing(true)} className={`cursor-pointer hover:bg-[#F1F5F9] rounded px-1 -mx-1 group ${className}`} title="클릭해서 수정">
      {value || <span className="text-[#94A3B8] italic font-medium">{placeholder || "클릭해서 입력"}</span>}
      <span className="opacity-0 group-hover:opacity-100 text-[10px] text-[#1E3A8A] ml-1 font-bold">✎</span>
    </div>
  );
}

/** 진행률 바 (깔끔하게) */
export function ProgressBar({ pct, color = "#1E3A8A", height = "h-3" }: { pct: number; color?: string; height?: string }) {
  return (
    <div className={`w-full bg-[#E2E8F0] rounded-full ${height} overflow-hidden`}>
      <div className={`${height} rounded-full transition-all`} style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%`, background: color }} />
    </div>
  );
}

/** 페이지 상단 핵심 요약 헤더 — 수치를 큰 글씨로 강조 (줄글 X) */
export function SummaryHeader({ title, sub, metrics }: {
  title: string; sub?: string;
  metrics: { label: string; value: React.ReactNode; delta?: number | null; tone?: "default" | "good" | "warn" | "down" }[];
}) {
  return (
    <div className="bg-gradient-to-br from-[#1E3A8A] to-[#0C2A52] rounded-2xl p-5 md:p-6 mb-6">
      <h2 className="text-lg md:text-xl font-black text-white mb-1">{title}</h2>
      {sub && <p className="text-xs text-white/70 font-bold mb-4">{sub}</p>}
      <div className={`grid gap-3 ${metrics.length <= 2 ? "grid-cols-2" : metrics.length === 3 ? "grid-cols-3" : "grid-cols-2 md:grid-cols-4"}`}>
        {metrics.map((m, i) => {
          const vColor = m.tone === "good" ? "text-[#86EFAC]" : m.tone === "down" ? "text-[#FCA5A5]" : m.tone === "warn" ? "text-[#FCD34D]" : "text-white";
          return (
            <div key={i} className="bg-white/10 rounded-xl p-3">
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-wide mb-1.5 leading-tight">{m.label}</p>
              <p className={`text-xl md:text-2xl font-black tnum leading-none ${vColor}`}>{m.value}</p>
              {m.delta !== undefined && m.delta !== null && (
                <p className={`text-[11px] font-extrabold mt-1.5 ${m.delta > 0 ? "text-[#86EFAC]" : m.delta < 0 ? "text-[#FCA5A5]" : "text-white/70"}`}>
                  {m.delta > 0 ? "▲" : m.delta < 0 ? "▼" : ""} {Math.abs(m.delta * 100).toFixed(1)}%
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 용어 설명 툴팁 (작은 ? 아이콘) */
export function InfoTip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex items-center group align-middle">
      <span className="ml-1 w-4 h-4 rounded-full bg-[#94A3B8] text-white text-[10px] font-black flex items-center justify-center cursor-help">?</span>
      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block z-30 w-52 p-2 bg-[#0F172A] text-white text-[11px] font-medium rounded-lg leading-relaxed">{text}</span>
    </span>
  );
}
