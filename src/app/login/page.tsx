'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginInner() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  // next パラメータは同一サイト内 (/から始まる) のみ許可してオープンリダイレクトを防ぐ
  const nextPath = nextParam && nextParam.startsWith('/') ? nextParam : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();
      // メール+パスワードの利用者は allowed_emails (管理者) or
      // store_accounts (店舗アカウント) のどちらかに登録されている必要がある
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
          'このメールアドレスは登録されていません。個人で使う場合は下の「Googleでログイン」をお使いください。',
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

      // next が指定されていればそこへ、なければ role で振り分け
      // (管理者 → /calendar、店舗アカウント → /my)
      const dest = nextPath ?? (allowed ? '/calendar' : '/my');
      window.location.href = dest;
    } catch {
      setError('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const next = nextPath ?? '/my';
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (authError) {
        setError(`Googleログインエラー: ${authError.message}`);
        setGoogleLoading(false);
      }
      // 成功時は Google のページへ redirect される
    } catch (e) {
      setError(`Googleログインエラー: ${(e as Error).message}`);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">TSUKURU</h1>
          <p className="mt-1 text-xs text-gray-500">
            制作依頼管理 / ログインして依頼状況を確認
          </p>
        </div>

        {/* 個人 Google ログイン */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {googleLoading ? '処理中...' : 'Googleでログイン (個人の方)'}
        </button>

        <div className="my-5 flex items-center gap-2 text-[11px] text-gray-400">
          <div className="h-px flex-1 bg-gray-200" />
          または
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-gray-500">
            管理者・店舗アカウントはメールとパスワードでログイン
          </p>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
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
          依頼を送るだけなら{' '}
          <a href="/" className="text-indigo-600 hover:underline">
            ログインなし
          </a>{' '}
          でも可能
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <LoginInner />
    </Suspense>
  );
}
