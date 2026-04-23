'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RequestRow } from '@/lib/types';
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  DELIVERABLE_STATUS_COLORS,
  DELIVERABLE_STATUS_LABELS,
  REQUEST_STATUS_LABELS,
} from '@/lib/types';
import { fmtDateFull } from '@/lib/request-utils';

type Role = 'anon' | 'admin' | 'store' | 'personal';

export default function MyRequestsClient() {
  const supabase = createClient();
  const [role, setRole] = useState<Role>('anon');
  const [email, setEmail] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const u = userData.user;
    if (!u) {
      setRole('anon');
      setLoading(false);
      return;
    }
    const userEmail = u.email ?? '';
    setEmail(userEmail);

    const [adminRes, storeRes] = await Promise.all([
      supabase
        .from('allowed_emails')
        .select('email')
        .eq('email', userEmail)
        .maybeSingle(),
      supabase
        .from('store_accounts')
        .select('store_id, display_name, stores(name)')
        .eq('email', userEmail)
        .maybeSingle(),
    ]);

    if (adminRes.data) {
      setRole('admin');
      setLoading(false);
      return;
    }

    if (storeRes.data) {
      setRole('store');
      const stores = (storeRes.data as { stores?: { name: string } | { name: string }[] | null })
        .stores;
      const firstStoreName = Array.isArray(stores) ? stores[0]?.name : stores?.name;
      setStoreName(firstStoreName ?? null);
      // RLS 側で store_accounts 経由の自動絞り込みが効くので全行 select すれば OK
      const { data: rs } = await supabase
        .from('requests')
        .select('*, stores(id,name,color), profiles(id,display_name,color)')
        .order('created_at', { ascending: false });
      setRequests((rs ?? []) as RequestRow[]);
      setLoading(false);
      return;
    }

    // 個人
    setRole('personal');
    const { data: rs } = await supabase
      .from('requests')
      .select('*, stores(id,name,color), profiles(id,display_name,color)')
      .eq('user_id', u.id)
      .order('created_at', { ascending: false });
    setRequests((rs ?? []) as RequestRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/my` },
    });
  };
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-3 py-10 text-center text-sm text-gray-500">
        読み込み中…
      </main>
    );
  }

  // 未ログイン: Googleログイン案内
  if (role === 'anon') {
    return (
      <main className="mx-auto max-w-md px-3 py-10 sm:py-16">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold">依頼状況を確認</h1>
          <p className="mt-2 text-sm text-gray-600">
            過去に送信した依頼の進捗を確認するには、Google アカウントでログインしてください。
          </p>
          <button
            type="button"
            onClick={handleGoogle}
            className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Googleでログイン
          </button>
          <p className="mt-4 text-center text-xs text-gray-500">
            店舗アカウントをお持ちの方は{' '}
            <Link href="/login" className="text-indigo-600 hover:underline">
              こちら
            </Link>
          </p>
          <p className="mt-4 text-center text-xs text-gray-400">
            <Link href="/" className="hover:underline">
              ← トップへ
            </Link>
          </p>
        </div>
      </main>
    );
  }

  // 管理者: /calendar へ誘導
  if (role === 'admin') {
    return (
      <main className="mx-auto max-w-md px-3 py-10 sm:py-16">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
          <p className="text-sm text-gray-700">管理者としてログイン中 ({email})</p>
          <Link
            href="/calendar"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            管理画面へ →
          </Link>
        </div>
      </main>
    );
  }

  const title =
    role === 'store'
      ? `${storeName ?? '店舗'} の依頼一覧`
      : 'あなたの依頼';

  return (
    <main className="mx-auto max-w-3xl px-3 py-5 sm:px-4 sm:py-8">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
          >
            ← トップへ
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
          >
            ログアウト
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        ログイン中: {email}
        {role === 'store' && storeName ? ` (${storeName} アカウント)` : ''}
      </p>

      <div className="mt-6 space-y-3">
        {requests.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
            {role === 'store'
              ? 'この店舗宛ての依頼はまだありません。'
              : 'まだ依頼がありません。'}
          </div>
        )}
        {requests.map((r) => (
          <Link
            key={r.id}
            href={`/request/${r.id}`}
            className="block rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:border-gray-900 hover:shadow sm:p-4"
          >
            <div className="flex items-center gap-2">
              {r.stores && (
                <span
                  className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: `${r.stores.color}20`,
                    color: r.stores.color,
                    borderColor: `${r.stores.color}50`,
                  }}
                >
                  {r.stores.name}
                </span>
              )}
              <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                {REQUEST_STATUS_LABELS[r.status]}
              </span>
              <span className="ml-auto text-xs text-gray-500">
                {fmtDateFull(r.created_at)} 送信
              </span>
            </div>
            <div className="mt-1.5 font-semibold">{r.title}</div>
            <ul className="mt-2 space-y-0.5 text-xs text-gray-600">
              {(r.deliverables ?? []).map((d) => (
                <li key={d.id} className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium ${CATEGORY_COLORS[d.category]}`}
                  >
                    {CATEGORY_LABELS[d.category]}
                  </span>
                  <span
                    className={`ml-auto inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium ${DELIVERABLE_STATUS_COLORS[d.status]}`}
                  >
                    {DELIVERABLE_STATUS_LABELS[d.status]}
                  </span>
                </li>
              ))}
            </ul>
            {r.due_date && (
              <div className="mt-2 text-xs text-gray-500">
                納品希望: {fmtDateFull(r.due_date)}
              </div>
            )}
          </Link>
        ))}
      </div>
    </main>
  );
}
