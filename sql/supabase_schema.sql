-- ==============================================================================
-- YatraLocal - Supabase Database Schema & Row Level Security (RLS)
-- Phase 17: User Authentication & Shared Community Reviews
-- ==============================================================================
-- Run this script in the Supabase Project Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Create the reviews table
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  place_key text not null,
  place_name text not null,
  target_type text check (target_type in ('stay', 'guide', 'destination', 'place')) not null,
  rating int check (rating >= 1 and rating <= 5) not null,
  comment text check (char_length(comment) >= 10 and char_length(comment) <= 300) not null,
  tags text[] default '{}'::text[],
  author_name text default 'Traveller',
  language text default 'en',
  created_at timestamptz default now() not null,
  -- Ensure 1 review per user per target/place
  constraint unique_user_target_review unique (user_id, place_key, target_type)
);

-- 2. Performance indexes
create index if not exists idx_reviews_place_key on public.reviews(place_key);
create index if not exists idx_reviews_target_type on public.reviews(target_type);
create index if not exists idx_reviews_created_at on public.reviews(created_at desc);
create index if not exists idx_reviews_user_id on public.reviews(user_id);

-- 3. Enable Row Level Security (RLS)
alter table public.reviews enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Anyone can read reviews" on public.reviews;
drop policy if exists "Authenticated users can submit a review" on public.reviews;
drop policy if exists "Users can update their own review" on public.reviews;
drop policy if exists "Users can delete their own review" on public.reviews;

-- Policy A: Anyone (including unauthenticated visitors) can read all reviews
create policy "Anyone can read reviews"
  on public.reviews for select
  using (true);

-- Policy B: Only authenticated users can submit a review with their own user_id
create policy "Authenticated users can submit a review"
  on public.reviews for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Policy C: Users can edit only their own review
create policy "Users can update their own review"
  on public.reviews for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy D: Users can delete only their own review
create policy "Users can delete their own review"
  on public.reviews for delete
  to authenticated
  using (auth.uid() = user_id);

-- 4. Aggregate Rating Summary View
create or replace view public.place_rating_summary as
select 
  place_key,
  target_type,
  round(avg(rating)::numeric, 1) as avg_rating,
  count(*)::int as review_count,
  count(*) filter (where rating = 5)::int as count_5,
  count(*) filter (where rating = 4)::int as count_4,
  count(*) filter (where rating = 3)::int as count_3,
  count(*) filter (where rating = 2)::int as count_2,
  count(*) filter (where rating = 1)::int as count_1
from public.reviews
group by place_key, target_type;

-- Allow public read access to the summary view
grant select on public.place_rating_summary to anon, authenticated;
