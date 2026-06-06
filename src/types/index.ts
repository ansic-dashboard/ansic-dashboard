export type DailySales = {
  date: string;          // YYYY-MM-DD
  weekday: number;       // 0=일 ~ 6=토
  revenue: number;       // 총매출 (원)
  lunchRevenue?: number;
  dinnerRevenue?: number;
  deliveryRevenue?: number;  // 배달 매출
  // 운영지표 (operational.json에서 결합)
  reserveTeams?: number;
  reservePeople?: number;
  walkinTeams?: number;
  walkinPeople?: number;
  totalTeams?: number;
  totalPeople?: number;
  visitPeople?: number;
  phoneIn?: number;      // 유선전화 유입
  catchIn?: number;      // 캐치테이블 유입
  naverIn?: number;      // 네이버 유입
  turnover?: number;     // 회전율
  reserveRev?: number;   // 예약 매출
  walkinRev?: number;    // 워크인 매출
  lunchRev?: number;     // 점심 매출 (operational 별칭)
  dinnerRev?: number;    // 저녁 매출
};

export type MarketingCampaign = {
  id: string;
  startDate: string;
  type: "meta" | "influencer" | "other";
  title: string;
  description: string;
  cost: number;
  costBreakdown?: { label: string; amount: number }[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Influencer = {
  id: string;
  month: string;
  name: string;
  handle: string;
  concept: string;
  followers: string;
  cost: number;
  videoUrl?: string;
  shootDate?: string;
  status?: string;        // 촬영 전/촬영 완료/편집 중/업로드 완료
  strength: string;
  caution: string;
  renewalOpinion: string;
  insight?: InstagramInsight;
  createdAt?: string;
  updatedAt?: string;
};

export type InstagramInsight = {
  reach?: number;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
};

export type WeatherDay = {
  date: string;
  tempMin?: number;
  tempMax?: number;
  rain?: number;
  condition?: string;     // 맑음/흐림/비/눈
};

export type EditableNote = {
  key: string;            // 식별자
  value: string;
  updatedAt?: string;
};
