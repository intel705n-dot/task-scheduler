'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// LINE / Facebook / Instagram などアプリ内ブラウザでは Google OAuth が
// disallowed_useragent でブロックされる。UA から検出して案内を出す。
function detectInAppBrowser(ua: string): string | null {
  if (/Line\//i.test(ua)) return 'LINE';
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'Facebook';
  if (/Instagram/i.test(ua)) return 'Instagram';
  if (/Twitter/i.test(ua)) return 'X (旧 Twitter)';
  if (/KAKAOTALK/i.test(ua)) return 'KakaoTalk';
  if (/BytedanceWebview|TikTok/i.test(ua)) return 'TikTok';
  // Android 汎用 WebView (; wv が UA に含まれる)
  if (/Android.*;\s*wv\)/.test(ua)) return 'アプリ内ブラウザ';
  return null;
}

function LoginInner() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [inAppBrowser, setInAppBrowser] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const supabase = createClient();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  // next パラメータは同一サイト内 (/から始まる) のみ許可してオープンリダイレクトを防ぐ
  const nextPath = nextParam && nextParam.startsWith('/') ? nextParam : null;

  useEffect(() => {
    setInAppBrowser(detectInAppBrowser(navigator.userAgent));
  }, []);

  const copyUrl = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: prompt
      window.prompt('URLをコピーしてください:', url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();
      // メール+パスワードの利用者は allowed_emails or store_accounts のどちらかに
      // 登録されている必要がある (内部判定用。UI 上は「店舗ログイン」として統一)
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
          'このメールアドレスは登録されていません。個人の方は上の「Googleでログイン」をお使いください。',
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

  const guestHref = nextPath ?? '/select';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">TSUKURU</h1>
          <p className="mt-1 text-xs text-gray-500">
            ログインして依頼状況を確認
          </p>
        </div>

        {inAppBrowser && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="mb-2 flex items-start gap-2">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <p className="font-semibold">
                {inAppBrowser} アプリ内ブラウザでは Google ログインができません
              </p>
            </div>
            <p className="mb-3 text-xs text-amber-800">
              Google のセキュリティポリシー (disallowed_useragent) により、
              {inAppBrowser} のアプリ内ブラウザからは個人 Google ログインをブロックされます。
              下のボタンで URL をコピーして、Safari / Chrome などの通常のブラウザに貼り付けてアクセスしてください。
            </p>
            <button
              type="button"
              onClick={copyUrl}
              className="w-full rounded-md bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-700"
            >
              {copied ? 'コピーしました ✓' : 'このページのURLをコピー'}
            </button>
            <p className="mt-2 text-[11px] text-amber-800">
              店舗ログイン (メール + パスワード) はこのまま使えます。
            </p>
          </div>
        )}

        {/* 個人ログイン (Google) */}
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-semibold text-gray-700">個人ログイン</h2>
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || Boolean(inAppBrowser)}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
            {googleLoading ? '処理中...' : 'Googleでログイン'}
          </button>
        </section>

        <div className="my-5 flex items-center gap-2 text-[11px] text-gray-400">
          <div className="h-px flex-1 bg-gray-200" />
          または
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* 店舗ログイン */}
        <section>
          <h2 className="mb-2 text-xs font-semibold text-gray-700">店舗ログイン</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-gray-500">
              店舗に発行されたメールアドレスとパスワードでログイン
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
        </section>

        {/* ゲスト */}
        <div className="mt-6 text-center">
          <a
            href={guestHref}
            className="text-xs text-gray-500 underline-offset-4 hover:text-gray-700 hover:underline"
          >
            ゲストで依頼を送る (単発のみ / 依頼状況の確認は不可)
          </a>
        </div>
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
