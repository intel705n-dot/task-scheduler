'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Task, TaskStatus, Profile, Store } from '@/lib/types';
import { TASK_STATUSES } from '@/lib/types';

type TaskFormData = {
  title: string;
  status: TaskStatus;
  assignee_id: string;
  store_id: string;
  due_date: string;
  notes: string;
};

type Props = {
  task: Task | null;
  profiles: Profile[];
  stores: Store[];
  onSave: (data: TaskFormData, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onClose: () => void;
};

export default function TaskModal({ task, profiles, stores, onSave, onDelete, onClose }: Props) {
  const [form, setForm] = useState<TaskFormData>({
    title: '',
    status: '未着手',
    assignee_id: '',
    store_id: '',
    due_date: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        status: task.status,
        assignee_id: task.assignee_id || '',
        store_id: task.store_id?.toString() || '',
        due_date: task.due_date || '',
        notes: task.notes || '',
      });
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form, task?.id);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-xl rounded-t-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">
            {task ? 'タスク編集' : 'タスク追加'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 依頼由来タスクの場合: リンク + 添付プレビュー */}
        {task?.linked_request && (
          <div className="border-b border-amber-200 bg-amber-50 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  📄 依頼
                </span>
                <span
                  className="truncate font-semibold text-gray-900"
                  title={task.linked_request.title}
                >
                  {task.linked_request.title}
                </span>
              </div>
              <Link
                href={`/requests/${task.linked_request.id}`}
                className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                onClick={onClose}
              >
                依頼詳細 →
              </Link>
            </div>
            {(task.linked_request.attachments ?? []).length > 0 ? (
              <div>
                <div className="mb-1.5 text-xs font-medium text-gray-600">
                  添付 ({task.linked_request.attachments.length}件) — 画像はクリックで拡大
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {task.linked_request.attachments.map((a, i) => {
                    const isImage = (a.mimeType || '').startsWith('image/');
                    const previewUrl = a.downloadUrl.replace(/([?&])dl=1/, '$1dl=0');
                    return (
                      <a
                        key={i}
                        href={previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-md border border-gray-200 bg-white transition hover:border-indigo-400 hover:shadow"
                        title={a.name}
                      >
                        {isImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewUrl}
                            alt={a.name}
                            className="h-16 w-full object-cover sm:h-20"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-16 w-full items-center justify-center text-[10px] text-gray-400 sm:h-20">
                            {a.mimeType || 'ファイル'}
                          </div>
                        )}
                        <div className="truncate border-t border-gray-100 px-1 py-0.5 text-[10px] text-gray-600">
                          {a.name}
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500">添付ファイルはありません</div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">タスク名 *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">担当者</label>
              <select
                value={form.assignee_id}
                onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
              >
                <option value="">未割当</option>
                {profiles
                  .filter((p) => !['中谷（オーナー）', '菊池（サブ）'].includes(p.display_name))
                  .map((p) => (
                  <option key={p.id} value={p.id}>{p.display_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">店舗</label>
              <select
                value={form.store_id}
                onChange={(e) => setForm({ ...form, store_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
              >
                <option value="">なし</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">期限</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-gray-900"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? '保存中...' : '保存'}
            </button>
            {task && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(task.id)}
                className="px-4 py-2.5 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
              >
                削除
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
