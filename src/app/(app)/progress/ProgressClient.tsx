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
import { ImageIcon, Paperclip, ClipboardList } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  DELIVERABLE_STATUS_COLORS,
  DELIVERABLE_STATUS_LABELS,
  DELIVERABLE_STATUS_ORDER,
  TASK_STATUSES,
} from '@/lib/types';
import type {
  DeliverableStatus,
  Profile,
  RequestRow,
  RequestStatus,
  Store,
  Task,
  TaskStatus,
} from '@/lib/types';
import { fetchAllRequests, patchRequest } from '@/lib/requests';
import { fmtDate } from '@/lib/request-utils';

// task ↔ request ステータス双方向マップ
const TASK_TO_DELIVERABLE: Record<TaskStatus, DeliverableStatus> = {
  未着手: 'pending',
  作業中: 'inProgress',
  仕上がり待ち: 'waitingFinish',
  保留: 'onHold',
  返答待ち: 'waitingReply',
  データ待ち: 'waitingData',
  確認待ち: 'waitingReview',
  完了: 'completed',
};

// 日本語ラベル → TaskStatus の逆引き (DELIVERABLE_STATUS_LABELS と同じ)
const DELIVERABLE_TO_TASK: Partial<Record<DeliverableStatus, TaskStatus>> = {
  pending: '未着手',
  inProgress: '作業中',
  waitingFinish: '仕上がり待ち',
  onHold: '保留',
  waitingReply: '返答待ち',
  waitingData: 'データ待ち',
  waitingReview: '確認待ち',
  completed: '完了',
  // cancelled は task に対応無し → カード移動不可
};

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

type UnifiedItem =
  | { kind: 'task'; id: string; task: Task; status: DeliverableStatus }
  | { kind: 'request'; id: string; request: RequestRow; status: DeliverableStatus };

// ドラッグ ID は kind も含めて区別する
const itemDragId = (i: UnifiedItem) => `${i.kind}:${i.id}`;
const parseDragId = (id: string): { kind: 'task' | 'request'; id: string } => {
  const [kind, ...rest] = id.split(':');
  return { kind: kind as 'task' | 'request', id: rest.join(':') };
};

export default function ProgressClient() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  const [storeFilter, setStoreFilter] = useState<number | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string | 'all' | 'unassigned'>('all');
  const [hideDone, setHideDone] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'task' | 'request'>('all');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const refresh = useCallback(async () => {
    const [tRes, rRes, pRes, sRes, aRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('*, profiles(*), stores(*), linked_request:requests!linked_request_id(id,title,attachments)')
        .order('created_at', { ascending: false }),
      fetchAllRequests(supabase),
      supabase.from('profiles').select('*'),
      supabase.from('stores').select('*').order('ord').order('id'),
      supabase.from('allowed_emails').select('email'),
    ]);
    if (tRes.data) setTasks(tRes.data as Task[]);
    setRequests(rRes);
    if (pRes.data) {
      // 管理者 (allowed_emails) のみ担当者候補に
      const adminEmails = new Set(
        (aRes.data ?? []).map((r: { email: string }) => r.email),
      );
      setProfiles(
        (pRes.data as Profile[]).filter((p) => adminEmails.has(p.email)),
      );
    }
    if (sRes.data) setStores(sRes.data as Store[]);
  }, [supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Supabase Realtime: tasks/requests の変更を全画面で拾う
  useEffect(() => {
    const channel = supabase
      .channel('progress-kanban')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => refresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refresh]);

  // 同ブラウザ内の他パネル (TaskPanel など) での変更も反映
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('tsukuru:tasks-changed', handler);
    return () => window.removeEventListener('tsukuru:tasks-changed', handler);
  }, [refresh]);

  // 担当者候補に中谷（オーナー）/菊池（サブ）は隠す (tasks 側と揃える)
  const hiddenProfiles = ['中谷（オーナー）', '菊池（サブ）'];
  const ASSIGNEE_ORDER = ['中谷', '吉栖', '菊池'];
  const visibleProfiles = useMemo(
    () =>
      profiles
        .filter((p) => !hiddenProfiles.includes(p.display_name))
        .sort((a, b) => {
          const ai = ASSIGNEE_ORDER.indexOf(a.display_name);
          const bi = ASSIGNEE_ORDER.indexOf(b.display_name);
          return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
        }),
    [profiles],
  );

  // UnifiedItem 化
  const items: UnifiedItem[] = useMemo(() => {
    const taskItems = tasks
      .filter((t) => !t.is_done || t.status === '完了') // is_done は完了扱い
      .map<UnifiedItem>((t) => ({
        kind: 'task',
        id: t.id,
        task: t,
        status: TASK_TO_DELIVERABLE[t.status] ?? 'pending',
      }));
    const reqItems = requests.map<UnifiedItem>((r) => ({
      kind: 'request',
      id: r.id,
      request: r,
      status: r.status,
    }));
    return [...taskItems, ...reqItems];
  }, [tasks, requests]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (typeFilter !== 'all' && i.kind !== typeFilter) return false;
      if (hideDone && (i.status === 'completed' || i.status === 'cancelled')) return false;
      if (storeFilter !== 'all') {
        const sid = i.kind === 'task' ? i.task.store_id : i.request.store_id;
        if (sid !== storeFilter) return false;
      }
      if (assigneeFilter !== 'all') {
        const aid = i.kind === 'task' ? i.task.assignee_id : i.request.assignee_id;
        if (assigneeFilter === 'unassigned') {
          if (aid) return false;
        } else {
          if (aid !== assigneeFilter) return false;
        }
      }
      return true;
    });
  }, [items, typeFilter, hideDone, storeFilter, assigneeFilter]);

  const activeItem = activeId
    ? items.find((i) => itemDragId(i) === activeId) ?? null
    : null;

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    const targetCol = String(e.over.id) as DeliverableStatus;
    const { kind, id } = parseDragId(String(e.active.id));

    if (kind === 'task') {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      const currentStatus = TASK_TO_DELIVERABLE[task.status];
      if (currentStatus === targetCol) return;

      const newTaskStatus = DELIVERABLE_TO_TASK[targetCol];
      if (!newTaskStatus) {
        // cancelled 列へは tasks は動かせない
        return;
      }

      // 楽観更新
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, status: newTaskStatus, is_done: newTaskStatus === '完了' }
            : t,
        ),
      );

      const { error } = await supabase
        .from('tasks')
        .update({
          status: newTaskStatus,
          is_done: newTaskStatus === '完了',
        })
        .eq('id', id);
      if (error) {
        console.error(error);
        refresh();
      } else {
        window.dispatchEvent(new CustomEvent('tsukuru:tasks-changed'));
      }
    } else {
      const req = requests.find((r) => r.id === id);
      if (!req || req.status === targetCol) return;

      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: targetCol as RequestStatus } : r)),
      );
      try {
        await patchRequest(supabase, id, { status: targetCol as RequestStatus });
        window.dispatchEvent(new CustomEvent('tsukuru:tasks-changed'));
      } catch (err) {
        console.error(err);
        refresh();
      }
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">進捗管理</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            タスクと依頼を 1 つの画面で進捗管理。ドラッグで状態変更。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Type filter: all / task / request */}
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-300 text-xs">
            {([
              ['all', '全て'],
              ['task', 'タスクのみ'],
              ['request', '依頼のみ'],
            ] as const).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setTypeFilter(v)}
                className={`px-2.5 py-1 transition-colors ${
                  typeFilter === v
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Store filter */}
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

          {/* Assignee filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="all">全担当者</option>
            <option value="unassigned">未振り分け</option>
            {visibleProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name}
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
            {filtered.length} 件
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 2xl:grid-cols-5">
          {DELIVERABLE_STATUS_ORDER.map((col) => {
            const colItems = filtered.filter((i) => i.status === col);
            return (
              <KanbanColumn
                key={col}
                col={col}
                items={colItems}
                className={COLUMN_STYLES[col]}
              />
            );
          })}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeItem && (
          <div className="w-60">
            <KanbanCard item={activeItem} dragging />
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
  items: UnifiedItem[];
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
      <div className="flex-1 space-y-2 overflow-y-auto max-h-[420px] pr-0.5">
        {items.length === 0 && (
          <div className="rounded-md border border-dashed border-gray-300 bg-white/60 p-4 text-center text-xs text-gray-400">
            なし
          </div>
        )}
        {items.map((i) => (
          <DraggableKanbanCard key={itemDragId(i)} item={i} />
        ))}
      </div>
    </div>
  );
}

function DraggableKanbanCard({ item }: { item: UnifiedItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: itemDragId(item),
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`${isDragging ? 'opacity-30' : ''} cursor-grab touch-none active:cursor-grabbing`}
    >
      <KanbanCard item={item} />
    </div>
  );
}

function KanbanCard({ item, dragging = false }: { item: UnifiedItem; dragging?: boolean }) {
  const base = 'rounded-md border bg-white p-2 shadow-sm';
  if (item.kind === 'task') {
    return (
      <TaskCard task={item.task} status={item.status} base={base} dragging={dragging} />
    );
  }
  return (
    <RequestCard r={item.request} status={item.status} base={base} dragging={dragging} />
  );
}

function TaskCard({
  task,
  status,
  base,
  dragging,
}: {
  task: Task;
  status: DeliverableStatus;
  base: string;
  dragging: boolean;
}) {
  const storeColor = task.stores?.color ?? '#9ca3af';
  const profileColor = task.profiles?.color ?? '#6b7280';
  const linkedAttachments = task.linked_request?.attachments ?? [];
  const imageCount = linkedAttachments.filter((a) =>
    (a.mimeType || '').startsWith('image/'),
  ).length;

  const content = (
    <>
      <div className="flex items-center gap-1 pr-1">
        <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-600 px-1.5 py-0 text-[10px] font-bold text-white">
          <ClipboardList className="h-3 w-3" />
          タスク
        </span>
        {task.stores && (
          <span
            className="inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium"
            style={{ backgroundColor: storeColor + '20', color: storeColor }}
          >
            {task.stores.name}
          </span>
        )}
        <span
          className={`ml-auto inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium ${DELIVERABLE_STATUS_COLORS[status]}`}
        >
          {DELIVERABLE_STATUS_LABELS[status]}
        </span>
      </div>
      <div className="mt-1 line-clamp-2 text-xs font-semibold text-gray-900">
        {task.title}
      </div>
      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-500">
        {task.profiles && (
          <span
            className="inline-flex items-center rounded px-1 py-0 text-[10px] font-medium text-white"
            style={{ backgroundColor: profileColor }}
          >
            {task.profiles.display_name}
          </span>
        )}
        {task.due_date && <span>〜{fmtDate(task.due_date)}</span>}
        {linkedAttachments.length > 0 && (
          <span className="ml-auto inline-flex items-center gap-0.5 rounded-full bg-violet-600 px-1 py-0 text-[9px] font-bold text-white">
            {imageCount > 0 ? (
              <ImageIcon className="h-2.5 w-2.5" />
            ) : (
              <Paperclip className="h-2.5 w-2.5" />
            )}
            {linkedAttachments.length}
          </span>
        )}
      </div>
    </>
  );
  if (dragging) {
    return (
      <div className={`${base} rotate-2 border-indigo-300 shadow-xl`}>{content}</div>
    );
  }
  return (
    <div className={`${base} border-indigo-200 hover:border-indigo-400 hover:shadow-md`}>
      {content}
    </div>
  );
}

function RequestCard({
  r,
  status,
  base,
  dragging,
}: {
  r: RequestRow;
  status: DeliverableStatus;
  base: string;
  dragging: boolean;
}) {
  const storeColor = r.stores?.color ?? '#9ca3af';
  const attachments = r.attachments ?? [];
  const imageCount = attachments.filter((a) =>
    (a.mimeType || '').startsWith('image/'),
  ).length;
  const content = (
    <>
      <div className="flex items-center gap-1 pr-1">
        <span className="inline-flex items-center rounded-full bg-red-600 px-1.5 py-0 text-[10px] font-bold text-white">
          依頼
        </span>
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
          className={`ml-auto inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium ${DELIVERABLE_STATUS_COLORS[status]}`}
        >
          {DELIVERABLE_STATUS_LABELS[status]}
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
  if (dragging) {
    return <div className={`${base} rotate-2 border-red-300 shadow-xl`}>{content}</div>;
  }
  return (
    <div className={`${base} border-red-200 hover:border-red-400 hover:shadow-md`}>
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

// Unused import compile stopgap
void TASK_STATUSES;
