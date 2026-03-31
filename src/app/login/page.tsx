'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'magic' | 'password'>('password');

  const supabase = createClient();

  const handleMagicLink = async () => {
    setError('');
    setLoading(true);

    try {
      const { data: allowed } = await supabase
        .from('allowed_emails')
        .select('email')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (!allowed) {
        setError('このメールアドレスは登録されていません');
        setLoading(false);
        return;
      }

      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        if (authError.message.includes('rate') || authError.message.includes('limit')) {
          setError('メール送信の制限に達しました。しばらく待ってから再試行してください。');
        } else {
          setError(`送信失敗: ${authError.message}`);
        }
        setLoading(false);
        return;
      }

      setSent(true);
    } catch {
      setError('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const { data: allowed } = await supabase
        .from('allowed_emails')
        .select('email')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (!allowed) {
        setError('このメールアドレスは登録されていません');
        setLoading(false);
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login')) {
          setError('パスワードが正しくありません。初回はマジックリンクでログインしてパスワードを設定してください。');
        } else {
          setError(`ログイン失敗: ${authError.message}`);
        }
        setLoading(false);
        return;
      }

      window.location.href = '/calendar';
    } catch {
      setError('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'magic') {
      await handleMagicLink();
    } else {
      await handlePasswordLogin();
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">メールを確認してください</h2>
          <p className="text-gray-600 mb-4">
            <span className="font-medium text-indigo-600">{email}</span> にログインリンクを送信しました。
          </p>
          <p className="text-sm text-gray-500">
            メールが届かない場合は迷惑メールフォルダをご確認ください。
          </p>
          <button
            onClick={() => { setSent(false); setEmail(''); }}
            className="mt-6 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            別のメールアドレスでログイン
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">タスク・スケジュール管理</h1>
          <p className="text-gray-500 mt-1">メールアドレスでログイン</p>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-gray-100 rounded-lg p-0.5 mb-6">
          <button
            type="button"
            onClick={() => setMode('password')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === 'password'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            パスワード
          </button>
          <button
            type="button"
            onClick={() => setMode('magic')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === 'magic'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            マジックリンク
          </button>
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
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
            />
          </div>

          {mode === 'password' && (
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
          )}

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
            {loading
              ? '処理中...'
              : mode === 'password'
              ? 'ログイン'
              : 'ログインリンクを送信'
            }
          </button>
        </form>

        {mode === 'password' && (
          <p className="mt-4 text-center text-xs text-gray-500">
            初回ログインはマジックリンクタブからログインしてください
          </p>
        )}
      </div>
    </div>
  );
}
