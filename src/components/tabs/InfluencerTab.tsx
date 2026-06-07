"use client";
import { useMemo, useState } from "react";
import { useInfluencers } from "@/lib/hooks";
import { fmtKRW, fmtDate } from "@/lib/sales-analyzer";
import { Card, SectionTitle, Badge, EmptyState, InfoTip, SummaryHeader } from "@/components/ui";
import { INFLUENCER_DATA, JUNE_JULY_NOTE, type InfRecord } from "@/lib/influencer-data";

const SUB_TABS = [{ key: "summary", label: "통합 요약" }, { key: "monthly", label: "월별 인플루언서 조회" }] as const;
type SubKey = typeof SUB_TABS[number]["key"];

// Supabase 행을 InfRecord 형태로 정규화
function normalize(rows: any[]): InfRecord[] {
  return rows.map((r) => ({
    id: r.id, month: r.month, name: r.name, handle: r.handle, concept: r.concept,
    followers: r.followers, cost: r.cost || 0, video_url: r.video_url, status: r.status || "촬영 전",
    shoot_date: r.shoot_date, strength: r.strength, caution: r.caution, renewal_opinion: r.renewal_opinion,
    insight: r.insight && r.insight.reach ? r.insight : undefined,
  }));
}

const erOf = (i: InfRecord) => {
  const n = i.insight; if (!n?.reach) return null;
  return ((n.likes || 0) + (n.comments || 0) + (n.shares || 0) + (n.saves || 0)) / n.reach;
};
const cpvOf = (i: InfRecord) => (i.insight?.views ? i.cost / i.insight.views : null);

export default function InfluencerTab() {
  const { data: dbRows, loading } = useInfluencers();
  const [sub, setSub] = useState<SubKey>("summary");

  // Supabase에 데이터 있으면 사용, 없으면 내장 데이터
  const data: InfRecord[] = useMemo(() => {
    const norm = dbRows && dbRows.length ? normalize(dbRows) : INFLUENCER_DATA;
    return [...norm];
  }, [dbRows]);

  if (loading) return <EmptyState message="불러오는 중..." />;

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b-2 border-[#CBD5E1]">
        {SUB_TABS.map((t) => (
          <button key={t.key} onClick={() => setSub(t.key)}
            className={`px-5 py-2.5 text-sm font-extrabold border-b-[3px] -mb-0.5 transition-colors ${
              sub === t.key ? "text-[#1E3A8A] border-[#1E3A8A]" : "text-[#64748B] border-transparent hover:text-black"
            }`}>{t.label}</button>
        ))}
      </div>
      {sub === "summary" ? <SummaryView data={data} /> : <MonthlyView data={data} />}
    </div>
  );
}

/* ===== 통합 요약 (실제 성과 중심) ===== */
function SummaryView({ data }: { data: InfRecord[] }) {
  const s = useMemo(() => {
    const total = data.length;
    const cost = data.reduce((a, i) => a + i.cost, 0);
    const done = data.filter((i) => i.status === "업로드 완료").length;
    const withM = data.filter((i) => i.insight?.reach);
    const sumReach = withM.reduce((a, i) => a + (i.insight!.reach || 0), 0);
    const sumViews = withM.reduce((a, i) => a + (i.insight!.views || 0), 0);
    const sumLikes = withM.reduce((a, i) => a + (i.insight!.likes || 0), 0);
    const sumSaves = withM.reduce((a, i) => a + (i.insight!.saves || 0), 0);
    const measuredCost = withM.reduce((a, i) => a + i.cost, 0);
    const avgCpv = sumViews ? measuredCost / sumViews : 0;
    const pendingMetrics = data.filter((i) => i.status === "업로드 완료" && !i.insight?.reach).length;
    return { total, cost, done, withM, sumReach, sumViews, sumLikes, sumSaves, avgCpv, pendingMetrics };
  }, [data]);

  return (
    <div className="space-y-6">
      <SummaryHeader
        title="인플루언서 마케팅 성과 한눈에"
        sub="업로드 완료된 인플루언서의 실제 도달·조회·반응을 합산한 결과입니다"
        metrics={[
          { label: "총 진행 / 업로드 완료", value: `${s.total}명 / ${s.done}명` },
          { label: "총 집행 비용", value: fmtKRW(s.cost, { compact: true }) },
          { label: "총 조회수 (성과측정분)", value: s.sumViews.toLocaleString(), tone: "good" },
          { label: "총 도달 (실제 본 사람)", value: s.sumReach.toLocaleString(), tone: "good" },
        ]}
      />

      {/* 실제 성과 합계 */}
      <Card>
        <SectionTitle sub="성과가 측정된(업로드 약 1개월 경과) 인플루언서 기준 합계">실제 성과 합계</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="총 도달" value={s.sumReach.toLocaleString()} unit="명" tip="중복 제외, 실제 본 사람 수" />
          <Stat label="총 조회수" value={s.sumViews.toLocaleString()} unit="회" tip="재생 횟수(중복 포함)" />
          <Stat label="총 좋아요" value={s.sumLikes.toLocaleString()} unit="개" />
          <Stat label="총 저장" value={s.sumSaves.toLocaleString()} unit="개" tip="방문 의사 신호 — 매출 전환과 가장 가까움" />
          <Stat label="평균 1조회당 비용" value={Math.round(s.avgCpv).toLocaleString()} unit="원" tip="낮을수록 가성비 좋음" />
        </div>
      </Card>

      {/* 인플루언서별 성과 (쉬운 설명) */}
      {s.withM.length > 0 && (
        <Card>
          <SectionTitle sub="업로드 후 약 1개월 지나 성과가 측정된 인플루언서 · 숫자가 클수록 반응이 좋았다는 뜻">인플루언서별 성과 한눈에</SectionTitle>
          <div className="space-y-2">
            {s.withM.map((i) => {
              const n = i.insight!;
              const reach = n.reach || 0;
              const react = (n.likes || 0) + (n.comments || 0) + (n.shares || 0) + (n.saves || 0);
              const ratio = reach ? react / reach : 0;
              const cpv = cpvOf(i) || 0;
              // 쉬운 한 줄 평가
              let verdict = "", tone = "neutral";
              if (ratio >= 0.03) { verdict = "본 사람들이 많이 반응한 편 — 저장·좋아요가 잘 나왔어요."; tone = "good"; }
              else if (reach >= 30000 && ratio < 0.015) { verdict = "노출(도달)은 많았지만 실제 반응은 적은 편이에요."; tone = "warn"; }
              else { verdict = "도달·반응이 평균적인 수준이에요."; tone = "neutral"; }
              if (i.id === "ayami") verdict = "조회·반응 수치는 작지만, 업로드 후 일본인 손님 3팀이 실제로 방문했고 비용 대비 효율이 좋았어요.";
              const c = tone === "good" ? "#15803D" : tone === "warn" ? "#B45309" : "#475569";
              const bg = tone === "good" ? "#F0FDF4" : tone === "warn" ? "#FFFBEB" : "#F8FAFC";
              return (
                <div key={i.id} className="border border-[#E2E8F0] rounded-xl p-3" style={{ background: bg }}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="font-black text-black">{i.name} <span className="text-[11px] text-[#94A3B8] font-bold">{i.followers}</span></p>
                    <p className="text-[11px] font-bold text-[#475569]">
                      조회 <b className="text-black">{(n.views || 0).toLocaleString()}회</b> · 좋아요 <b className="text-black">{n.likes}</b> · 저장 <b className="text-black">{n.saves}</b> · 1조회당 <b className="text-[#1E3A8A]">{cpv.toFixed(1)}원</b>
                    </p>
                  </div>
                  <p className="text-[12px] font-bold mt-1" style={{ color: c }}>▸ {verdict}</p>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-[#64748B] font-semibold mt-3">※ '저장'은 나중에 가려고 저장해두는 행동이라, 실제 방문(매출)과 가장 가까운 신호로 봅니다.</p>
        </Card>
      )}

      {/* 진행 메모 */}
      <Card className="bg-[#EFF6FF] border-[#1E3A8A]/20">
        <p className="text-sm font-bold text-black leading-relaxed">
          ▣ 5월 인플루언서 3명(최호준·머스트잇·고민)은 영상 업로드가 모두 완료되어, 게시 약 1개월 시점에 도달·조회·반응 성과를 측정해 곧 분석할 예정입니다.
        </p>
        <p className="text-sm font-bold text-black leading-relaxed mt-2">▣ {JUNE_JULY_NOTE}</p>
        {s.pendingMetrics > 0 && <p className="text-xs text-[#475569] font-semibold mt-2">※ 현재 업로드 완료지만 성과 미측정 인플루언서 {s.pendingMetrics}명 — 측정되는 대로 위 합계에 반영됩니다.</p>}
      </Card>
    </div>
  );
}

function Stat({ label, value, unit, tip }: { label: string; value: string; unit?: string; tip?: string }) {
  return (
    <div className="border-2 border-[#CBD5E1] rounded-2xl p-4">
      <p className="text-[11px] font-bold text-[#475569] mb-1 leading-tight">{label}{tip && <InfoTip text={tip} />}</p>
      <p className="text-xl md:text-2xl font-black text-black tnum leading-tight">{value}<span className="text-sm font-bold ml-0.5">{unit}</span></p>
    </div>
  );
}

/* ===== 월별 인플루언서 조회 (가로형 성과표, 비용순) ===== */
function MonthlyView({ data }: { data: InfRecord[] }) {
  const grouped = useMemo(() => {
    const g: Record<string, InfRecord[]> = {};
    data.forEach((i) => { (g[i.month] = g[i.month] || []).push(i); });
    // 월 안에서 비용 높은 순
    Object.values(g).forEach((arr) => arr.sort((a, b) => b.cost - a.cost));
    return g;
  }, [data]);
  const months = Object.keys(grouped).sort().reverse();

  const HEAD = "py-2.5 px-2 font-extrabold text-white text-left whitespace-nowrap";
  const NUM = "py-2 px-2 text-right tnum border border-[#E2E8F0] align-top";

  return (
    <div className="space-y-6">
      {months.map((m) => (
        <Card key={m} pad="p-4">
          <div className="flex items-baseline gap-2 mb-3">
            <h3 className="text-lg font-black text-black">{m.replace("-", "년 ")}월</h3>
            <span className="text-sm font-bold text-[#475569]">{grouped[m].length}명 · 합계 {fmtKRW(grouped[m].reduce((s, i) => s + i.cost, 0), { compact: true })} · 비용 높은 순</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[1100px]">
              <thead>
                <tr style={{ background: "#1E3A8A" }}>
                  <th className={HEAD}>인플루언서</th>
                  <th className={HEAD + " text-right"}>팔로워</th>
                  <th className={HEAD + " text-right"}>비용</th>
                  <th className={HEAD + " text-center"}>상태</th>
                  <th className={HEAD + " text-center"}>영상</th>
                  <th className={HEAD + " text-right"}>도달</th>
                  <th className={HEAD + " text-right"}>조회</th>
                  <th className={HEAD + " text-right"}>좋아요</th>
                  <th className={HEAD + " text-right"}>댓글</th>
                  <th className={HEAD + " text-right"}>공유</th>
                  <th className={HEAD + " text-right"}>저장</th>
                  <th className={HEAD + " text-right"}>ER</th>
                  <th className={HEAD + " text-right"}>1조회당</th>
                  <th className={HEAD}>재계약</th>
                </tr>
              </thead>
              <tbody>
                {grouped[m].map((inf) => {
                  const n = inf.insight; const er = erOf(inf); const cpv = cpvOf(inf);
                  const dash = n?.reach ? "" : "—";
                  return (
                    <tr key={inf.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-2 px-2 border border-[#E2E8F0] align-top min-w-[150px]">
                        <p className="font-black text-black">{inf.name}</p>
                        <p className="text-[#1E3A8A] font-bold text-[11px]">{inf.handle}</p>
                        <p className="text-[#64748B] text-[10px] leading-tight">{inf.concept}</p>
                      </td>
                      <td className="py-2 px-2 text-right text-black font-bold border border-[#E2E8F0] align-top tnum whitespace-nowrap">{inf.followers}</td>
                      <td className="py-2 px-2 text-right text-black font-extrabold border border-[#E2E8F0] align-top tnum whitespace-nowrap">{fmtKRW(inf.cost, { compact: true })}</td>
                      <td className="py-2 px-2 text-center border border-[#E2E8F0] align-top">
                        <Badge tone={inf.status === "업로드 완료" ? "good" : inf.status === "편집 중" || inf.status === "촬영 완료" ? "info" : "warn"}>{inf.status}</Badge>
                        {inf.shoot_date && <p className="text-[9px] text-[#64748B] mt-1 font-bold whitespace-nowrap">촬영 {fmtDate(inf.shoot_date, "md")}</p>}
                      </td>
                      <td className="py-2 px-2 text-center border border-[#E2E8F0] align-top">
                        {inf.video_url ? <a href={inf.video_url} target="_blank" rel="noreferrer" className="text-[#1E3A8A] font-extrabold underline">▶ 보기</a> : <span className="text-[#CBD5E1]">—</span>}
                      </td>
                      <td className={NUM + " font-bold text-black"}>{n?.reach ? n.reach.toLocaleString() : dash}</td>
                      <td className={NUM + " font-bold text-black"}>{n?.views ? n.views.toLocaleString() : dash}</td>
                      <td className={NUM + " text-[#475569]"}>{n?.likes ?? dash}</td>
                      <td className={NUM + " text-[#475569]"}>{n?.comments ?? dash}</td>
                      <td className={NUM + " text-[#475569]"}>{n?.shares ?? dash}</td>
                      <td className={NUM + " text-[#475569]"}>{n?.saves ?? dash}</td>
                      <td className={NUM + " font-extrabold text-[#1E3A8A]"}>{er != null ? `${(er * 100).toFixed(2)}%` : dash}</td>
                      <td className={NUM + " font-extrabold text-[#1E3A8A]"}>{cpv != null ? `${cpv.toFixed(1)}원` : dash}</td>
                      <td className="py-2 px-2 text-black font-bold border border-[#E2E8F0] align-top min-w-[140px] text-[11px] leading-tight">{inf.renewal_opinion}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* 강점·주의점 (표 아래 카드) */}
          <div className="grid md:grid-cols-2 gap-2 mt-3">
            {grouped[m].map((inf) => (
              <div key={inf.id + "_note"} className="border border-[#E2E8F0] rounded-lg p-3 text-[11px] leading-relaxed">
                <p className="font-black text-black mb-1">{inf.name}</p>
                <p className="text-[#15803D] font-bold">강점</p><p className="text-[#334155] mb-1">{inf.strength}</p>
                <p className="text-[#B45309] font-bold">주의점</p><p className="text-[#334155]">{inf.caution}</p>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
