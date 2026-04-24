import { createClient, SupabaseClient } from '@supabase/supabase-js';

// service_role key を使う管理用クライアント。
// RLS を bypass するので絶対にサーバー側 (API route) 以外では import しないこと。
// DB 型定義が未生成なので any を返してテーブル操作を許可する。
let cached: SupabaseClient | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAdminClient(): SupabaseClient<any, 'public', any> {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY',
    );
  }
  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
