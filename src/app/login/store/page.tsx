'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function StoreLoginInner() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const nextPath = nextParam && nextParam.startsWith('/') ? nextParam : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();
      // 店舗または管理者として登録されているメールのみ通す
      const [{ data: allowed }, { data: storeAccount }] = await Promise.all([
        supabase
          .from('allowed_emails')
          .select('email')
          .eq('email', normalizedEmail)
          .maybeSingle(),
        supabase
          .from('store_accounts')
          .select('email')
          .eq('email', normalizedEmail)
          .maybeSingle(),
      ]);

      if (!allowed && !storeAccount) {
        setError(
          'このメールアドレスは登録されていません。個人の方は「個人ログイン」をお使いください。',
        );
        setLoading(false);
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login')) {
          setError('メールアドレスまたはパスワードが正しくありません');
        } else {
          setError(`ログイン失敗: ${authError.message}`);
        }
        setLoading(false);
        return;
      }

      const dest = nextPath ?? (allowed ? '/calendar' : '/my');
      window.location.href = dest;
    } catch {
      setError('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const backHref = nextPath
    ? `/login?next=${encodeURIComponent(nextPath)}`
    : '/login';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">店舗ログイン</h1>
          <p className="mt-1 text-xs text-gray-500">
            店舗に発行されたメールアドレスとパスワードでログイン
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="store@example.com"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '処理中...' : 'ログイン'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500">
          <Link href={backHref} className="text-indigo-600 hover:underline">
            ← 個人ログインに戻る
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function StoreLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <StoreLoginInner />
    </Suspense>
  );
}
