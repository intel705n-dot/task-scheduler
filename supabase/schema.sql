-- ============================================================
-- Task Scheduler - Supabase Schema
-- ============================================================

-- 1. 許可メールリスト
create table public.allowed_emails (
  email text primary key
);

-- 2. プロファイル
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  display_name text not null,
  color text not null default '#6366f1',
  created_at timestamptz default now()
);

-- 3. 店舗マスタ
create table public.stores (
  id serial primary key,
  name text not null unique,
  color text not null default '#6b7280'
);

-- 4. タスク
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  status text not null default '未着手'
    check (status in ('未着手','作業中','仕上がり待ち','保留','返答待ち','データ待ち','確認待ち','完了')),
  priority text not null default '通常'
    check (priority in ('不死！','通常')),
  assignee_id uuid references public.profiles(id),
  store_id int references public.stores(id),
  due_date date,
  is_done boolean default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. カレンダーイベント
create table public.events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  event_date date not null,
  start_time time,
  end_time time,
  assignee_id uuid references public.profiles(id),
  store_id int references public.stores(id),
  priority text not null default '通常'
    check (priority in ('不死！','蘭○','他','通常')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 初期データ
-- ============================================================

insert into public.allowed_emails (email) values
  ('ch8.kid@gmail.com'),
  ('saya38719@gmail.com'),
  ('phoenix.nakatani@gmail.com'),
  ('kikuchi@leisurelarce.co.jp'),
  ('intel705n@gmail.com');

insert into public.stores (name, color) values
  ('本社', '#8B4513'),
  ('不死鳥', '#DC2626'),
  ('蘭○', '#7B2D8E'),
  ('風雲', '#E8A87C'),
  ('東レ', '#5BABDE'),
  ('その他', '#B0B0B0');

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

alter table public.allowed_emails enable row level security;
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.tasks enable row level security;
alter table public.events enable row level security;

-- allowed_emails: anon can SELECT (for login check)
create policy "anon_select_allowed_emails" on public.allowed_emails
  for select to anon using (true);
create policy "auth_select_allowed_emails" on public.allowed_emails
  for select to authenticated using (true);

-- profiles: authenticated full access, own row update only
create policy "auth_select_profiles" on public.profiles
  for select to authenticated using (true);
create policy "auth_insert_profiles" on public.profiles
  for insert to authenticated with check (true);
create policy "auth_update_own_profile" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- stores: authenticated full read
create policy "auth_select_stores" on public.stores
  for select to authenticated using (true);

-- tasks: authenticated full CRUD
create policy "auth_select_tasks" on public.tasks
  for select to authenticated using (true);
create policy "auth_insert_tasks" on public.tasks
  for insert to authenticated with check (true);
create policy "auth_update_tasks" on public.tasks
  for update to authenticated using (true);
create policy "auth_delete_tasks" on public.tasks
  for delete to authenticated using (true);

-- events: authenticated full CRUD
create policy "auth_select_events" on public.events
  for select to authenticated using (true);
create policy "auth_insert_events" on public.events
  for insert to authenticated with check (true);
create policy "auth_update_events" on public.events
  for update to authenticated using (true);
create policy "auth_delete_events" on public.events
  for delete to authenticated using (true);

-- ============================================================
-- Triggers
-- ============================================================

-- updated_at 自動更新
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.update_updated_at();

create trigger events_updated_at
  before update on public.events
  for each row execute function public.update_updated_at();

-- 新規ユーザー登録時にプロファイル自動作成
create or replace function public.handle_new_user()
returns trigger as $$
declare
  _display_name text;
  _color text;
begin
  -- メールアドレスから担当者名と色を判定
  case
    when new.email = 'ch8.kid@gmail.com' then
      _display_name := '菊池';
      _color := '#2563eb';
    when new.email = 'saya38719@gmail.com' then
      _display_name := '吉栖';
      _color := '#db2777';
    when new.email in ('phoenix.nakatani@gmail.com', 'kikuchi@leisurelarce.co.jp') then
      _display_name := '中谷';
      _color := '#0891b2';
    when new.email = 'intel705n@gmail.com' then
      _display_name := '中谷（オーナー）';
      _color := '#0891b2';
    else
      _display_name := split_part(new.email, '@', 1);
      _color := '#6366f1';
  end case;

  insert into public.profiles (id, email, display_name, color)
  values (new.id, new.email, _display_name, _color);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
