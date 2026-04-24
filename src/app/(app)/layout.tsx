'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import LeftPanel from '@/components/LeftPanel';
import ShortcutPanel from '@/components/ShortcutPanel';
import PageSwitchArrows from '@/components/PageSwitchArrows';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileView, setMobileView] = useState<'tasks' | 'calendar'>('calendar');

  return (
    <>
      <Header mobileView={mobileView} onMobileViewChange={setMobileView} />
      <div className="flex h-[calc(100vh-56px)]">
        {/* Left: Task Panel - always visible on desktop, toggle on mobile */}
        <aside
          className={`w-full lg:w-80 lg:flex-shrink-0 border-r border-gray-200 bg-gray-50 p-3 overflow-hidden flex flex-col ${
            mobileView === 'tasks' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <LeftPanel />
        </aside>

        {/* Center: Shortcut Panel */}
        <aside
          className={`hidden lg:flex lg:w-48 lg:flex-shrink-0 border-r border-gray-200 bg-gray-50/50 p-3 overflow-hidden flex-col`}
        >
          <ShortcutPanel />
        </aside>

        {/* Right: Main content (Calendar) */}
        <main
          className={`flex-1 overflow-y-auto p-4 ${
            mobileView === 'calendar' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="max-w-5xl mx-auto">{children}</div>
        </main>
      </div>
      <PageSwitchArrows />
    </>
  );
}
