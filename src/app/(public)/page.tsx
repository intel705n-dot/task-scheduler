import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthed = Boolean(user);

  // ログイン済みなら「ログインして依頼」は直接 /select へ、未ログインなら /login?next=/select
  const loginCtaHref = isAuthed ? '/select' : '/login?next=/select';

  return (
    <main className="mx-auto max-w-xl px-4 py-10 sm:py-20">
      <section className="mb-8 text-center sm:mb-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          制作依頼フォーム
        </h1>
        <p className="mt-3 text-sm text-gray-600 sm:text-base">
          ポスター・POP・名刺・賞状などの制作を依頼できます。
        </p>
      </section>

      {/* メイン CTA: ログインして依頼 */}
      <Link
        href={loginCtaHref}
        className="group block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-indigo-600 hover:shadow-md sm:p-7"
      >
        <div className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700">
          おすすめ
        </div>
        <h2 className="mt-3 text-lg font-bold sm:text-xl">
          ログインして依頼
        </h2>
        <p className="mt-2 text-xs text-gray-600 sm:text-sm">
          依頼状況を常に確認できます。過去の依頼や進行中の依頼を一覧で管理。
        </p>
        <div className="mt-5 flex items-center justify-end gap-1 text-sm font-medium text-indigo-700 transition group-hover:translate-x-0.5">
          <span>進む</span>
          <span>→</span>
        </div>
      </Link>

      {/* サブ CTA: ログインせずに依頼 (小さく目立たなく) */}
      <div className="mt-6 text-center">
        <Link
          href="/select"
          className="text-xs text-gray-500 underline-offset-4 hover:text-gray-700 hover:underline"
        >
          ログインせずに依頼する (単発のみ / 依頼状況の確認は不可)
        </Link>
      </div>
    </main>
  );
}
