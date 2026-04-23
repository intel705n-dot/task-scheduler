'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';

type Props = {
  mobileView: 'tasks' | 'calendar';
  onMobileViewChange: (view: 'tasks' | 'calendar') => void;
};

export default function Header({ mobileView, onMobileViewChange }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!adminMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) {
        setAdminMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [adminMenuOpen]);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
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

  const handleChangePassword = async () => {
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
      setPasswordMsg('パスワードを変更しました');
      setNewPassword('');
      setTimeout(() => setPasswordMsg(''), 2000);
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

            {/* Desktop title + nav */}
            <div className="hidden lg:flex items-center gap-6">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span className="font-bold text-gray-900">TSUKURU</span>
              </div>
              <nav className="flex items-center gap-1">
                <NavLink href="/calendar" current={pathname}>カレンダー</NavLink>
                <div className="relative" ref={adminMenuRef}>
                  <button
                    onClick={() => setAdminMenuOpen((v) => !v)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      pathname?.startsWith('/presets') || pathname?.startsWith('/stores') || pathname?.startsWith('/import')
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    管理 ▾
                  </button>
                  {adminMenuOpen && (
                    <div className="absolute left-0 top-full z-30 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                      <AdminMenuLink href="/presets" onClick={() => setAdminMenuOpen(false)}>
                        プリセット
                      </AdminMenuLink>
                      <AdminMenuLink href="/stores" onClick={() => setAdminMenuOpen(false)}>
                        店舗マスタ
                      </AdminMenuLink>
                      <AdminMenuLink href="/import" onClick={() => setAdminMenuOpen(false)}>
                        データ移行
                      </AdminMenuLink>
                    </div>
                  )}
                </div>
              </nav>
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
                onClick={() => setShowModal(true)}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                title="アカウント設定"
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

      {/* Account Settings Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-5">アカウント設定</h3>

            {/* 担当者名 */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">担当者名</label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-lg">
                {profile && (
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: profile.color }}
                  />
                )}
                <span className="text-sm font-medium text-gray-900">
                  {profile?.display_name || '-'}
                </span>
              </div>
            </div>

            {/* メールアドレス */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-500 mb-1">メールアドレス</label>
              <div className="px-3 py-2.5 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-900">{userEmail || '-'}</span>
              </div>
            </div>

            {/* パスワード変更 */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-500 mb-1">パスワード変更</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="新しいパスワード（6文字以上）"
                  className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
                  onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                />
                <button
                  onClick={handleChangePassword}
                  disabled={passwordLoading}
                  className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex-shrink-0"
                >
                  {passwordLoading ? '...' : '変更'}
                </button>
              </div>
              {passwordMsg && (
                <p className={`text-xs mt-1.5 ${passwordMsg.includes('エラー') ? 'text-red-600' : 'text-green-600'}`}>
                  {passwordMsg}
                </p>
              )}
            </div>

            <button
              onClick={() => { setShowModal(false); setNewPassword(''); setPasswordMsg(''); }}
              className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function NavLink({
  href,
  current,
  children,
}: {
  href: string;
  current: string | null;
  children: React.ReactNode;
}) {
  const active = current === href || (href !== '/' && current?.startsWith(href));
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-indigo-50 text-indigo-700'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  );
}

function AdminMenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
    >
      {children}
    </Link>
  );
}
