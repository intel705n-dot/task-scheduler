'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { RequestRow } from '@/lib/types';
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  DELIVERABLE_STATUS_COLORS,
  DELIVERABLE_STATUS_LABELS,
  REQUEST_STATUS_LABELS,
} from '@/lib/types';
import { fetchAllRequests } from '@/lib/requests';
import { fmtDate, fmtDateFull } from '@/lib/request-utils';

const STATUS_BADGE = DELIVERABLE_STATUS_COLORS;

export default function RequestPanel() {
  const supabase = createClient();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'done'>('active');
  const [search, setSearch] = useState('');

  const refresh = useCallback(async () => {
    try {
      const r = await fetchAllRequests(supabase);
      setRequests(r);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return requests.filter((r) => {
      const done = r.status === 'completed' || r.status === 'cancelled';
      if (tab === 'active' && done) return false;
      if (tab === 'done' && !done) return false;
      if (!kw) return true;
      const hay = [
        r.title,
        r.content,
        r.requester_name,
        r.stores?.name,
        ...(r.deliverables ?? []).map((d) => CATEGORY_LABELS[d.category]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(kw);
    });
  }, [requests, tab, search]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">依頼</h2>
        <Link
          href="/"
          target="_blank"
          className="text-[11px] text-gray-500 hover:text-gray-900 hover:underline"
          title="新しいタブで公開フォームを開く"
        >
          公開フォーム →
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-2 flex gap-1 rounded-lg bg-gray-100 p-0.5 text-xs">
        <button
          onClick={() => setTab('active')}
          className={`flex-1 rounded px-2 py-1 font-medium transition ${
            tab === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
          }`}
        >
          現行 ({requests.filter((r) => r.status !== 'completed' && r.status !== 'cancelled').length})
        </button>
        <button
          onClick={() => setTab('done')}
          className={`flex-1 rounded px-2 py-1 font-medium transition ${
            tab === 'done' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
          }`}
        >
          済 ({requests.filter((r) => r.status === 'completed' || r.status === 'cancelled').length})
        </button>
      </div>

      {/* Search */}
      <input
        type="search"
        placeholder="検索"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-2 w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />

      {/* List */}
      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {loading && <div className="text-xs text-gray-500">読み込み中…</div>}
        {!loading && filtered.length === 0 && (
          <div className="py-8 text-center text-xs text-gray-400">依頼がありません</div>
        )}
        {filtered.map((r) => (
          <Link
            key={r.id}
            href={`/requests/${r.id}`}
            className="block rounded-md border border-gray-200 bg-white p-2 shadow-sm transition hover:border-gray-900 hover:shadow-md"
          >
            <div className="flex items-center gap-1">
              {r.stores && (
                <span
                  className="inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium"
                  style={{
                    backgroundColor: `${r.stores.color}20`,
                    color: r.stores.color,
                  }}
                >
                  {r.stores.name}
                </span>
              )}
              {r.priority && r.priority !== 'normal' && (
                <span
                  className={`inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium ${
                    r.priority === 'urgent'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {r.priority === 'urgent' ? '緊急' : '優先'}
                </span>
              )}
              <span
                className={`ml-auto inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium ${STATUS_BADGE[r.status]}`}
              >
                {REQUEST_STATUS_LABELS[r.status]}
              </span>
            </div>
            <div className="mt-1 line-clamp-2 text-xs font-semibold text-gray-900">{r.title}</div>
            <div className="mt-0.5 text-[10px] text-gray-500">
              {r.requester_name}
              {r.due_date ? ` / 〜${fmtDate(r.due_date)}` : ''}
            </div>
            <div className="mt-1 flex flex-wrap gap-0.5">
              {(r.deliverables ?? []).slice(0, 4).map((d) => (
                <span
                  key={d.id}
                  className={`inline-flex items-center rounded-full border px-1 py-0 text-[9px] ${CATEGORY_COLORS[d.category]}`}
                  title={`${CATEGORY_LABELS[d.category]} · ${DELIVERABLE_STATUS_LABELS[d.status]}`}
                >
                  {CATEGORY_LABELS[d.category]}
                  {' '}
                  <span className={`ml-0.5 rounded px-0.5 ${DELIVERABLE_STATUS_COLORS[d.status].replace('border-', '')}`}>
                    {DELIVERABLE_STATUS_LABELS[d.status].slice(0, 2)}
                  </span>
                </span>
              ))}
              {(r.deliverables ?? []).length > 4 && (
                <span className="text-[9px] text-gray-400">+{r.deliverables.length - 4}</span>
              )}
            </div>
            <div className="mt-1 text-[9px] text-gray-400">
              {fmtDateFull(r.created_at)} 送信
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
