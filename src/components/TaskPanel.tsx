'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Task, Profile, Store, TaskStatus } from '@/lib/types';
import { TASK_STATUSES, STATUS_COLORS } from '@/lib/types';
import TaskModal from '@/components/TaskModal';
import * as XLSX from 'xlsx';

type SortKey = 'created' | 'status' | 'assignee' | 'store' | 'due_date' | 'title';
type SortDir = 'asc' | 'desc';

const STATUS_ORDER: Record<string, number> = {
  '作業中': 0,
  '未着手': 1,
  '仕上がり待ち': 2,
  'データ待ち': 3,
  '返答待ち': 4,
  '確認待ち': 5,
  '保留': 6,
  '完了': 7,
};

export default function TaskPanel() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab: 'active' or 'done'
  const [tab, setTab] = useState<'active' | 'done'>('active');

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('created');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const fetchData = useCallback(async () => {
    const [tasksRes, profilesRes, storesRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('*, profiles(*), stores(*)')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
      supabase.from('stores').select('*'),
    ]);
    if (tasksRes.data) setTasks(tasksRes.data);
    if (profilesRes.data) setProfiles(profilesRes.data);
    if (storesRes.data) setStores(storesRes.data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleDone = async (task: Task) => {
    const newDone = !task.is_done;
    await supabase
      .from('tasks')
      .update({
        is_done: newDone,
        status: newDone ? '完了' : '未着手',
      })
      .eq('id', task.id);
    fetchData();
  };

  const handleSave = async (
    data: {
      title: string;
      status: TaskStatus;
      assignee_id: string;
      store_id: string;
      due_date: string;
      notes: string;
    },
    id?: string
  ) => {
    const payload = {
      title: data.title,
      status: data.status,
      assignee_id: data.assignee_id || null,
      store_id: data.store_id ? parseInt(data.store_id) : null,
      due_date: data.due_date || null,
      notes: data.notes || null,
      is_done: data.status === '完了',
    };

    if (id) {
      await supabase.from('tasks').update(payload).eq('id', id);
    } else {
      await supabase.from('tasks').insert(payload);
    }
    setModalOpen(false);
    setEditingTask(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    setModalOpen(false);
    setEditingTask(null);
    fetchData();
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Split by tab
  const tabTasks = tasks.filter((t) => (tab === 'active' ? !t.is_done : t.is_done));

  // Apply filters
  const filtered = tabTasks.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterAssignee !== 'all' && t.assignee_id !== filterAssignee) return false;
    return true;
  });

  // Apply sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'status':
          return ((STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)) * dir;
        case 'assignee': {
          const aName = a.profiles?.display_name || 'zzz';
          const bName = b.profiles?.display_name || 'zzz';
          return aName.localeCompare(bName, 'ja') * dir;
        }
        case 'store': {
          const aStore = a.stores?.name || 'zzz';
          const bStore = b.stores?.name || 'zzz';
          return aStore.localeCompare(bStore, 'ja') * dir;
        }
        case 'due_date': {
          const aDate = a.due_date || '9999-12-31';
          const bDate = b.due_date || '9999-12-31';
          return aDate.localeCompare(bDate) * dir;
        }
        case 'title':
          return a.title.localeCompare(b.title, 'ja') * dir;
        case 'created':
        default:
          return a.created_at.localeCompare(b.created_at) * dir;
      }
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  // Summary: active tasks per assignee (hide 中谷（オーナー） and 菊池（サブ）)
  const hiddenProfiles = ['中谷（オーナー）', '菊池（サブ）'];
  const assigneeSummary = profiles
    .filter((p) => !hiddenProfiles.includes(p.display_name))
    .map((p) => ({
      ...p,
      count: tasks.filter((t) => t.assignee_id === p.id && !t.is_done).length,
    }));

  const handleExportExcel = () => {
    const rows = sorted.map((t) => ({
      'タイトル': t.title,
      'ステータス': t.status,
      '担当者': t.profiles?.display_name || '',
      '店舗': t.stores?.name || '',
      '期限': t.due_date || '',
      'メモ': t.notes || '',
      '作成日': t.created_at.slice(0, 10),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    // 列幅を設定
    ws['!cols'] = [
      { wch: 30 }, { wch: 12 }, { wch: 10 },
      { wch: 15 }, { wch: 12 }, { wch: 30 }, { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'タスク一覧');
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `タスク一覧_${date}.xlsx`);
  };

  const SortButton = ({ label, value }: { label: string; value: SortKey }) => (
    <button
      onClick={() => handleSort(value)}
      className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
        sortKey === value
          ? 'bg-indigo-100 text-indigo-700 font-bold'
          : 'text-gray-500 hover:bg-gray-100'
      }`}
    >
      {label}
      {sortKey === value && (sortDir === 'asc' ? ' ↑' : ' ↓')}
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Summary Widget */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 flex-shrink-0">
        {assigneeSummary.map((a) => {
          const isSelected = filterAssignee === a.id;
          return (
            <button
              key={a.id}
              onClick={() => setFilterAssignee(isSelected ? 'all' : a.id)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border whitespace-nowrap text-xs transition-colors ${
                isSelected
                  ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: a.color }}
              />
              <span className="font-medium text-gray-700">{a.display_name}</span>
              <span className="font-bold text-indigo-600">{a.count}</span>
            </button>
          );
        })}
      </div>

      {/* Tab: 現行 / 済 */}
      <div className="flex bg-gray-100 rounded-lg p-0.5 mb-3 flex-shrink-0">
        <button
          onClick={() => setTab('active')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
            tab === 'active'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          現行 ({tasks.filter((t) => !t.is_done).length})
        </button>
        <button
          onClick={() => setTab('done')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
            tab === 'done'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          済 ({tasks.filter((t) => t.is_done).length})
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-1.5 mb-2 flex-shrink-0">
        <input
          type="text"
          placeholder="検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
        />
        <div className="flex gap-1.5">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
          >
            <option value="all">全ステータス</option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
          >
            <option value="all">全担当者</option>
            {profiles
              .filter((p) => !hiddenProfiles.includes(p.display_name))
              .map((p) => (
              <option key={p.id} value={p.id}>{p.display_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sort buttons */}
      <div className="flex flex-wrap gap-1 mb-2 flex-shrink-0">
        <SortButton label="作成日" value="created" />
        <SortButton label="ステータス" value="status" />
        <SortButton label="担当者" value="assignee" />
        <SortButton label="店舗" value="store" />
        <SortButton label="期限" value="due_date" />
        <SortButton label="タイトル" value="title" />
      </div>

      {/* Task List - scrollable */}
      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
        {sorted.map((task) => (
          <div
            key={task.id}
            className={`bg-white rounded-lg border border-gray-200 p-2.5 flex items-start gap-2 transition-colors ${task.is_done ? 'opacity-60' : ''}`}
          >
            <input
              type="checkbox"
              checked={task.is_done}
              onChange={() => handleToggleDone(task)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1 mb-0.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${STATUS_COLORS[task.status]}`}>
                  {task.status}
                </span>
                {task.profiles && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-white"
                    style={{ backgroundColor: task.profiles.color }}
                  >
                    {task.profiles.display_name}
                  </span>
                )}
                {task.stores && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-white"
                    style={{ backgroundColor: task.stores.color }}
                  >
                    {task.stores.name}
                  </span>
                )}
              </div>
              <p className={`text-xs font-medium text-gray-900 leading-tight ${task.is_done ? 'line-through' : ''}`}>
                {task.title}
              </p>
              {task.due_date && (
                <p className="text-[10px] text-gray-400 mt-0.5">期限: {task.due_date}</p>
              )}
            </div>
            <button
              onClick={() => {
                setEditingTask(task);
                setModalOpen(true);
              }}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        ))}

        {sorted.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-xs">
            タスクがありません
          </div>
        )}
      </div>

      {/* Add Button + Excel Export */}
      <div className="mt-2 flex gap-1.5 flex-shrink-0">
        <button
          onClick={() => {
            setEditingTask(null);
            setModalOpen(true);
          }}
          className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
        >
          ＋ タスク追加
        </button>
        <button
          onClick={handleExportExcel}
          className="px-3 py-2 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
          title="表示中のタスクをExcel出力"
        >
          Excel
        </button>
      </div>

      {/* Modal */}
      {modalOpen && (
        <TaskModal
          task={editingTask}
          profiles={profiles}
          stores={stores}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => {
            setModalOpen(false);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}
