import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Next.js 14 style: cookies() is synchronous here.
// TSUKURU 合併後はこちらを `createClient` という名前でも使う (エイリアス export)。
export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component cannot set cookies
          }
        },
      },
    }
  );
}

// New code uses createClient(); keep existing callers working too.
export const createClient = createServerSupabaseClient;
