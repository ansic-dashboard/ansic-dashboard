"use client";
import { useMemo, useState } from "react";
import { useInfluencers } from "@/lib/hooks";
import { fmtKRW, fmtDate } from "@/lib/sales-analyzer";
import { Card, SectionTitle, Badge, EmptyState, InfoTip, SummaryHeader } from "@/components/ui";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const STATUS_OPTIONS = ["촬영 전", "촬영 완료", "편집 중", "업로드 완료"];
const SUB_TABS = [{ key: "summary", label: "통합 요약" }, { key: "monthly", label: "월별 인플루언서 조회" }] as const;
type SubKey = typeof SUB_TABS[number]["key"];

export default function InfluencerTab() {
  const { data: influencers, loading, reload } = useInfluencers();
  const [sub, setSub] = useState<SubKey>("summary");
  const [editingId, setEditingId] = useState<string | null>(null);

  if (loading) return <EmptyState message="불러오는 중..." />;

  return (
    <div className="space-y-6">
      {/* 서브탭 */}
      <div className="flex gap-1 border-b-2 border-[#CBD5E1]">
        {SUB_TABS.map((t) => (
          <button key={t.key} onClick={() => setSub(t.key)}
            className={`px-5 py-2.5 text-sm font-extrabold border-b-[3px] -mb-0.5 transition-colors ${
              sub === t.key ? "text-[#1E3A8A] border-[#1E3A8A]" : "text-[#64748B] border-transparent hover:text-black"
            }`}>{t.label}</button>
        ))}
      </div>

      {sub === "summary" ? <SummaryView influencers={influencers} /> :
        <MonthlyView influencers={influencers} editingId={editingId} setEditingId={setEditingId} reload={reload} />}
    </div>
  );
}

/* ===== 통합 요약 ===== */
function SummaryView({ influencers }: { influencers: any[] }) {
  const stats = useMemo(() => {
    const total = influencers.length;
    const cost = influencers.reduce((s, i) => s + (i.cost || 0), 0);
    const byStatus: Record<string, number> = {};
    influencers.forEach((i) => { const st = i.status || "촬영 전"; byStatus[st] = (byStatus[st] || 0) + 1; });

    // ER 계산
    const withInsight = influencers.filter((i) => i.insight?.reach);
    const erData = withInsight.map((i) => {
      const ins = i.insight;
      const er = ins.reach ? ((ins.likes || 0) + (ins.comments || 0) + (ins.shares || 0) + (ins.saves || 0)) / ins.reach : 0;
      return { name: i.name.length > 6 ? i.name.slice(0, 6) + "…" : i.name, er: +(er * 100).toFixed(2), cost: i.cost };
    }).sort((a, b) => b.er - a.er);

    const best = erData[0];
    const worst = erData[erData.length - 1];
    return { total, cost, byStatus, erData, best, worst };
  }, [influencers]);

  return (
    <div className="space-y-6">
      {/* 상단 핵심 요약 */}
      <SummaryHeader
        title="인플루언서 마케팅 한눈에 보기"
        metrics={[
          { label: "총 진행 인원", value: `${stats.total}명` },
          { label: "총 집행 비용", value: fmtKRW(stats.cost, { compact: true }) },
          { label: "업로드 완료", value: `${stats.byStatus["업로드 완료"] || 0}명`, tone: "good" },
          { label: "촬영·편집 진행 중", value: `${(stats.byStatus["촬영 전"] || 0) + (stats.byStatus["촬영 완료"] || 0) + (stats.byStatus["편집 중"] || 0)}명`, tone: "warn" },
        ]}
      />
      {/* 핵심 숫자 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#1E3A8A] rounded-2xl p-4">
          <p className="text-xs font-bold text-white/80 mb-1">총 진행 인원</p>
          <p className="text-3xl font-black text-white tnum">{stats.total}명</p>
        </div>
        <div className="bg-white border-2 border-[#CBD5E1] rounded-2xl p-4">
          <p className="text-xs font-bold text-[#475569] mb-1">총 집행 비용</p>
          <p className="text-2xl font-black text-black tnum">{fmtKRW(stats.cost, { compact: true })}</p>
        </div>
        <div className="bg-white border-2 border-[#CBD5E1] rounded-2xl p-4">
          <p className="text-xs font-bold text-[#475569] mb-1">업로드 완료</p>
          <p className="text-2xl font-black text-[#15803D] tnum">{stats.byStatus["업로드 완료"] || 0}명</p>
        </div>
        <div className="bg-white border-2 border-[#CBD5E1] rounded-2xl p-4">
          <p className="text-xs font-bold text-[#475569] mb-1">진행 예정/중</p>
          <p className="text-2xl font-black text-[#B45309] tnum">{(stats.byStatus["촬영 전"] || 0) + (stats.byStatus["촬영 완료"] || 0) + (stats.byStatus["편집 중"] || 0)}명</p>
        </div>
      </div>

      {/* 현재 상황 (자동 집계) */}
      <Card>
        <SectionTitle sub="월별 조회 탭에서 상태를 바꾸면 여기 숫자가 자동으로 갱신됩니다">현재 진행 상황</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATUS_OPTIONS.map((st) => {
            const tone = st === "업로드 완료" ? "good" : st === "편집 중" ? "info" : st === "촬영 완료" ? "info" : "warn";
            return (
              <div key={st} className="border-2 border-[#CBD5E1] rounded-2xl p-4 text-center">
                <div className="mb-2"><Badge tone={tone as any}>{st}</Badge></div>
                <p className="text-3xl font-black text-black tnum">{stats.byStatus[st] || 0}<span className="text-base font-bold">명</span></p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ER 비교 */}
      {stats.erData.length > 0 && (
        <Card>
          <SectionTitle sub="참여율이 높을수록 '본 사람이 실제로 반응한' 비율이 높다는 뜻 · 업로드 완료된 인플루언서만">
            성과 비교 — 참여율(ER)<InfoTip text="참여율(ER) = (좋아요+댓글+공유+저장) ÷ 도달 × 100. 게시물을 본 사람 중 몇 %가 반응했는지를 나타냅니다. 보통 1.5~3%면 평균, 그 이상이면 좋은 편입니다." />
          </SectionTitle>
          <div className="h-56 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.erData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#0F172A", fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 10, fill: "#475569", fontWeight: 700 }} width={42} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ fontSize: 13, fontWeight: 600 }} formatter={(v: any) => [`${v}%`, "ER"]} />
                <Bar dataKey="er" fill="#15803D" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {stats.best && stats.worst && stats.best.name !== stats.worst.name && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#F0FDF4] border border-[#15803D] rounded-xl">
                <p className="text-xs font-bold text-[#15803D]">가장 높은 참여율</p>
                <p className="text-sm font-black text-black mt-1">{stats.best.name} · ER {stats.best.er}%</p>
              </div>
              <div className="p-3 bg-[#FEF2F2] border border-[#B91C1C] rounded-xl">
                <p className="text-xs font-bold text-[#B91C1C]">가장 낮은 참여율</p>
                <p className="text-sm font-black text-black mt-1">{stats.worst.name} · ER {stats.worst.er}%</p>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

/* ===== 월별 인플루언서 조회 (표 형태) ===== */
function MonthlyView({ influencers, editingId, setEditingId, reload }: any) {
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    influencers.forEach((i: any) => { (g[i.month] = g[i.month] || []).push(i); });
    return g;
  }, [influencers]);
  const months = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      <p className="text-xs text-[#475569] font-bold">★ 각 행의 "수정" 버튼으로 정보·인사이트·상태를 직접 편집할 수 있습니다. 엑셀 2번째 시트와 같은 표 형태입니다.</p>
      {months.map((m) => (
        <Card key={m} pad="p-4">
          <div className="flex items-baseline gap-2 mb-3">
            <h3 className="text-lg font-black text-black">{m.replace("-", "년 ")}월</h3>
            <span className="text-sm font-bold text-[#475569]">{grouped[m].length}명 · 합계 {fmtKRW(grouped[m].reduce((s: number, i: any) => s + (i.cost || 0), 0), { compact: true })}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#1E3A8A] text-white">
                  <th className="py-2 px-2 font-extrabold text-left border border-[#1E3A8A]">인플루언서</th>
                  <th className="py-2 px-2 font-extrabold text-left border border-[#1E3A8A]">핸들/컨셉</th>
                  <th className="py-2 px-2 font-extrabold text-right border border-[#1E3A8A]">팔로워</th>
                  <th className="py-2 px-2 font-extrabold text-right border border-[#1E3A8A]">비용</th>
                  <th className="py-2 px-2 font-extrabold text-center border border-[#1E3A8A]">상태</th>
                  <th className="py-2 px-2 font-extrabold text-left border border-[#1E3A8A]">강점</th>
                  <th className="py-2 px-2 font-extrabold text-left border border-[#1E3A8A]">주의점</th>
                  <th className="py-2 px-2 font-extrabold text-left border border-[#1E3A8A]">재계약</th>
                  <th className="py-2 px-2 font-extrabold text-center border border-[#1E3A8A]">수정</th>
                </tr>
              </thead>
              <tbody>
                {grouped[m].map((inf: any) => {
                  const ins = inf.insight || {};
                  const hasInsight = ins.reach;
                  const er = ins.reach ? (((ins.likes||0)+(ins.comments||0)+(ins.shares||0)+(ins.saves||0))/ins.reach*100).toFixed(2) : null;
                  const cpv = ins.views ? (inf.cost/ins.views).toFixed(1) : null;
                  return (
                    <>
                      <tr key={inf.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-2 px-2 font-black text-black border border-[#E2E8F0] align-top">
                          {inf.name}
                          {inf.video_url && <a href={inf.video_url} target="_blank" rel="noreferrer" className="block text-[10px] text-[#1E3A8A] font-bold mt-1">▶ 영상</a>}
                        </td>
                        <td className="py-2 px-2 text-[#334155] font-medium border border-[#E2E8F0] align-top">
                          <span className="text-[#1E3A8A] font-bold">{inf.handle}</span><br/>{inf.concept}
                        </td>
                        <td className="py-2 px-2 text-right text-black font-bold border border-[#E2E8F0] align-top tnum">{inf.followers}</td>
                        <td className="py-2 px-2 text-right text-black font-extrabold border border-[#E2E8F0] align-top tnum">{fmtKRW(inf.cost, { compact: true })}</td>
                        <td className="py-2 px-2 text-center border border-[#E2E8F0] align-top">
                          <Badge tone={inf.status === "업로드 완료" ? "good" : inf.status === "편집 중" || inf.status === "촬영 완료" ? "info" : "warn"}>{inf.status || "촬영 전"}</Badge>
                          {inf.shoot_date && <p className="text-[9px] text-[#64748B] mt-1 font-bold">{fmtDate(inf.shoot_date, "md")}</p>}
                        </td>
                        <td className="py-2 px-2 text-[#334155] font-medium border border-[#E2E8F0] align-top max-w-[200px] whitespace-pre-wrap leading-relaxed">{inf.strength}</td>
                        <td className="py-2 px-2 text-[#334155] font-medium border border-[#E2E8F0] align-top max-w-[180px] whitespace-pre-wrap leading-relaxed">{inf.caution}</td>
                        <td className="py-2 px-2 text-black font-bold border border-[#E2E8F0] align-top max-w-[120px]">{inf.renewal_opinion}</td>
                        <td className="py-2 px-2 text-center border border-[#E2E8F0] align-top">
                          <button onClick={() => setEditingId(editingId === inf.id ? null : inf.id)} className="text-[10px] font-extrabold text-[#1E3A8A] border border-[#1E3A8A] rounded px-2 py-1">{editingId === inf.id ? "닫기" : "수정"}</button>
                        </td>
                      </tr>
                      {/* 인사이트 행 */}
                      {hasInsight && (
                        <tr key={inf.id + "_ins"} className="bg-[#F1F5F9]">
                          <td colSpan={9} className="py-2 px-3 border border-[#E2E8F0]">
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold text-[#334155]">
                              <span>도달 <b className="text-black tnum">{ins.reach?.toLocaleString()}</b></span>
                              <span>조회 <b className="text-black tnum">{ins.views?.toLocaleString()}</b></span>
                              <span>좋아요 <b className="text-black tnum">{ins.likes}</b></span>
                              <span>댓글 <b className="text-black tnum">{ins.comments}</b></span>
                              <span>공유 <b className="text-black tnum">{ins.shares}</b></span>
                              <span>저장 <b className="text-black tnum">{ins.saves}</b></span>
                              <span>ER <b className="text-[#1E3A8A] tnum">{er}%</b></span>
                              <span>1조회당 <b className="text-[#1E3A8A] tnum">{cpv}원</b></span>
                            </div>
                          </td>
                        </tr>
                      )}
                      {/* 편집 행 */}
                      {editingId === inf.id && (
                        <tr key={inf.id + "_edit"}>
                          <td colSpan={9} className="p-4 border border-[#1E3A8A] bg-white">
                            <Editor inf={inf} onSaved={reload} onCancel={() => setEditingId(null)} />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Editor({ inf, onSaved, onCancel }: any) {
  const [s, setS] = useState({
    handle: inf.handle, followers: inf.followers, cost: inf.cost,
    videoUrl: inf.video_url || "", shootDate: inf.shoot_date || "", status: inf.status || "촬영 전",
    strength: inf.strength, caution: inf.caution, renewalOpinion: inf.renewal_opinion,
    insight: { ...(inf.insight || {}) },
  });
  const up = (k: string, v: any) => setS({ ...s, [k]: v });
  const upi = (k: string, v: any) => setS({ ...s, insight: { ...s.insight, [k]: v } });
  const save = async () => {
    await fetch("/api/influencer", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: inf.id, ...s }) });
    onSaved();
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-black text-black">{inf.name} 수정</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <L label="핸들"><input value={s.handle} onChange={(e) => up("handle", e.target.value)} className={inp} /></L>
        <L label="팔로워"><input value={s.followers} onChange={(e) => up("followers", e.target.value)} className={inp} /></L>
        <L label="비용"><input type="number" value={s.cost} onChange={(e) => up("cost", +e.target.value)} className={inp} /></L>
        <L label="촬영일"><input type="date" value={s.shootDate} onChange={(e) => up("shootDate", e.target.value)} className={inp} /></L>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <L label="진행 상태">
          <select value={s.status} onChange={(e) => up("status", e.target.value)} className={inp}>
            {STATUS_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </L>
        <L label="영상 URL"><input value={s.videoUrl} onChange={(e) => up("videoUrl", e.target.value)} className={inp} placeholder="https://instagram.com/..." /></L>
      </div>
      <L label="강점"><textarea value={s.strength} onChange={(e) => up("strength", e.target.value)} rows={3} className={inp} /></L>
      <L label="주의점"><textarea value={s.caution} onChange={(e) => up("caution", e.target.value)} rows={2} className={inp} /></L>
      <L label="재계약 의견"><input value={s.renewalOpinion} onChange={(e) => up("renewalOpinion", e.target.value)} className={inp} /></L>
      <div>
        <p className="text-xs font-extrabold text-[#1E3A8A] mb-1">📊 인스타 인사이트</p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {[["reach", "도달"], ["views", "조회"], ["likes", "좋아요"], ["comments", "댓글"], ["shares", "공유"], ["saves", "저장"]].map(([k, lab]) => (
            <L key={k} label={lab}><input type="number" value={s.insight[k] ?? ""} onChange={(e) => upi(k, e.target.value ? +e.target.value : undefined)} className={inp} /></L>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="flex-1 py-2 text-sm font-extrabold text-[#475569] border-2 border-[#CBD5E1] rounded">취소</button>
        <button onClick={save} className="flex-1 py-2 text-sm font-extrabold text-white bg-[#1E3A8A] rounded">저장</button>
      </div>
    </div>
  );
}

const inp = "w-full border-2 border-[#CBD5E1] rounded px-2 py-1.5 text-sm font-bold text-black";
function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[10px] font-extrabold text-[#475569] mb-1">{label}</label>{children}</div>;
}
