/**
 * 인플루언서 진행 내역 (안식 인플루언서 견적 및 성과 통합 보고서 - 2번째 시트 기준)
 * Supabase에 데이터가 없을 때 이 값을 폴백으로 사용한다. (엑셀 업로드/Supabase 입력 시 그 값이 우선)
 */
export type InfInsight = { reach?: number; views?: number; likes?: number; comments?: number; shares?: number; saves?: number };
export type InfRecord = {
  id: string; month: string; name: string; handle: string; concept: string;
  followers: string; cost: number; video_url?: string; status: string; shoot_date?: string;
  strength: string; caution: string; renewal_opinion: string; insight?: InfInsight;
};

export const INFLUENCER_DATA: InfRecord[] = [
  {
    id: "seoulhotple", month: "2026-04", name: "서울핫플", handle: "@seoulhotple", concept: "지역기반 핫플레이스",
    followers: "51.3만", cost: 800000, status: "업로드 완료", shoot_date: "2026-04-16",
    strength: "촬영을 세심·짜임새 있게 진행(촬영만 2시간). 릴스 가이드라인 양식 제공. 담당 8명 체계적 관리, 응대·A/S 빠름.",
    caution: "본 사람은 많지만 좋아요·댓글·공유 등 적극 반응은 적은 편. 인사이트 1회만 제공. 팔로워 대비 반응 부족.",
    renewal_opinion: "재계약 불필요 (안식 BI와 맞지 않음)",
    insight: { reach: 43788, views: 54000, likes: 201, comments: 17, shares: 55, saves: 229 },
  },
  {
    id: "heyjihye", month: "2026-04", name: "헤이지혜", handle: "@hey_jihye__", concept: "라이프스타일/맛집",
    followers: "23.8만", cost: 900000, status: "업로드 완료", shoot_date: "2026-04-23",
    strength: "영상 인사이트 상시 제공. A/S·제안 즉각 대응. 팔로워 대비 좋은 성과. 실질 팔로워 보유한 듯한 계정.",
    caution: "가격대가 비싸 조금 아쉬우나 성과는 잘 나온 편.",
    renewal_opinion: "재계약 불필요 (안식 BI와 맞지 않음)",
    insight: { reach: 15999, views: 21420, likes: 253, comments: 24, shares: 122, saves: 317 },
  },
  {
    id: "ayami", month: "2026-04", name: "아야미 (Ayami)", handle: "@ayamitakagi325", concept: "일본인 인플루언서",
    followers: "2.2만 (일본)", cost: 250000, status: "업로드 완료", shoot_date: "2026-04-24",
    strength: "타 인플루언서 대비 가성비 좋음(가격뿐 아니라 조회·도달 비교 시). 업로드 후 일본인 방문 3팀 바로 생김.",
    caution: "공유수 부족. 다른 상품 광고와 섞어 진행해 안식 집중도 떨어짐. 음식 소개·촬영 구도 아쉬움.",
    renewal_opinion: "재계약 불필요 (다른 광고와 섞어 촬영, 집중도 ↓)",
    insight: { reach: 5843, views: 8097, likes: 77, comments: 10, shares: 5, saves: 15 },
  },
  {
    id: "choi", month: "2026-05", name: "최호준", handle: "@trendyplace_curator", concept: "트렌디 플레이스 큐레이터",
    followers: "4.5만", cost: 800000, status: "업로드 완료", shoot_date: "2026-05-11",
    strength: "'트렌디 플레이스 큐레이터' 컨셉이 안식과 결이 맞음. DSLR 촬영(지금까지 중 최고 카메라). 직접 메뉴 선정·색감 맞춰 촬영.",
    caution: "편집기간 길어 업로드 지연. 초안은 기대 퀄리티 미달. 응대가 느림.",
    renewal_opinion: "업로드 결과 본 후 판단",
  },
  {
    id: "musteat", month: "2026-05", name: "머스트잇 (Must Eat)", handle: "@musteat_official", concept: "맛집 큐레이션(공식)",
    followers: "7.8만", cost: 650000, status: "업로드 완료", shoot_date: "2026-05-23",
    strength: "맛집 전문 공식 큐레이션 채널. 실제 요리사가 운영. 디너 시간대 촬영 → 저녁 테라스·정자·오솔길 등 공간·음식 소개.",
    caution: "—",
    renewal_opinion: "업로드 결과 본 후 판단",
  },
  {
    id: "komin", month: "2026-05", name: "고민", handle: "@koh_min_", concept: "라이프스타일",
    followers: "5.9만", cost: 800000, status: "업로드 완료", shoot_date: "2026-05-29",
    strength: "라이프스타일 마이크로(5.9만). 오전 11시 촬영 → 자연광·정원 풍경 활용 베스트 시간대. 헤이지혜와 비슷한 결의 감성 콘텐츠 기대.",
    caution: "—",
    renewal_opinion: "업로드 결과 본 후 판단",
  },
  {
    id: "togoing", month: "2026-06", name: "티고잉", handle: "@t_going_", concept: "맛집·공간 큐레이션",
    followers: "1.1만", cost: 250000, status: "편집 중", shoot_date: "2026-06-01",
    strength: "촬영 완료, 현재 편집 중. 발행 예정.",
    caution: "비용 입금 전(예정).",
    renewal_opinion: "업로드 결과 본 후 판단",
  },
  {
    id: "communaltable", month: "2026-06", name: "커뮤널테이블", handle: "communal_table", concept: "다이닝·공간 콘텐츠",
    followers: "확인 필요", cost: 0, status: "편집 중", shoot_date: "2026-06-01",
    strength: "촬영 완료, 현재 편집 중. 발행 예정.",
    caution: "비용 입금 전(예정). 비용 확정 시 입력.",
    renewal_opinion: "업로드 결과 본 후 판단",
  },
];

// 6·7월: 촬영 일정까지 확정됐고 비용 입금만 남은 상태(예정). 견적 단계 아님.
export const JUNE_JULY_NOTE = "6·7월 인플루언서는 촬영 일정까지 모두 확정됐고, 비용 입금만 남은 상태입니다(전원 촬영 예정). 현재 티고잉·커뮤널테이블은 촬영을 마치고 편집 중입니다.";
