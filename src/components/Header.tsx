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

  return (
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
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
