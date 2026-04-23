'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  DELIVERABLE_STATUS_COLORS,
  DELIVERABLE_STATUS_LABELS,
  REQUEST_STATUS_LABELS,
} from '@/lib/types';
import type {
  DeliverableStatus,
  RequestRow,
} from '@/lib/types';
import { bulkUpdateRequestStatus, fetchAllRequests } from '@/lib/requests';
import { fmtDate } from '@/lib/request-utils';

const COLUMNS: { id: DeliverableStatus; label: string; tone: string }[] = [
  { id: 'pending', label: '未着手', tone: 'bg-gray-50 border-gray-300' },
  { id: 'inProgress', label: '進行中', tone: 'bg-sky-50 border-sky-300' },
  { id: 'reviewing', label: '確認中', tone: 'bg-amber-50 border-amber-300' },
  { id: 'completed', label: '完了', tone: 'bg-emerald-50 border-emerald-300' },
];

// 案件 (request) 全体のステータスは 4 段階 (pending/inProgress/completed/cancelled) だが、
// カンバンでは「確認中」カラムを追加で表示したいので deliverable ステータスを元に判定する。
function matchColumn(r: RequestRow, col: DeliverableStatus): boolean {
  if (col === 'completed') return r.status === 'completed';
  if (col === 'cancelled') return r.status === 'cancelled';
  if (col === 'reviewing') {
    return (
      r.status === 'inProgress' &&
      r.deliverables.some((d) => d.status === 'reviewing')
    );
  }
  if (col === 'inProgress') {
    return (
      r.status === 'inProgress' &&
      !r.deliverables.some((d) => d.status === 'reviewing')
    );
  }
  if (col === 'pending') return r.status === 'pending';
  return false;
}

export default function RequestKanbanClient() {
  const supabase = createClient();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [actor, setActor] = useState('unknown');
  const [storeFilter, setStoreFilter] = useState<number | 'all'>('all');
  const [hideDone, setHideDone] = useState(false);

  const refresh = useCallback(async () => {
    const r = await fetchAllRequests(supabase);
    setRequests(r);
  }, [supabase]);

  useEffect(() => {
    refresh();
    supabase.auth.getUser().then(({ data }) => {
      setActor(data.user?.email ?? 'unknown');
    });
  }, [supabase, refresh]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (storeFilter !== 'all' && r.store_id !== storeFilter) return false;
      if (hideDone && (r.status === 'completed' || r.status === 'cancelled')) return false;
      return true;
    });
  }, [requests, storeFilter, hideDone]);

  const stores = useMemo(() => {
    const map = new Map<number, { id: number; name: string; color: string }>();
    for (const r of requests) {
      if (r.stores) map.set(r.stores.id, r.stores);
    }
    return Array.from(map.values()).sort((a, b) => a.id - b.id);
  }, [requests]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">依頼カンバン</h1>
        <select
          value={storeFilter}
          onChange={(e) =>
            setStoreFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
          }
          className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
        >
          <option value="all">全店舗</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-1 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(e) => setHideDone(e.target.checked)}
          />
          完了/取消を隠す
        </label>
        <div className="ml-auto text-xs text-gray-500">{filtered.length} 件</div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = filtered.filter((r) => matchColumn(r, col.id));
          return (
            <div
              key={col.id}
              className={`rounded-lg border p-2 ${col.tone}`}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
                <span className="text-xs text-gray-500">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.length === 0 && (
                  <div className="rounded-md border border-dashed border-gray-300 bg-white/50 p-4 text-center text-xs text-gray-400">
                    なし
                  </div>
                )}
                {items.map((r) => (
                  <KanbanCard
                    key={r.id}
                    r={r}
                    onStatusChange={async (next) => {
                      await bulkUpdateRequestStatus(supabase, r.id, next, actor);
                      refresh();
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STATUS_OPTIONS: DeliverableStatus[] = [
  'pending',
  'inProgress',
  'reviewing',
  'completed',
  'cancelled',
];

function KanbanCard({
  r,
  onStatusChange,
}: {
  r: RequestRow;
  onStatusChange: (s: DeliverableStatus) => void | Promise<void>;
}) {
  const storeColor = r.stores?.color ?? '#9ca3af';

  // 案件全体のステータス代表値: 成果物の支配的な状態
  const dominant: DeliverableStatus = (() => {
    const active = r.deliverables.filter((d) => d.status !== 'cancelled');
    if (active.length === 0) return 'cancelled';
    if (active.every((d) => d.status === 'completed')) return 'completed';
    if (active.some((d) => d.status === 'reviewing')) return 'reviewing';
    if (active.some((d) => d.status === 'inProgress')) return 'inProgress';
    return 'pending';
  })();

  return (
    <div className="rounded-md border border-gray-200 bg-white p-2 shadow-sm">
      <div className="flex items-center gap-1.5 pr-1">
        <span
          className="inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium"
          style={{ backgroundColor: storeColor + '20', color: storeColor }}
        >
          {r.stores?.name ?? '—'}
        </span>
        {r.priority !== 'normal' && (
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
        <div className="ml-auto">
          <select
            value={dominant}
            onChange={(e) => {
              e.stopPropagation();
              onStatusChange(e.target.value as DeliverableStatus);
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className={`cursor-pointer rounded-full border px-1.5 py-0 text-[10px] font-medium ${DELIVERABLE_STATUS_COLORS[dominant]}`}
            aria-label="ステータス変更"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {DELIVERABLE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Link
        href={`/requests/${r.id}`}
        className="mt-1 block"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="line-clamp-2 text-xs font-semibold text-gray-900">{r.title}</div>
        <div className="mt-0.5 text-[10px] text-gray-500">
          {r.requester_name}
          {r.due_date ? ` / 〜${fmtDate(r.due_date)}` : ''}
        </div>
        <div className="mt-1 flex flex-wrap gap-0.5">
          {r.deliverables.slice(0, 3).map((d) => (
            <span
              key={d.id}
              className={`inline-flex items-center rounded-full border px-1 py-0 text-[9px] ${CATEGORY_COLORS[d.category]}`}
              title={`${CATEGORY_LABELS[d.category]} · ${DELIVERABLE_STATUS_LABELS[d.status]}`}
            >
              {CATEGORY_LABELS[d.category]}
            </span>
          ))}
          {r.deliverables.length > 3 && (
            <span className="text-[9px] text-gray-400">+{r.deliverables.length - 3}</span>
          )}
        </div>
        <div className="mt-1 text-[9px] text-gray-400">
          全体: {REQUEST_STATUS_LABELS[r.status]}
        </div>
      </Link>
    </div>
  );
}
