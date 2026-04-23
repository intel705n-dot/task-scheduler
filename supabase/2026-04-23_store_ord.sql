-- 店舗マスタに並び順カラムを追加し、業務優先順に並び替える。
-- 2026-04-23
alter table public.stores add column if not exists ord int not null default 99;

update public.stores set ord = case name
  when '蘭○' then 1
  when '不死鳥' then 2
  when '風雲' then 3
  when '本社' then 4
  when '東レ' then 5
  when 'その他' then 6
  else 99
end;
