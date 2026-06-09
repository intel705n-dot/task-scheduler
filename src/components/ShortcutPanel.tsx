'use client';

import { useEffect, useState } from 'react';

type Shortcut = {
  id: string;
  name: string;
  url: string;
};

const STORAGE_KEY = 'task-scheduler-shortcuts';

function loadShortcuts(): Shortcut[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveShortcuts(shortcuts: Shortcut[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
}

function normalizeUrl(url: string): string {
  const t = url.trim();
  if (!t) return '';
  return t.startsWith('http') ? t : `https://${t}`;
}

export default function ShortcutPanel() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');

  // 編集モード
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');

  useEffect(() => {
    setShortcuts(loadShortcuts());
  }, []);

  const update = (next: Shortcut[]) => {
    setShortcuts(next);
    saveShortcuts(next);
  };

  const handleAdd = () => {
    if (!newName.trim() || !newUrl.trim()) return;
    const sc: Shortcut = {
      id: Date.now().toString(),
      name: newName.trim(),
      url: normalizeUrl(newUrl),
    };
    update([...shortcuts, sc]);
    setNewName('');
    setNewUrl('');
    setAdding(false);
  };

  const handleDelete = (id: string) => {
    update(shortcuts.filter((s) => s.id !== id));
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= shortcuts.length) return;
    const next = [...shortcuts];
    [next[index], next[target]] = [next[target], next[index]];
    update(next);
  };

  const startEdit = (sc: Shortcut) => {
    setEditingId(sc.id);
    setEditName(sc.name);
    setEditUrl(sc.url);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditUrl('');
  };

  const saveEdit = () => {
    if (!editingId) return;
    const name = editName.trim();
    const url = normalizeUrl(editUrl);
    if (!name || !url) return;
    update(
      shortcuts.map((s) =>
        s.id === editingId ? { ...s, name, url } : s,
      ),
    );
    cancelEdit();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <h3 className="text-xs font-bold text-gray-700">ショートカット</h3>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ＋ 追加
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-white rounded-lg border border-gray-200 p-2 mb-2 space-y-1.5 flex-shrink-0">
          <input
            type="text"
            placeholder="サイト名"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900"
            autoFocus
          />
          <input
            type="text"
            placeholder="URL"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <div className="flex gap-1">
            <button
              onClick={handleAdd}
              className="flex-1 bg-indigo-600 text-white py-1 rounded text-[10px] font-medium hover:bg-indigo-700"
            >
              保存
            </button>
            <button
              onClick={() => { setAdding(false); setNewName(''); setNewUrl(''); }}
              className="flex-1 bg-gray-100 text-gray-600 py-1 rounded text-[10px] font-medium hover:bg-gray-200"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* Shortcut list */}
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {shortcuts.map((sc, i) => {
          const isEditing = editingId === sc.id;
          if (isEditing) {
            return (
              <div
                key={sc.id}
                className="bg-white rounded-lg border border-indigo-300 p-2 space-y-1.5 flex-shrink-0"
              >
                <input
                  type="text"
                  placeholder="サイト名"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="URL"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900"
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                />
                <div className="flex gap-1">
                  <button
                    onClick={saveEdit}
                    className="flex-1 bg-indigo-600 text-white py-1 rounded text-[10px] font-medium hover:bg-indigo-700"
                  >
                    保存
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex-1 bg-gray-100 text-gray-600 py-1 rounded text-[10px] font-medium hover:bg-gray-200"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={sc.id}
              className="bg-white rounded-lg border border-gray-200 px-2 py-1.5 flex items-center gap-1.5 group"
            >
              {/* Reorder buttons */}
              <div className="flex flex-col gap-0 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleMove(i, -1)}
                  disabled={i === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 leading-none"
                  title="上へ移動"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => handleMove(i, 1)}
                  disabled={i === shortcuts.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 leading-none"
                  title="下へ移動"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Link */}
              <a
                href={sc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0"
              >
                <p className="text-xs font-medium text-indigo-700 hover:text-indigo-900 truncate">
                  {sc.name}
                </p>
                <p className="text-[10px] text-gray-400 truncate">{sc.url}</p>
              </a>

              {/* Edit + Delete */}
              <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEdit(sc)}
                  className="text-gray-400 hover:text-indigo-600"
                  title="編集"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(sc.id)}
                  className="text-gray-300 hover:text-red-500"
                  title="削除"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}

        {shortcuts.length === 0 && !adding && (
          <div className="text-center py-4 text-gray-400 text-[10px]">
            ショートカットがありません
          </div>
        )}
      </div>
    </div>
  );
}
