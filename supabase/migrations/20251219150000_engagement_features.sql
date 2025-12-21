-- Create Favorites Table
create table if not exists public.favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  store_id uuid references public.stores(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, store_id)
);

-- RLS for Favorites
alter table public.favorites enable row level security;

create policy "Users can view their own favorites"
  on public.favorites for select
  using (auth.uid() = user_id);

create policy "Users can add favorites"
  on public.favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can remove their own favorites"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- Create Reviews Table
create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete set null,
  reviewer_id uuid references public.profiles(id) on delete cascade not null,
  target_id uuid not null, -- Can be store_id or driver_id (profile_id)
  type text check (type in ('store', 'driver')) not null,
  rating integer check (rating >= 1 and rating <= 5) not null,
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Reviews
alter table public.reviews enable row level security;

create policy "Anyone can read reviews"
  on public.reviews for select
  using (true);

create policy "Users can create reviews"
  on public.reviews for insert
  with check (auth.uid() = reviewer_id);

-- Add indexes for performance
create index if not exists idx_favorites_user on public.favorites(user_id);
create index if not exists idx_reviews_target on public.reviews(target_id);
