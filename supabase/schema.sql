-- 안식 대시보드 v3.0 Supabase 스키마
-- 처음 설치 시: 전체 실행
-- 이미 v2.0이 있다면: 아래 ALTER TABLE 문만 실행

-- ▼ 처음 설치 ▼
create table if not exists marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  type text not null check (type in ('meta', 'influencer', 'other')),
  title text not null,
  description text default '',
  cost integer not null default 0,
  cost_breakdown jsonb default '[]'::jsonb,
  status text default 'completed',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists influencers (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  name text not null,
  handle text default '',
  concept text default '',
  followers text default '',
  cost integer not null default 0,
  video_url text default '',
  shoot_date date,
  status text default '촬영 전',
  strength text default '',
  caution text default '',
  renewal_opinion text default '',
  insight jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists editable_notes (
  key text primary key,
  value text default '',
  updated_at timestamptz default now()
);


-- ▼ v2.0 → v2.1 업그레이드 (이미 테이블 있으면 이거만 실행) ▼
alter table influencers add column if not exists shoot_date date;
alter table influencers add column if not exists status text default '촬영 전';
alter table marketing_campaigns add column if not exists status text default 'completed';

-- 인덱스
create index if not exists idx_campaigns_start on marketing_campaigns(start_date);
create index if not exists idx_influencers_month on influencers(month);

-- RLS
alter table marketing_campaigns enable row level security;
alter table influencers enable row level security;

drop policy if exists "anon all on campaigns" on marketing_campaigns;
drop policy if exists "anon all on influencers" on influencers;
create policy "anon all on campaigns" on marketing_campaigns
  for all using (true) with check (true);
create policy "anon all on influencers" on influencers
  for all using (true) with check (true);

alter table editable_notes enable row level security;
drop policy if exists "anon all on notes" on editable_notes;
create policy "anon all on notes" on editable_notes
  for all using (true) with check (true);


-- 기존 데이터 정리하고 다시 시드 (필요시 truncate 주석 해제)
-- truncate table marketing_campaigns;
-- truncate table influencers;

-- 캠페인 시드 (이미 있으면 skip, 새로 설치라면 실행)
insert into marketing_campaigns (start_date, type, title, description, cost, cost_breakdown, status) 
select * from (values
  ('2026-02-27'::date, 'meta', '메타광고 1차', '드리븐 진행', 4362621,
    '[{"label":"촬영비","amount":1000000},{"label":"광고비","amount":2912621},{"label":"관리비","amount":450000}]'::jsonb,
    'completed'),
  ('2026-04-14'::date, 'meta', '메타광고 2차', '드리븐 진행 — 2026-05-13 종료(이후 미집행)', 1906225,
    '[{"label":"광고비","amount":1456225},{"label":"관리비","amount":450000}]'::jsonb,
    'completed'),
  ('2026-04-16'::date, 'influencer', '4월 인플루언서 3명', '서울핫플 + 헤이지혜 + 아야미', 1950000,
    '[{"label":"서울핫플","amount":800000},{"label":"헤이지혜","amount":900000},{"label":"아야미","amount":250000}]'::jsonb,
    'completed'),
  ('2026-05-23'::date, 'influencer', '5월 인플루언서 3명', '최호준 + 머스트잇 + 고민', 2200000,
    '[{"label":"최호준","amount":800000},{"label":"머스트잇","amount":650000},{"label":"고민","amount":800000}]'::jsonb,
    'ongoing')
) as v(start_date, type, title, description, cost, cost_breakdown, status)
where not exists (select 1 from marketing_campaigns where title = v.title);

-- 인플루언서 시드 (엑셀 그대로)
insert into influencers (month, name, handle, concept, followers, cost, video_url, shoot_date, status, strength, caution, renewal_opinion, insight)
select * from (values
  ('2026-04', '서울핫플', '@seoulhotple', '지역기반 핫플레이스', '51.3만', 800000, '', '2026-04-16'::date, '업로드 완료',
   E'1. 촬영을 굉장히 세심하고 짜임새 있게 진행 (촬영만 2시간 진행)\n2. 릴스 영상 가이드라인을 잘 따라줌\n3. 강남권 잠재 고객에게 넓게 닿는 데 강함 (도달 4.4만 명, 조회 5.4만 회)\n4. 1조회당 14.8원으로 가성비 우수\n5. 응대 빠르고 협업 매끄러움',
   E'1. 영상을 본 사람들의 수는 많지만, 좋아요·댓글·공유 같은 적극적 반응은 적은 편\n2. 본 사람의 마음을 움직이는 효과보다 ''많이 알리는'' 광고판에 가까운 성격',
   '재계약 불필요 (안식 BI와 맞지않음)',
   '{"reach":43788,"views":54000,"likes":201,"comments":17,"shares":55,"saves":229,"er":0.0115}'::jsonb),
  ('2026-04', '헤이지혜', '@hey_jihye__', '라이프스타일/맛집', '23.8만', 900000, '', '2026-04-22'::date, '업로드 완료',
   E'1. 영상 인사이트 상시 제공\n2. A/S 및 제안 내용 즉각 대응\n3. 팔로워수에 비해 참여율 4.54%로 매크로 평균(1.5~3%) 크게 상회\n4. 공유 122개·저장 317개로 강력한 추천·재방문 의사 확보',
   E'1. 가격대가 비싸 조금 아쉬우나, 성과가 잘 나온 편\n2. 감성 콘텐츠 특성상 즉시 예약·방문보다 브랜드 빌딩 효과 중심',
   '재계약 불필요 (안식 BI와 맞지않음)',
   '{"reach":15999,"views":21420,"likes":253,"comments":24,"shares":122,"saves":317,"er":0.0454}'::jsonb),
  ('2026-04', '아야미 (Ayami)', '@ayamitakagi325', '일본인 인플루언서', '2.2만 (일본)', 250000, '', '2026-04-25'::date, '업로드 완료',
   E'1. 다른 인플루언서들과 비교하였을 때, 가성비가 좋음 (단순히 가격뿐 아니라 조회수·도달 모두 양호)\n2. 한국 거주 8년차 일본인 인플루언서로 ''관광객''이 아닌 ''한국 거주 일본인'' 입소문 채널 확보\n3. BTS 정국·RM 방문 화제성을 자연스럽게 활용',
   E'1. 공유수가 부족함 (사람들의 관심을 끌었다고 보기에는 어려움)\n2. 다른 상품 광고 영상이 많은 편\n3. 팔로워 2.2만 규모라 도달 한계 명확',
   '재계약 불필요 (다른 상품 광고와 섞어 릴스 촬영하여 안식 집중도 떨어짐)',
   '{"reach":5843,"views":8097,"likes":77,"comments":10,"shares":5,"saves":15,"er":0.0183}'::jsonb),
  ('2026-05', '최호준', '@trendyplace_curator', '트렌디 플레이스 큐레이터', '4.5만 마이크로', 800000, '', '2026-05-20'::date, '편집 중',
   E'1. @trendyplace_curator라는 ''트렌디 플레이스 큐레이터'' 컨셉이 안식과 결이 맞음\n2. 마이크로 인플루언서 4.5만 규모로 헤이지혜와 비슷한 결의 전환형 기대',
   E'1. 편집기간이 길어지고 있어, 업로드가 늦어지고 있음\n2. 초안 영상으로는 기대했던 퀄리티 대비 아쉬울 수 있음',
   '업로드 결과 본 후 판단',
   '{}'::jsonb),
  ('2026-05', '머스트잇 (Must Eat)', '@musteat_official', '맛집 큐레이션 (공식 계정)', '7.8만 마이크로', 650000, '', '2026-05-23'::date, '업로드 완료',
   E'1. 맛집 전문 공식 큐레이션 채널 (7.8만)\n2. 실제 요리사가 운영하고 있는 채널\n3. 디너 시간대 촬영으로 잡으면 ''저녁의 안식''을 강화할 수 있는 기회',
   E'1. 공식 계정 톤이 안식 BI(절제·고요)와 맞지 않을 수 있어 사전 가이드 필수\n2. 맛집 카테고리 콘텐츠는 자극적 톤으로 흐를 위험 있음',
   '5/23 촬영 후 평가',
   '{}'::jsonb),
  ('2026-05', '고민', '@koh_min_', '라이프스타일', '5.9만 마이크로', 800000, '', '2026-05-29'::date, '업로드 완료',
   E'1. 라이프스타일 마이크로 5.9만 규모\n2. 오전 11시 촬영 진행 예정 - 자연광·정원 풍경 활용 베스트 시간대\n3. 헤이지혜와 비슷한 결의 감성 콘텐츠 기대',
   E'1. 라이프스타일 컨셉이 음식보다 분위기에 치우칠 위험 있음\n2. 메뉴 클로즈업 컷 확보 필수',
   '5/29 촬영 후 평가',
   '{}'::jsonb)
) as v(month, name, handle, concept, followers, cost, video_url, shoot_date, status, strength, caution, renewal_opinion, insight)
where not exists (select 1 from influencers where name = v.name and month = v.month);

-- ▼ v3 추가: 날씨 자동 기록 ▼
create table if not exists weather_log (
  date date primary key,
  temp_min real,
  temp_max real,
  temp real,
  humidity real,
  rain real default 0,
  condition text default '',
  recorded_at timestamptz default now()
);
alter table weather_log enable row level security;
drop policy if exists "anon all on weather" on weather_log;
create policy "anon all on weather" on weather_log
  for all using (true) with check (true);


-- ════════════════════════════════════════════════════════════
-- ▼ v3.1 추가: 시간대별 매출 관리 (엑셀 업로드 자동 분석)
-- ════════════════════════════════════════════════════════════

-- (A,B) 월별 매출/인원 — 매출표 + P&L
create table if not exists monthly_sales (
  ym text primary key,                  -- "2026-01"
  total_revenue bigint not null default 0,
  pos_revenue bigint not null default 0,
  delivery_revenue bigint not null default 0,
  reserve_people integer not null default 0,
  walkin_people integer not null default 0,
  visit_people integer not null default 0,
  source text not null default '매출표', -- '매출표' | 'P&L'
  updated_at timestamptz default now()
);

-- (C) 시간대별 매출 — 요일 × 시간 × 식사
create table if not exists hourly_sales (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  weekday integer not null,             -- 0=일 ~ 6=토
  hour integer not null,                -- 11~21
  meal text not null,                   -- '점심' | '저녁'
  revenue bigint not null default 0,
  count integer not null default 0,
  customers integer not null default 0,
  period_start date,
  period_end date,
  updated_at timestamptz default now()
);

-- 업로드 이력 (마지막 업데이트 표시용)
create table if not exists upload_log (
  file_type text primary key,           -- 'sales_table' | 'pl' | 'hourly_lunch' | 'hourly_dinner'
  filename text default '',
  period_start date,
  period_end date,
  row_count integer default 0,
  last_uploaded_at timestamptz default now()
);

create index if not exists idx_hourly_year on hourly_sales(year);
create index if not exists idx_hourly_wd_hour on hourly_sales(weekday, hour);

-- RLS (기존 패턴: anon all)
alter table monthly_sales enable row level security;
alter table hourly_sales enable row level security;
alter table upload_log enable row level security;

drop policy if exists "anon all on monthly_sales" on monthly_sales;
drop policy if exists "anon all on hourly_sales" on hourly_sales;
drop policy if exists "anon all on upload_log" on upload_log;
create policy "anon all on monthly_sales" on monthly_sales for all using (true) with check (true);
create policy "anon all on hourly_sales" on hourly_sales for all using (true) with check (true);
create policy "anon all on upload_log" on upload_log for all using (true) with check (true);
