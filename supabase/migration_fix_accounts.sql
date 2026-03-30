-- ============================================================
-- Migration: アカウントマッピング修正 + 優先度削除
-- Supabase SQL Editor で実行
-- ============================================================

-- 1. intel705n@gmail.com を allowed_emails に追加
INSERT INTO public.allowed_emails (email)
VALUES ('intel705n@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- 2. 既存プロファイルの修正
-- saya38719@gmail.com → 吉栖（元は中谷だった）
UPDATE public.profiles
SET display_name = '吉栖', color = '#db2777'
WHERE email = 'saya38719@gmail.com';

-- kikuchi@leisurelarce.co.jp → 中谷（元は菊池だった）
UPDATE public.profiles
SET display_name = '中谷', color = '#0891b2'
WHERE email = 'kikuchi@leisurelarce.co.jp';

-- phoenix.nakatani@gmail.com → 中谷（確認）
UPDATE public.profiles
SET display_name = '中谷', color = '#0891b2'
WHERE email = 'phoenix.nakatani@gmail.com';

-- ch8.kid@gmail.com → 菊池（確認）
UPDATE public.profiles
SET display_name = '菊池', color = '#2563eb'
WHERE email = 'ch8.kid@gmail.com';

-- 3. handle_new_user トリガー関数を更新
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  _display_name text;
  _color text;
BEGIN
  CASE
    WHEN new.email = 'ch8.kid@gmail.com' THEN
      _display_name := '菊池';
      _color := '#2563eb';
    WHEN new.email = 'saya38719@gmail.com' THEN
      _display_name := '吉栖';
      _color := '#db2777';
    WHEN new.email IN ('phoenix.nakatani@gmail.com', 'kikuchi@leisurelarce.co.jp') THEN
      _display_name := '中谷';
      _color := '#0891b2';
    WHEN new.email = 'intel705n@gmail.com' THEN
      _display_name := '中谷（オーナー）';
      _color := '#0891b2';
    ELSE
      _display_name := split_part(new.email, '@', 1);
      _color := '#6366f1';
  END CASE;

  INSERT INTO public.profiles (id, email, display_name, color)
  VALUES (new.id, new.email, _display_name, _color);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. tasks テーブルから priority カラムの CHECK 制約を削除（カラム自体は残してもOK、UIで使わない）
-- 制約名を確認して削除
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.tasks'::regclass
    AND conname LIKE '%priority%';
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.tasks DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

-- events テーブルから priority カラムの CHECK 制約を削除
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.events'::regclass
    AND conname LIKE '%priority%';
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.events DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

-- priority カラムにデフォルト値を設定（NULLでも問題ないように）
ALTER TABLE public.tasks ALTER COLUMN priority DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN priority SET DEFAULT NULL;

ALTER TABLE public.events ALTER COLUMN priority DROP NOT NULL;
ALTER TABLE public.events ALTER COLUMN priority SET DEFAULT NULL;
