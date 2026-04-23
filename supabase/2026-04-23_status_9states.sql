-- requests / deliverables のステータスを tasks と揃えて 9 値にする。
-- キーは英語 (DB 内部) のまま、UI ラベルで日本語化する方針。
-- 2026-04-23

-- ------------------------------------------------------------
-- 1. 既存 reviewing → waitingReview へ名称変更
-- ------------------------------------------------------------
update public.requests set status = 'waitingReview' where status = 'reviewing';

-- deliverables JSONB 配列内も置換
update public.requests
set deliverables = coalesce((
  select jsonb_agg(
    jsonb_set(
      el,
      '{status}',
      to_jsonb(case el->>'status'
        when 'reviewing' then 'waitingReview'
        else coalesce(el->>'status','pending')
      end)
    )
  )
  from jsonb_array_elements(deliverables) el
), '[]'::jsonb)
where jsonb_array_length(deliverables) > 0;

-- ------------------------------------------------------------
-- 2. CHECK 制約を9値に張り替え
-- ------------------------------------------------------------
alter table public.requests drop constraint if exists requests_status_check;
alter table public.requests add constraint requests_status_check
  check (status in (
    'pending','inProgress','waitingFinish','onHold',
    'waitingReply','waitingData','waitingReview',
    'completed','cancelled'
  ));

-- ------------------------------------------------------------
-- 3. request→task 同期トリガーを9値対応に更新
-- ------------------------------------------------------------
create or replace function public.sync_task_from_request()
returns trigger as $$
begin
  -- 依頼が取消されたら紐付きタスクも「完了」扱いにして非表示化
  if new.status = 'cancelled' then
    update public.tasks
    set
      is_done = true,
      status = '完了',
      notes = coalesce(notes,'') || E'\n[依頼が取消されました]'
    where linked_request_id = new.id;
    return new;
  end if;

  update public.tasks
  set
    status = case new.status
      when 'pending' then '未着手'
      when 'inProgress' then '作業中'
      when 'waitingFinish' then '仕上がり待ち'
      when 'onHold' then '保留'
      when 'waitingReply' then '返答待ち'
      when 'waitingData' then 'データ待ち'
      when 'waitingReview' then '確認待ち'
      when 'completed' then '完了'
      else '未着手'
    end,
    is_done = (new.status = 'completed')
  where linked_request_id = new.id;

  return new;
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------
-- 4. task→request 同期トリガー (新規) ← 双方向同期
-- タスクを編集したら対応する依頼のステータスも追従する。
-- ------------------------------------------------------------
create or replace function public.sync_request_from_task()
returns trigger as $$
declare
  _en text;
begin
  if new.linked_request_id is null then
    return new;
  end if;
  _en := case new.status
    when '未着手' then 'pending'
    when '作業中' then 'inProgress'
    when '仕上がり待ち' then 'waitingFinish'
    when '保留' then 'onHold'
    when '返答待ち' then 'waitingReply'
    when 'データ待ち' then 'waitingData'
    when '確認待ち' then 'waitingReview'
    when '完了' then 'completed'
    else 'pending'
  end;
  update public.requests
  set status = _en,
      completed_at = case when _en = 'completed' then coalesce(completed_at, now()) else null end
  where id = new.linked_request_id
    and status <> _en;  -- 無限ループ防止
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_task_status_changed on public.tasks;
create trigger on_task_status_changed
  after update of status on public.tasks
  for each row execute function public.sync_request_from_task();
