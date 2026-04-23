import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthed = Boolean(user);

  // 管理者判定 (リンク先を /calendar か /my で分岐)
  let isAdmin = false;
  if (isAuthed && user?.email) {
    const { data } = await supabase
      .from('allowed_emails')
      .select('email')
      .eq('email', user.email)
      .maybeSingle();
    isAdmin = Boolean(data);
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight sm:text-lg">
              TSUKURU
            </span>
            <span className="hidden text-xs text-gray-500 sm:inline">
              制作依頼フォーム
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {isAuthed ? (
              <>
                {isAdmin ? (
                  <Link
                    href="/calendar"
                    className="inline-flex items-center gap-1 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
                  >
                    管理画面へ →
                  </Link>
                ) : (
                  <Link
                    href="/my"
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    マイページ →
                  </Link>
                )}
              </>
            ) : (
              <Link
                href="/my"
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                依頼状況を確認 / ログイン
              </Link>
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
