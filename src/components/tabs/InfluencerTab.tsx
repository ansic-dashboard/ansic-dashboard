"use client";
import { useMemo, useState } from "react";
import { useInfluencers } from "@/lib/hooks";
import { fmtKRW, fmtDate } from "@/lib/sales-analyzer";
import { Card, SectionTitle, Badge, EmptyState } from "@/components/ui";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

const STATUS_OPTIONS = ["촬영 전", "촬영 완료", "편집 중", "업로드 완료"] as const;

const TERM_GLOSSARY = [
  { term: "도달", simple: "영상을 본 사람 수 (같은 사람 여러 번 봐도 1명)", why: "실제 잠재고객 수" },
  { term: "조회", simple: "영상이 재생된 횟수 (한 사람이 3번 보면 3회)", why: "콘텐츠 노출량" },
  { term: "좋아요", simple: "마음에 들었다는 가벼운 표현", why: "기본 호감도" },
  { term: "댓글", simple: "직접 말 걸 만큼 흥미를 느꼈다는 신호", why: "깊은 관심도" },
  { term: "공유", simple: "친구한테 보낼 만큼 좋았다는 신호", why: "가장 강한 추천 의도" },
  { term: "저장", simple: "나중에 가보려고 북마크한 사람", why: "방문 의사 (매출 전환 직결)" },
  { term: "ER (참여율)", simple: "본 사람 중 몇 %가 반응했나 (좋아요+댓글+공유+저장 ÷ 도달)", why: "콘텐츠 품질 지표" },
  { term: "1조회당 비용", simple: "1번 재생되는 데 든 비용 (비용 ÷ 조회수)", why: "가격 효율 (낮을수록 좋음)" },
];

export default function InfluencerTab() {
  const { data: influencers, loading, reload } = useInfluencers();
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // ER 차트 데이터
  const chartData = useMemo(() => {
    return influencers
      .filter((i: any) => i.insight?.reach)
      .map((i: any) => {
        const ins = i.insight ?? {};
        const reach = ins.reach ?? 0;
        const er = reach > 0
          ? ((ins.likes ?? 0) + (ins.comments ?? 0) + (ins.shares ?? 0) + (ins.saves ?? 0)) / reach
          : 0;
        const cpv = ins.views ? i.cost / ins.views : 0;
        return {
          name: i.name.length > 7 ? i.name.slice(0, 7) + "…" : i.name,
          reach,
          views: ins.views ?? 0,
          likes: ins.likes ?? 0,
          er: parseFloat((er * 100).toFixed(2)),
          cpv: parseFloat(cpv.toFixed(1)),
        };
      })
      .sort((a: any, b: any) => b.er - a.er);
  }, [influencers]);

  if (loading) return <EmptyState message="로딩 중..." />;

  // 월별 그룹
  const grouped = influencers.reduce((acc: Record<string, any[]>, inf: any) => {
    (acc[inf.month] = acc[inf.month] || []).push(inf);
    return acc;
  }, {});
  const months = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle sub="2026년 4·5월 진행 6명의 정보·비용·정성평가·인사이트를 시간순 정리">
          인플루언서 진행 내역
        </SectionTitle>
        <p className="text-xs text-[#334155] font-medium">
          ★ 각 카드의 <strong>"수정"</strong> 버튼으로 정보·인사이트 수치·상태·촬영일을 직접 편집할 수 있습니다.
        </p>
      </Card>

      {/* 월별 카드 */}
      {months.map((m) => (
        <div key={m}>
          <SectionTitle sub={`${grouped[m].length}명`}>{m.replace("-", "년 ")}월</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {grouped[m].map((inf: any) => (
              <InfluencerCard
                key={inf.id}
                inf={inf}
                editing={editingId === inf.id}
                onEdit={() => setEditingId(inf.id)}
                onCancelEdit={() => setEditingId(null)}
                onSaved={() => { setEditingId(null); reload(); }}
              />
            ))}
          </div>
        </div>
      ))}

      {/* 비교 차트 */}
      {chartData.length > 0 && (
        <Card>
          <SectionTitle sub="ER (참여율) 높은 순으로 정렬">인플루언서 성과 비교</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartBlock title="ER (참여율, %)" data={chartData} dataKey="er" color="#15803D" unit="%" desc="높을수록 좋음" />
            <ChartBlock title="1조회당 비용 (원)" data={chartData} dataKey="cpv" color="#B45309" unit="원" desc="낮을수록 좋음 (가성비)" />
            <ChartBlock title="도달 (명)" data={chartData} dataKey="reach" color="#1E3A8A" unit="명" desc="영상을 본 사람 수" />
            <ChartBlock title="좋아요 (개)" data={chartData} dataKey="likes" color="#334155" unit="개" desc="기본 호감도" />
          </div>
        </Card>
      )}

      {/* 용어 설명 */}
      <Card>
        <button
          onClick={() => setGlossaryOpen(!glossaryOpen)}
          className="w-full flex items-center justify-between text-left"
        >
          <SectionTitle sub="쉽게 말하면 / 왜 보는가">📘 인스타 인사이트 용어 설명</SectionTitle>
          <span className="text-[#334155] text-sm font-bold">{glossaryOpen ? "▲ 닫기" : "▼ 펼치기"}</span>
        </button>
        {glossaryOpen && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[#CBD5E1] text-xs text-[#334155] bg-[#F1F5F9]">
                  <th className="text-left py-2 px-2 font-extrabold w-28">지표</th>
                  <th className="text-left py-2 px-2 font-extrabold">쉽게 말하면</th>
                  <th className="text-left py-2 px-2 font-extrabold">왜 보는가</th>
                </tr>
              </thead>
              <tbody>
                {TERM_GLOSSARY.map((t) => (
                  <tr key={t.term} className="border-b border-[#E2E8F0]">
                    <td className="py-2 px-2 font-extrabold text-black">{t.term}</td>
                    <td className="py-2 px-2 text-black font-medium">{t.simple}</td>
                    <td className="py-2 px-2 text-[#334155] font-medium">{t.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function ChartBlock({ title, data, dataKey, color, unit, desc }: any) {
  return (
    <div className="bg-white border border-[#CBD5E1] rounded-lg p-3">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-sm font-extrabold text-black">{title}</p>
        <span className="text-[10px] text-[#64748B] font-bold">{desc}</span>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#0F172A", fontWeight: 700 }} />
            <YAxis tick={{ fontSize: 9, fill: "#334155", fontWeight: 700 }} width={42} />
            <Tooltip
              contentStyle={{ background: "#FFF", border: "1px solid #CBD5E1", fontSize: 12, fontWeight: 600 }}
              formatter={(v: any) => `${v.toLocaleString()}${unit}`}
            />
            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function InfluencerCard({ inf, editing, onEdit, onCancelEdit, onSaved }: any) {
  const ins = inf.insight ?? {};
  const reach = ins.reach ?? 0;
  const er = reach > 0
    ? ((ins.likes ?? 0) + (ins.comments ?? 0) + (ins.shares ?? 0) + (ins.saves ?? 0)) / reach
    : 0;
  const cpv = ins.views ? inf.cost / ins.views : 0;
  const hasInsight = reach > 0;

  if (editing) {
    return <InfluencerEditor inf={inf} onCancel={onCancelEdit} onSaved={onSaved} />;
  }

  const statusTone = 
    inf.status === "업로드 완료" ? "good" :
    inf.status === "편집 중" ? "info" :
    inf.status === "촬영 완료" ? "info" : "warn";

  return (
    <Card pad="p-5">
      {/* 헤더: 이름 / 상태 */}
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-xl font-black text-black">{inf.name}</p>
        <Badge tone={statusTone}>{inf.status ?? "촬영 전"}</Badge>
      </div>
      <p className="text-sm text-[#1E3A8A] font-bold">{inf.handle}</p>
      <p className="text-xs text-[#334155] mt-1 mb-3 font-medium">{inf.concept}</p>

      {/* 기본 정보 라벨 명확하게 */}
      <div className="grid grid-cols-3 gap-2 mb-3 p-3 bg-[#F1F5F9] rounded">
        <div>
          <p className="text-[10px] text-[#334155] font-bold uppercase">팔로워</p>
          <p className="text-sm font-extrabold text-black">{inf.followers}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#334155] font-bold uppercase">비용</p>
          <p className="text-sm font-extrabold text-black tnum">{fmtKRW(inf.cost, { compact: true })}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#334155] font-bold uppercase">촬영일</p>
          <p className="text-sm font-extrabold text-black tnum">{inf.shoot_date ? fmtDate(inf.shoot_date, "md") : "미정"}</p>
        </div>
      </div>

      {/* 인사이트 수치 */}
      {hasInsight && (
        <div className="bg-white border border-[#CBD5E1] rounded p-3 mb-3">
          <p className="text-xs font-extrabold text-[#1E3A8A] mb-2">📊 인스타 인사이트</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            <Metric label="도달" value={ins.reach?.toLocaleString()} sub="영상 본 사람" />
            <Metric label="조회" value={ins.views?.toLocaleString()} sub="재생 횟수" />
            <Metric label="좋아요" value={ins.likes?.toLocaleString()} sub="" />
            <Metric label="댓글" value={ins.comments?.toLocaleString()} sub="" />
            <Metric label="공유" value={ins.shares?.toLocaleString()} sub="" />
            <Metric label="저장" value={ins.saves?.toLocaleString()} sub="" />
            <Metric label="ER" value={(er * 100).toFixed(2) + "%"} sub="참여율" highlight />
            <Metric label="CPV" value={cpv ? cpv.toFixed(1) + "원" : "—"} sub="1조회당" highlight />
          </div>
        </div>
      )}

      {/* 강점 */}
      {inf.strength && (
        <div className="mb-3 p-3 bg-[#F0FDF4] border-l-4 border-[#15803D] rounded">
          <p className="text-xs font-extrabold text-[#15803D] mb-1 uppercase">✓ 강점</p>
          <p className="text-sm text-black font-medium leading-relaxed whitespace-pre-wrap">{inf.strength}</p>
        </div>
      )}

      {/* 주의점 */}
      {inf.caution && (
        <div className="mb-3 p-3 bg-[#FFFBEB] border-l-4 border-[#B45309] rounded">
          <p className="text-xs font-extrabold text-[#B45309] mb-1 uppercase">⚠ 주의점</p>
          <p className="text-sm text-black font-medium leading-relaxed whitespace-pre-wrap">{inf.caution}</p>
        </div>
      )}

      {/* 재계약 의견 */}
      {inf.renewal_opinion && (
        <div className="mb-3 p-3 bg-[#DBEAFE] border-l-4 border-[#1E3A8A] rounded">
          <p className="text-xs font-extrabold text-[#1E3A8A] mb-1 uppercase">💼 재계약 의견</p>
          <p className="text-sm text-black font-extrabold">{inf.renewal_opinion}</p>
        </div>
      )}

      {/* 영상 보기 링크 */}
      {inf.video_url && (
        <a
          href={inf.video_url}
          target="_blank"
          rel="noreferrer"
          className="block mb-3 py-2 text-center bg-[#1E3A8A] text-white text-sm font-extrabold rounded hover:bg-[#0F172A] transition-colors"
        >
          ▶ 영상 보기
        </a>
      )}

      {/* 수정 버튼 */}
      <button
        onClick={onEdit}
        className="w-full py-2 text-sm font-extrabold text-[#1E3A8A] border-2 border-[#1E3A8A] rounded hover:bg-[#DBEAFE] transition-colors"
      >
        ✎ 정보 / 인사이트 / 상태 수정
      </button>
    </Card>
  );
}

function Metric({ label, value, sub, highlight }: any) {
  return (
    <div>
      <p className="text-[9px] text-[#334155] font-bold uppercase">{label}</p>
      <p className={`text-sm font-extrabold tnum ${highlight ? "text-[#1E3A8A]" : "text-black"}`}>{value ?? "—"}</p>
      {sub && <p className="text-[8px] text-[#64748B] font-medium">{sub}</p>}
    </div>
  );
}

function InfluencerEditor({ inf, onCancel, onSaved }: any) {
  const [s, setS] = useState({
    name: inf.name,
    handle: inf.handle,
    concept: inf.concept,
    followers: inf.followers,
    cost: inf.cost,
    videoUrl: inf.video_url ?? "",
    shootDate: inf.shoot_date ?? "",
    status: inf.status ?? "촬영 전",
    strength: inf.strength,
    caution: inf.caution,
    renewalOpinion: inf.renewal_opinion,
    insight: { ...(inf.insight ?? {}) },
  });
  const update = (k: string, v: any) => setS({ ...s, [k]: v });
  const updateInsight = (k: string, v: any) => setS({ ...s, insight: { ...s.insight, [k]: v } });

  const save = async () => {
    await fetch("/api/influencer", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: inf.id, ...s }),
    });
    onSaved();
  };

  return (
    <Card pad="p-5" className="border-2 border-[#1E3A8A]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-lg font-black text-black">{inf.name} 수정 중</p>
        <Badge tone="info">편집 모드</Badge>
      </div>

      <div className="space-y-3">
        {/* 기본 정보 */}
        <div>
          <p className="text-xs font-extrabold text-[#1E3A8A] mb-2">기본 정보</p>
          <div className="grid grid-cols-2 gap-2">
            <LabeledInput label="인스타 핸들" value={s.handle} onChange={(v) => update("handle", v)} placeholder="@account" />
            <LabeledInput label="팔로워 수" value={s.followers} onChange={(v) => update("followers", v)} placeholder="51.3만" />
            <LabeledInput label="비용 (원, 부가세 별도)" value={String(s.cost)} onChange={(v) => update("cost", parseInt(v || "0", 10))} type="number" />
            <LabeledInput label="촬영일" value={s.shootDate} onChange={(v) => update("shootDate", v)} type="date" />
          </div>
        </div>

        {/* 상태 드롭다운 */}
        <div>
          <label className="block text-xs font-extrabold text-[#1E3A8A] mb-1">진행 상태</label>
          <select
            value={s.status}
            onChange={(e) => update("status", e.target.value)}
            className="w-full border-2 border-[#CBD5E1] rounded px-3 py-2 text-sm font-bold text-black bg-white"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* 영상 링크 */}
        <LabeledInput label="영상 URL (영상 보기 버튼 링크)" value={s.videoUrl} onChange={(v) => update("videoUrl", v)} placeholder="https://www.instagram.com/p/..." />

        {/* 정성 평가 */}
        <div>
          <p className="text-xs font-extrabold text-[#1E3A8A] mb-2">정성 평가</p>
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-extrabold text-[#15803D] mb-1">✓ 강점</label>
              <textarea
                value={s.strength}
                onChange={(e) => update("strength", e.target.value)}
                rows={4}
                placeholder="1. 촬영을 세심하게 진행..."
                className="w-full border-2 border-[#CBD5E1] rounded px-2 py-1.5 text-sm font-medium text-black"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-[#B45309] mb-1">⚠ 주의점</label>
              <textarea
                value={s.caution}
                onChange={(e) => update("caution", e.target.value)}
                rows={3}
                placeholder="1. 도달은 크지만 반응이 적은 편..."
                className="w-full border-2 border-[#CBD5E1] rounded px-2 py-1.5 text-sm font-medium text-black"
              />
            </div>
            <LabeledInput label="💼 재계약 의견" value={s.renewalOpinion} onChange={(v) => update("renewalOpinion", v)} placeholder="재계약 검토 권장" />
          </div>
        </div>

        {/* 인스타 인사이트 */}
        <div>
          <p className="text-xs font-extrabold text-[#1E3A8A] mb-2">📊 인스타 인사이트 (수동 입력)</p>
          <p className="text-[10px] text-[#64748B] mb-2 font-medium">
            인스타그램 앱 → 영상 → '인사이트 보기' 에서 확인한 숫자를 입력하세요
          </p>
          <div className="grid grid-cols-2 gap-2">
            <InsightInput label="도달" sub="(영상 본 사람 수)" value={s.insight.reach} onChange={(v) => updateInsight("reach", v)} />
            <InsightInput label="조회" sub="(재생 횟수)" value={s.insight.views} onChange={(v) => updateInsight("views", v)} />
            <InsightInput label="좋아요" sub="" value={s.insight.likes} onChange={(v) => updateInsight("likes", v)} />
            <InsightInput label="댓글" sub="" value={s.insight.comments} onChange={(v) => updateInsight("comments", v)} />
            <InsightInput label="공유" sub="(친구한테 보낸 수)" value={s.insight.shares} onChange={(v) => updateInsight("shares", v)} />
            <InsightInput label="저장" sub="(북마크한 수)" value={s.insight.saves} onChange={(v) => updateInsight("saves", v)} />
          </div>
        </div>

        {/* 저장 / 취소 */}
        <div className="flex gap-2 pt-3 mt-3 border-t-2 border-[#CBD5E1]">
          <button onClick={onCancel} className="flex-1 py-2 text-sm font-extrabold text-[#334155] border-2 border-[#CBD5E1] rounded">취소</button>
          <button onClick={save} className="flex-1 py-2 text-sm font-extrabold text-white bg-[#1E3A8A] rounded">저장</button>
        </div>
      </div>
    </Card>
  );
}

function LabeledInput({ label, value, onChange, type = "text", placeholder = "" }: { label: string; value: any; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-extrabold text-[#334155] mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border-2 border-[#CBD5E1] rounded px-2 py-1.5 text-sm font-bold text-black"
      />
    </div>
  );
}

function InsightInput({ label, sub, value, onChange }: { label: string; sub?: string; value: any; onChange: (v: number | undefined) => void }) {
  return (
    <div>
      <label className="block text-xs font-extrabold text-black mb-1">
        {label}
        {sub && <span className="text-[10px] text-[#64748B] font-medium ml-1">{sub}</span>}
      </label>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
        placeholder="0"
        className="w-full border-2 border-[#CBD5E1] rounded px-2 py-1.5 text-sm font-bold text-black tnum"
      />
    </div>
  );
}
