export type DailySales = {
  date: string;          // YYYY-MM-DD
  weekday: number;       // 0=일 ~ 6=토
  revenue: number;       // 매출 (원)
  lunchRevenue?: number;
  dinnerRevenue?: number;
  teamsTotal?: number;   // 팀수 합
  peopleTotal?: number;  // 인원 합
  reservation?: number;  // 예약 팀수
  walkin?: number;       // 워크인 팀수
  catering?: number;     // 케이터링 매출 (있다면)
  isCateringHeavy?: boolean; // 케이터링 비중 큰 날 표시
};

export type MarketingCampaign = {
  id: string;
  startDate: string;
  type: "meta" | "influencer" | "other";
  title: string;
  description: string;
  cost: number;           // 부가세 별도 (원)
  costBreakdown?: { label: string; amount: number }[];
  createdAt?: string;
  updatedAt?: string;
};

export type Influencer = {
  id: string;
  month: string;          // 2026-04 등
  name: string;
  handle: string;
  concept: string;
  followers: string;      // "51.3만" 등 텍스트
  cost: number;
  videoUrl?: string;
  strength: string;
  caution: string;
  renewalOpinion: string;
  insight?: InstagramInsight;
  createdAt?: string;
  updatedAt?: string;
};

export type InstagramInsight = {
  reach?: number;     // 도달
  views?: number;     // 조회
  likes?: number;     // 좋아요
  comments?: number;  // 댓글
  shares?: number;    // 공유
  saves?: number;     // 저장
};

export type WeatherDay = {
  date: string;
  tempMin?: number;
  tempMax?: number;
  rain?: number;       // mm
  condition?: string;  // 맑음/흐림/비/눈 등
};
