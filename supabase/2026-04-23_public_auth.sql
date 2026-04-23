-- 公開フォームの閲覧に Google ログインを導入するスキーマ変更
-- 2026-04-23

-- ------------------------------------------------------------
-- 1. requests に user_id を追加 (依頼送信者の auth.users.id)
-- ------------------------------------------------------------
alter table public.requests
  add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists requests_user_id_idx on public.requests(user_id);

-- ------------------------------------------------------------
-- 2. 店舗アカウント: 特定メールを「店舗単位の閲覧者」として登録
-- ------------------------------------------------------------
create table if not exists public.store_accounts (
  email text primary key,
  store_id int not null references public.stores(id),
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.store_accounts enable row level security;

-- 誰でも読める (認証判定に使うので)
drop policy if exists "any_select_store_accounts" on public.store_accounts;
create policy "any_select_store_accounts" on public.store_accounts
  for select to anon, authenticated using (true);

-- 書込は管理者のみ (= allowed_emails に入っているユーザー)
drop policy if exists "admin_write_store_accounts" on public.store_accounts;
create policy "admin_write_store_accounts" on public.store_accounts
  for all to authenticated
  using ((auth.jwt() ->> 'email') in (select email from public.allowed_emails))
  with check ((auth.jwt() ->> 'email') in (select email from public.allowed_emails));

drop trigger if exists store_accounts_updated_at on public.store_accounts;
create trigger store_accounts_updated_at
  before update on public.store_accounts
  for each row execute function public.update_updated_at();

-- ------------------------------------------------------------
-- 3. 判定用のヘルパー関数
-- ------------------------------------------------------------
create or replace function public.is_admin_user()
returns boolean
language sql stable security definer as $$
  select exists(
    select 1 from public.allowed_emails
    where email = (auth.jwt() ->> 'email')
  );
$$;

create or replace function public.my_store_account_store_id()
returns int
language sql stable security definer as $$
  select store_id from public.store_accounts
  where email = (auth.jwt() ->> 'email')
  limit 1;
$$;

-- ------------------------------------------------------------
-- 4. RLS を書き換え: 認証ユーザーは役割に応じて見える範囲が変わる
-- ------------------------------------------------------------
drop policy if exists "auth_select_requests" on public.requests;
create policy "auth_select_requests" on public.requests
  for select to authenticated
  using (
    public.is_admin_user()
    or (public.my_store_account_store_id() is not null
        and store_id = public.my_store_account_store_id())
    or (user_id = auth.uid())
  );

-- update/delete: 管理者のみ
drop policy if exists "auth_update_requests" on public.requests;
create policy "auth_update_requests" on public.requests
  for update to authenticated
  using (public.is_admin_user());

drop policy if exists "auth_delete_requests" on public.requests;
create policy "auth_delete_requests" on public.requests
  for delete to authenticated
  using (public.is_admin_user());

-- insert: 管理者 or 認証済一般ユーザー (user_id 自分自身のみ) or anon はそのまま
drop policy if exists "auth_insert_requests" on public.requests;
create policy "auth_insert_requests" on public.requests
  for insert to authenticated
  with check (
    public.is_admin_user()
    or user_id = auth.uid()
  );

-- tasks: 管理者のみ (店舗/個人は閲覧不要)
drop policy if exists "auth_select_tasks" on public.tasks;
create policy "auth_select_tasks" on public.tasks
  for select to authenticated
  using (public.is_admin_user());
drop policy if exists "auth_insert_tasks" on public.tasks;
create policy "auth_insert_tasks" on public.tasks
  for insert to authenticated
  with check (public.is_admin_user());
drop policy if exists "auth_update_tasks" on public.tasks;
create policy "auth_update_tasks" on public.tasks
  for update to authenticated
  using (public.is_admin_user());
drop policy if exists "auth_delete_tasks" on public.tasks;
create policy "auth_delete_tasks" on public.tasks
  for delete to authenticated
  using (public.is_admin_user());

-- events: 管理者のみ
drop policy if exists "auth_select_events" on public.events;
create policy "auth_select_events" on public.events
  for select to authenticated
  using (public.is_admin_user());
drop policy if exists "auth_insert_events" on public.events;
create policy "auth_insert_events" on public.events
  for insert to authenticated
  with check (public.is_admin_user());
drop policy if exists "auth_update_events" on public.events;
create policy "auth_update_events" on public.events
  for update to authenticated
  using (public.is_admin_user());
drop policy if exists "auth_delete_events" on public.events;
create policy "auth_delete_events" on public.events
  for delete to authenticated
  using (public.is_admin_user());

-- presets / legacy_imports は既に管理者限定 write なのでそのまま

-- ------------------------------------------------------------
-- 5. 蘭○ 用の店舗アカウントを仮登録 (実ユーザーは Auth で別途作成)
-- ------------------------------------------------------------
insert into public.store_accounts (email, store_id, display_name)
select 'ranmaru1988.official@gmail.com', s.id, '蘭○ 店舗アカウント'
from public.stores s where s.name = '蘭○'
on conflict (email) do update set
  store_id = excluded.store_id,
  display_name = excluded.display_name,
  updated_at = now();
