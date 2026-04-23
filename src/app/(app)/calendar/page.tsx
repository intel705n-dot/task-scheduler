'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { CalendarEvent, Profile, RequestRow, Store } from '@/lib/types';
import EventModal from '@/components/EventModal';

const WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function formatTime(time: string | null) {
  if (!time) return null;
  // "HH:MM:SS" or "HH:MM" → "HH:MM"
  return time.slice(0, 5);
}

export default function CalendarPage() {
  const supabase = createClient();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const fetchData = useCallback(async () => {
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDay = getDaysInMonth(year, month);
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

    const [eventsRes, requestsRes, profilesRes, storesRes] = await Promise.all([
      supabase
        .from('events')
        .select('*, profiles(*), stores(*)')
        .gte('event_date', startDate)
        .lte('event_date', endDate)
        .order('start_time', { ascending: true }),
      // 依頼の納期もカレンダーに出す。月内に入る due_date だけ引いてくる。
      supabase
        .from('requests')
        .select('*, stores(*), profiles(*)')
        .gte('due_date', startDate)
        .lte('due_date', endDate)
        .neq('status', 'cancelled'),
      supabase.from('profiles').select('*'),
      supabase.from('stores').select('*'),
    ]);
    if (eventsRes.data) setEvents(eventsRes.data);
    if (requestsRes.data) setRequests(requestsRes.data as RequestRow[]);
    if (profilesRes.data) setProfiles(profilesRes.data);
    if (storesRes.data) setStores(storesRes.data);
    setLoading(false);
  }, [supabase, year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrevMonth = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  };

  const handleSave = async (
    data: {
      title: string;
      event_date: string;
      start_time: string;
      end_time: string;
      assignee_id: string;
      store_id: string;
      notes: string;
    },
    id?: string
  ) => {
    const payload = {
      title: data.title,
      event_date: data.event_date,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      assignee_id: data.assignee_id || null,
      store_id: data.store_id ? parseInt(data.store_id) : null,
      notes: data.notes || null,
    };

    if (id) {
      await supabase.from('events').update(payload).eq('id', id);
    } else {
      await supabase.from('events').insert(payload);
    }
    setModalOpen(false);
    setEditingEvent(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('events').delete().eq('id', id);
    setModalOpen(false);
    setEditingEvent(null);
    fetchData();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Build calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-gray-900">
          {year}年{month + 1}月
        </h2>
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {WEEKDAY_LABELS.map((label, i) => (
            <div
              key={label}
              className={`py-2 text-center text-xs font-medium ${
                i === 5 ? 'text-blue-600' : i === 6 ? 'text-red-600' : 'text-gray-500'
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="min-h-[80px] sm:min-h-[100px] border-b border-r border-gray-100 bg-gray-50" />;
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = events.filter((e) => e.event_date === dateStr);
            const dayRequests = requests.filter((r) => r.due_date === dateStr);
            const dayOfWeek = (firstDay + day - 1) % 7;
            const isToday = dateStr === todayStr;

            return (
              <div
                key={dateStr}
                className={`min-h-[80px] sm:min-h-[100px] border-b border-r border-gray-100 p-1 cursor-pointer hover:bg-gray-50 transition-colors ${
                  isToday ? 'bg-indigo-50/50' : ''
                }`}
                onClick={() => {
                  setSelectedDate(dateStr);
                  setEditingEvent(null);
                  setModalOpen(true);
                }}
              >
                <div className={`text-xs font-medium mb-0.5 ${
                  isToday
                    ? 'bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                    : dayOfWeek === 5
                    ? 'text-blue-600'
                    : dayOfWeek === 6
                    ? 'text-red-600'
                    : 'text-gray-700'
                }`}>
                  {day}
                </div>
                <div className="space-y-0.5">
                  {/* 依頼の納期バッジ (クリックで案件詳細へ) */}
                  {dayRequests.map((req) => {
                    const storeColor = req.stores?.color || '#6b7280';
                    return (
                      <Link
                        key={`req-${req.id}`}
                        href={`/requests/${req.id}`}
                        className="block rounded border border-dashed px-1 py-0.5 text-[10px] hover:brightness-95"
                        style={{
                          backgroundColor: storeColor + '14',
                          borderColor: storeColor + '70',
                        }}
                        onClick={(e) => e.stopPropagation()}
                        title={`依頼納期: ${req.title}`}
                      >
                        <span
                          className="mr-0.5 inline-block rounded px-1 py-0 text-[9px] font-bold text-white"
                          style={{ backgroundColor: storeColor }}
                        >
                          📄依頼
                        </span>
                        {req.priority !== 'normal' && (
                          <span
                            className={`mr-0.5 inline-block rounded px-1 py-0 text-[9px] font-bold ${
                              req.priority === 'urgent'
                                ? 'bg-red-600 text-white'
                                : 'bg-amber-500 text-white'
                            }`}
                          >
                            {req.priority === 'urgent' ? '緊急' : '優先'}
                          </span>
                        )}
                        <span className="break-words text-gray-900">{req.title}</span>
                      </Link>
                    );
                  })}

                  {dayEvents.map((evt) => {
                    const timeStr = formatTime(evt.start_time);
                    const assigneeColor = evt.profiles?.color || '#9ca3af';
                    return (
                      <div
                        key={evt.id}
                        className="text-[10px] sm:text-xs px-1 py-0.5 rounded border-l-[3px] cursor-pointer hover:brightness-95 transition-all"
                        style={{
                          backgroundColor: assigneeColor + '18',
                          borderColor: assigneeColor,
                          borderTopWidth: '1px',
                          borderRightWidth: '1px',
                          borderBottomWidth: '1px',
                          borderTopColor: assigneeColor + '40',
                          borderRightColor: assigneeColor + '40',
                          borderBottomColor: assigneeColor + '40',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEvent(evt);
                          setSelectedDate('');
                          setModalOpen(true);
                        }}
                      >
                        {/* 担当者 */}
                        {evt.profiles && (
                          <span
                            className="inline-block px-1 py-0 rounded text-[10px] font-bold text-white mr-0.5"
                            style={{ backgroundColor: evt.profiles.color }}
                          >
                            {evt.profiles.display_name}
                          </span>
                        )}
                        {/* 店舗 */}
                        {evt.stores && (
                          <span
                            className="inline-block px-1 py-0 rounded text-[10px] font-bold text-white mr-0.5"
                            style={{ backgroundColor: evt.stores.color }}
                          >
                            {evt.stores.name}
                          </span>
                        )}
                        {/* 時間 */}
                        {timeStr && (
                          <span className="text-[10px] font-medium text-gray-500 mr-0.5">
                            {timeStr}
                          </span>
                        )}
                        {/* タイトル（省略せず全文表示） */}
                        <span className="text-[10px] sm:text-xs font-medium text-gray-900 break-words whitespace-normal">
                          {evt.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <EventModal
          event={editingEvent}
          defaultDate={selectedDate}
          profiles={profiles}
          stores={stores}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => {
            setModalOpen(false);
            setEditingEvent(null);
          }}
        />
      )}
    </div>
  );
}
