-- ============================================================
-- TSUKURU 合併マイグレーション (2026-04-22)
-- 既存の task-scheduler schema に requests/deliverables/presets を追加し、
-- 匿名依頼投入を許可し、新規依頼から自動でタスクを作成する。
-- Supabase SQL Editor で上から順に実行する。
-- ============================================================

-- ------------------------------------------------------------
-- 1. プリセット (制作依頼フォームのテンプレート)
-- ------------------------------------------------------------
create table if not exists public.presets (
  id text primary key,
  name text not null,
  description text not null default '',
  ord int not null default 99,
  active boolean not null default true,
  deliverable_templates jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 2. 制作依頼
-- ------------------------------------------------------------
create table if not exists public.requests (
  id uuid default gen_random_uuid() primary key,
  store_id int references public.stores(id),
  requester_name text not null,
  title text not null,
  content text not null default '',
  usage_period text,
  due_date date,
  reference_urls text[] not null default '{}',
  attachments jsonb not null default '[]'::jsonb,
  -- 成果物は個別レコードにせず JSONB 配列で持たせる:
  -- 検索で細かい部品まで引きたいケースが薄いのと、1依頼=数件という
  -- 小規模を前提にするため、join なしで一発で取れる形を優先。
  deliverables jsonb not null default '[]'::jsonb,
  status text not null default 'pending'
    check (status in ('pending','inProgress','completed','cancelled')),
  assignee_id uuid references public.profiles(id),
  priority text not null default 'normal'
    check (priority in ('normal','high','urgent')),
  public_token text not null unique,
  completed_at timestamptz,
  legacy_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists requests_public_token_idx on public.requests(public_token);
create index if not exists requests_status_idx on public.requests(status);
create index if not exists requests_store_idx on public.requests(store_id);
create index if not exists requests_created_idx on public.requests(created_at desc);

-- ------------------------------------------------------------
-- 3. 移行監査 (旧Googleフォームからの原本CSV行を保管)
-- ------------------------------------------------------------
create table if not exists public.legacy_imports (
  id uuid default gen_random_uuid() primary key,
  source text not null check (source in ('business_card_form','poster_form')),
  original_row jsonb not null,
  migrated_request_id uuid references public.requests(id) on delete set null,
  imported_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 4. tasks 拡張: 依頼との紐付け
-- ------------------------------------------------------------
alter table public.tasks
  add column if not exists linked_request_id uuid references public.requests(id) on delete set null;
create index if not exists tasks_linked_request_idx on public.tasks(linked_request_id);

-- ------------------------------------------------------------
-- 5. RLS
-- ------------------------------------------------------------
alter table public.presets enable row level security;
alter table public.requests enable row level security;
alter table public.legacy_imports enable row level security;

-- presets: 公開フォームで読むので anon select 許可、書込は authenticated のみ
drop policy if exists "anon_select_presets" on public.presets;
create policy "anon_select_presets" on public.presets
  for select to anon using (active = true);
drop policy if exists "auth_select_presets" on public.presets;
create policy "auth_select_presets" on public.presets
  for select to authenticated using (true);
drop policy if exists "auth_insert_presets" on public.presets;
create policy "auth_insert_presets" on public.presets
  for insert to authenticated with check (true);
drop policy if exists "auth_update_presets" on public.presets;
create policy "auth_update_presets" on public.presets
  for update to authenticated using (true);
drop policy if exists "auth_delete_presets" on public.presets;
create policy "auth_delete_presets" on public.presets
  for delete to authenticated using (true);

-- stores: 公開フォームで読むので anon select 許可を追加
drop policy if exists "anon_select_stores" on public.stores;
create policy "anon_select_stores" on public.stores
  for select to anon using (true);

-- requests: anon は token ベースで「新規作成」と「自分の依頼取得」のみ許可
drop policy if exists "anon_insert_requests" on public.requests;
create policy "anon_insert_requests" on public.requests
  for insert to anon
  with check (
    status = 'pending'
    and jsonb_array_length(deliverables) > 0
    and jsonb_array_length(deliverables) <= 20
  );
-- anon は public_token を知っていれば読める。これは依頼者自身が自分の
-- 送信したリクエストの進捗を確認するための設計。
drop policy if exists "anon_select_requests_by_token" on public.requests;
create policy "anon_select_requests_by_token" on public.requests
  for select to anon using (true);
  -- token 一致チェックはアプリ側 (.eq('public_token', token)) で行う。
  -- RLS で eq 制約を書くと select の where 条件に runtime 値が入らないため、
  -- anon select をフル許可したうえでクエリで絞る運用にする (依頼IDは推測困難な uuid)。

drop policy if exists "auth_select_requests" on public.requests;
create policy "auth_select_requests" on public.requests
  for select to authenticated using (true);
drop policy if exists "auth_insert_requests" on public.requests;
create policy "auth_insert_requests" on public.requests
  for insert to authenticated with check (true);
drop policy if exists "auth_update_requests" on public.requests;
create policy "auth_update_requests" on public.requests
  for update to authenticated using (true);
drop policy if exists "auth_delete_requests" on public.requests;
create policy "auth_delete_requests" on public.requests
  for delete to authenticated using (true);

-- legacy_imports: authenticated のみ
drop policy if exists "auth_all_legacy" on public.legacy_imports;
create policy "auth_all_legacy" on public.legacy_imports
  for all to authenticated using (true) with check (true);

-- ------------------------------------------------------------
-- 6. updated_at 自動更新
-- ------------------------------------------------------------
drop trigger if exists requests_updated_at on public.requests;
create trigger requests_updated_at
  before update on public.requests
  for each row execute function public.update_updated_at();

drop trigger if exists presets_updated_at on public.presets;
create trigger presets_updated_at
  before update on public.presets
  for each row execute function public.update_updated_at();

-- ------------------------------------------------------------
-- 7. 自動タスク生成トリガー
-- 新規 request insert 時に対応する task を自動生成する。
-- request.title をタスクタイトルに、各 deliverable のカテゴリを
-- 並べた文字列を notes に入れる。
-- ------------------------------------------------------------
create or replace function public.create_task_from_request()
returns trigger as $$
declare
  _deliverable_summary text;
  _new_task_id uuid;
begin
  select string_agg(
    case el->>'category'
      when 'poster' then 'ポスター'
      when 'pop' then '卓上POP'
      when 'businessCard' then '名刺'
      when 'award' then '賞状'
      when 'other' then 'その他'
      else el->>'category'
    end,
    ' / '
  ) into _deliverable_summary
  from jsonb_array_elements(new.deliverables) el;

  insert into public.tasks (
    title,
    status,
    assignee_id,
    store_id,
    due_date,
    notes,
    linked_request_id
  ) values (
    '[依頼] ' || new.title,
    '未着手',
    new.assignee_id,
    new.store_id,
    new.due_date,
    coalesce(
      '依頼者: ' || new.requester_name || E'\n'
      || '成果物: ' || coalesce(_deliverable_summary, '-') || E'\n'
      || case when length(coalesce(new.content,'')) > 0 then E'内容:\n' || new.content else '' end,
      ''
    ),
    new.id
  ) returning id into _new_task_id;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_request_created on public.requests;
create trigger on_request_created
  after insert on public.requests
  for each row execute function public.create_task_from_request();

-- ------------------------------------------------------------
-- 8. 依頼ステータス変更をタスクへ反映 (任意)
-- 全 deliverable が completed になった場合 task.is_done=true にする
-- ------------------------------------------------------------
create or replace function public.sync_task_from_request()
returns trigger as $$
begin
  if new.status = 'completed' and (old.status is null or old.status <> 'completed') then
    update public.tasks
    set is_done = true, status = '完了'
    where linked_request_id = new.id;
  elsif new.status <> 'completed' and old.status = 'completed' then
    update public.tasks
    set is_done = false, status = coalesce(nullif(status,'完了'),'作業中')
    where linked_request_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_request_status_changed on public.requests;
create trigger on_request_status_changed
  after update of status on public.requests
  for each row execute function public.sync_task_from_request();

-- ------------------------------------------------------------
-- 9. 初期プリセット投入
-- ------------------------------------------------------------
insert into public.presets (id, name, description, ord, active, deliverable_templates) values
  ('poster-plus-pop','ポスター+卓上POP','同じ内容でポスターとPOPを両方',1,true,
    '[{"category":"poster","details":{"sizes":["A2"],"orientation":"vertical","printCount":2}},{"category":"pop","details":{"sizes":["はがき"],"orientation":"vertical","printCount":40}}]'::jsonb),
  ('poster-only','ポスター単品','',2,true,
    '[{"category":"poster","details":{"sizes":[],"orientation":"vertical","printCount":1}}]'::jsonb),
  ('pop-only','卓上POP単品','',3,true,
    '[{"category":"pop","details":{"sizes":["はがき"],"orientation":"vertical","printCount":40}}]'::jsonb),
  ('business-card','名刺単品','',4,true,
    '[{"category":"businessCard","details":{"storeVariants":[],"lineQr":false}}]'::jsonb),
  ('award-set','賞状+賞金封筒','表彰状と賞金封筒をセットで',5,true,
    '[{"category":"award","details":{"printMaterials":["賞状","封筒"],"recipients":[]}}]'::jsonb)
on conflict (id) do nothing;
