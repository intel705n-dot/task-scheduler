'use client';

import { useEffect, useState } from 'react';
import type { CalendarEvent, EventPriority, Profile, Store } from '@/lib/types';

const EVENT_PRIORITIES: EventPriority[] = ['通常', '不死！', '蘭○', '他'];

type EventFormData = {
  title: string;
  event_date: string;
  start_time: string;
  end_time: string;
  priority: EventPriority;
  assignee_id: string;
  store_id: string;
  notes: string;
};

type Props = {
  event: CalendarEvent | null;
  defaultDate?: string;
  profiles: Profile[];
  stores: Store[];
  onSave: (data: EventFormData, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onClose: () => void;
};

export default function EventModal({ event, defaultDate, profiles, stores, onSave, onDelete, onClose }: Props) {
  const [form, setForm] = useState<EventFormData>({
    title: '',
    event_date: defaultDate || '',
    start_time: '',
    end_time: '',
    priority: '通常',
    assignee_id: '',
    store_id: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event) {
      setForm({
        title: event.title,
        event_date: event.event_date,
        start_time: event.start_time || '',
        end_time: event.end_time || '',
        priority: event.priority ?? '通常',
        assignee_id: event.assignee_id || '',
        store_id: event.store_id?.toString() || '',
        notes: event.notes || '',
      });
    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form, event?.id);
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
            {event ? '予定編集' : '予定追加'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">タイトル *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日付 *</label>
            <input
              type="date"
              required
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">開始時刻</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">終了時刻</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">優先度</label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as EventPriority })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
            >
              {EVENT_PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
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
                {profiles.map((p) => (
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
            {event && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(event.id)}
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
