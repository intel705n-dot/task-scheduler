'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';

type Props = {
  mobileView: 'tasks' | 'calendar';
  onMobileViewChange: (view: 'tasks' | 'calendar') => void;
};

export default function Header({ mobileView, onMobileViewChange }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (data) setProfile(data);
      }
    };
    fetchProfile();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleSetPassword = async () => {
    if (newPassword.length < 6) {
      setPasswordMsg('パスワードは6文字以上にしてください');
      return;
    }
    setPasswordLoading(true);
    setPasswordMsg('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordMsg(`エラー: ${error.message}`);
    } else {
      setPasswordMsg('パスワードを設定しました');
      setTimeout(() => {
        setShowPasswordModal(false);
        setNewPassword('');
        setPasswordMsg('');
      }, 1500);
    }
    setPasswordLoading(false);
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4">
          <div className="flex items-center justify-between h-14">
            {/* Mobile toggle */}
            <nav className="flex gap-1 lg:hidden">
              <button
                onClick={() => onMobileViewChange('tasks')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  mobileView === 'tasks'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                タスク
              </button>
              <button
                onClick={() => onMobileViewChange('calendar')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  mobileView === 'calendar'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                カレンダー
              </button>
            </nav>

            {/* Desktop title */}
            <div className="hidden lg:flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span className="font-bold text-gray-900">タスク・スケジュール管理</span>
            </div>

            <div className="flex items-center gap-3">
              {profile && (
                <span
                  className="text-sm font-medium px-2 py-1 rounded"
                  style={{ backgroundColor: profile.color + '20', color: profile.color }}
                >
                  {profile.display_name}
                </span>
              )}
              <button
                onClick={() => setShowPasswordModal(true)}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                title="パスワード設定"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Password Setting Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">パスワード設定</h3>
            <p className="text-sm text-gray-500 mb-4">
              パスワードを設定すると、次回からメールリンク不要でログインできます。
            </p>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新しいパスワード（6文字以上）"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 mb-3"
              onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()}
            />
            {passwordMsg && (
              <p className={`text-sm mb-3 ${passwordMsg.includes('エラー') ? 'text-red-600' : 'text-green-600'}`}>
                {passwordMsg}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSetPassword}
                disabled={passwordLoading}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {passwordLoading ? '設定中...' : '設定'}
              </button>
              <button
                onClick={() => { setShowPasswordModal(false); setNewPassword(''); setPasswordMsg(''); }}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
