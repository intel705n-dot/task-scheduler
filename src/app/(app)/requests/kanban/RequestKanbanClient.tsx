'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { ImageIcon, Paperclip } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  DELIVERABLE_STATUS_COLORS,
  DELIVERABLE_STATUS_LABELS,
  DELIVERABLE_STATUS_ORDER,
} from '@/lib/types';
import type {
  DeliverableStatus,
  RequestRow,
  RequestStatus,
} from '@/lib/types';
import { fetchAllRequests, patchRequest } from '@/lib/requests';
import { fmtDate } from '@/lib/request-utils';

// カラム配色: 9ステータス全部を横並び。モバイルは横スクロール。
const COLUMN_STYLES: Record<DeliverableStatus, string> = {
  pending: 'bg-gray-50 border-gray-300',
  inProgress: 'bg-orange-50 border-orange-300',
  waitingFinish: 'bg-pink-50 border-pink-300',
  onHold: 'bg-blue-50 border-blue-300',
  waitingReply: 'bg-yellow-50 border-yellow-300',
  waitingData: 'bg-purple-50 border-purple-300',
  waitingReview: 'bg-teal-50 border-teal-300',
  completed: 'bg-emerald-50 border-emerald-300',
  cancelled: 'bg-gray-100 border-gray-400',
};

export default function RequestKanbanClient() {
  const supabase = createClient();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [storeFilter, setStoreFilter] = useState<number | 'all'>('all');
  const [hideDone, setHideDone] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const refresh = useCallback(async () => {
    const r = await fetchAllRequests(supabase);
    setRequests(r);
  }, [supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (storeFilter !== 'all' && r.store_id !== storeFilter) return false;
      if (hideDone && (r.status === 'completed' || r.status === 'cancelled')) return false;
      return true;
    });
  }, [requests, storeFilter, hideDone]);

  const stores = useMemo(() => {
    const map = new Map<number, { id: number; name: string; color: string }>();
    for (const r of requests) if (r.stores) map.set(r.stores.id, r.stores);
    return Array.from(map.values()).sort((a, b) => a.id - b.id);
  }, [requests]);

  const activeRequest = activeId ? requests.find((r) => r.id === activeId) ?? null : null;

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };
  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    const requestId = String(e.active.id);
    const targetCol = String(e.over.id) as DeliverableStatus;
    const req = requests.find((r) => r.id === requestId);
    if (!req || req.status === targetCol) return;

    // 楽観更新
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: targetCol as RequestStatus } : r)),
    );
    try {
      await patchRequest(supabase, requestId, { status: targetCol as RequestStatus });
      // DBトリガーで tasks も更新されるので、同ブラウザ上の他パネルに通知
      window.dispatchEvent(new CustomEvent('tsukuru:tasks-changed'));
    } catch (err) {
      console.error(err);
      refresh();
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
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
          <div className="ml-auto text-xs text-gray-500">
            {filtered.length} 件 · カードをドラッグして状態変更
          </div>
        </div>

        {/* 9カラムを 2/3/5 列のグリッドで並べる。
            モバイル2列×5段 / タブレット3列×3段 / 広いPC5列×2段。
            各カラム内は縦スクロール。 */}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 2xl:grid-cols-5">
          {DELIVERABLE_STATUS_ORDER.map((col) => {
            const items = filtered.filter((r) => r.status === col);
            return (
              <KanbanColumn
                key={col}
                col={col}
                items={items}
                className={COLUMN_STYLES[col]}
              />
            );
          })}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeRequest && (
          <div className="w-60">
            <KanbanCard r={activeRequest} dragging />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  col,
  items,
  className,
}: {
  col: DeliverableStatus;
  items: RequestRow[];
  className: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[180px] flex-col rounded-lg border p-2 transition ${className} ${
        isOver ? 'ring-2 ring-indigo-500' : ''
      }`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-gray-700">
          {DELIVERABLE_STATUS_LABELS[col]}
        </h3>
        <span className="text-xs text-gray-500">{items.length}</span>
      </div>
      {/* カード数が増えたらカラム内を縦スクロール */}
      <div className="flex-1 space-y-2 overflow-y-auto max-h-[420px] pr-0.5">
        {items.length === 0 && (
          <div className="rounded-md border border-dashed border-gray-300 bg-white/60 p-4 text-center text-xs text-gray-400">
            なし
          </div>
        )}
        {items.map((r) => (
          <DraggableKanbanCard key={r.id} r={r} />
        ))}
      </div>
    </div>
  );
}

function DraggableKanbanCard({ r }: { r: RequestRow }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: r.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`${isDragging ? 'opacity-30' : ''} cursor-grab touch-none active:cursor-grabbing`}
    >
      <KanbanCard r={r} />
    </div>
  );
}

function KanbanCard({ r, dragging = false }: { r: RequestRow; dragging?: boolean }) {
  const storeColor = r.stores?.color ?? '#9ca3af';
  const attachments = r.attachments ?? [];
  const imageCount = attachments.filter((a) => (a.mimeType || '').startsWith('image/')).length;

  const content = (
    <>
      <div className="flex items-center gap-1 pr-1">
        <span
          className="inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium"
          style={{ backgroundColor: storeColor + '20', color: storeColor }}
        >
          {r.stores?.name ?? '—'}
        </span>
        {attachments.length > 0 && (
          <span
            className="inline-flex items-center gap-0.5 rounded-full bg-violet-600 px-1.5 py-0 text-[10px] font-bold text-white"
            title={`添付${attachments.length}件${imageCount > 0 ? ` (画像${imageCount})` : ''}`}
          >
            {imageCount > 0 ? (
              <ImageIcon className="h-3 w-3" />
            ) : (
              <Paperclip className="h-3 w-3" />
            )}
            {attachments.length}
          </span>
        )}
        <span
          className={`ml-auto inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium ${DELIVERABLE_STATUS_COLORS[r.status]}`}
        >
          {DELIVERABLE_STATUS_LABELS[r.status]}
        </span>
      </div>
      <div className="mt-1 line-clamp-2 text-xs font-semibold text-gray-900">{r.title}</div>
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
    </>
  );

  const base = 'rounded-md border border-gray-200 bg-white p-2 shadow-sm';
  if (dragging) {
    return <div className={`${base} rotate-2 shadow-xl`}>{content}</div>;
  }
  return (
    <div className={`${base} hover:border-indigo-400 hover:shadow-md`}>
      {content}
      <Link
        href={`/requests/${r.id}`}
        className="mt-1 block text-[10px] text-indigo-600 underline-offset-2 hover:underline"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        詳細を開く →
      </Link>
    </div>
  );
}
