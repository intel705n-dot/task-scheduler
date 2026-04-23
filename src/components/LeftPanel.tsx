'use client';

import { useState } from 'react';
import TaskPanel from './TaskPanel';
import RequestPanel from './RequestPanel';

export default function LeftPanel() {
  const [tab, setTab] = useState<'tasks' | 'requests'>('tasks');

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex gap-1 rounded-lg bg-white p-0.5 text-sm shadow-sm ring-1 ring-gray-200">
        <button
          onClick={() => setTab('tasks')}
          className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${
            tab === 'tasks'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          タスク
        </button>
        <button
          onClick={() => setTab('requests')}
          className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${
            tab === 'requests'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          依頼
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'tasks' ? <TaskPanel /> : <RequestPanel />}
      </div>
    </div>
  );
}
