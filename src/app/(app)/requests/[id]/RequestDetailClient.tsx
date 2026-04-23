'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type {
  Deliverable,
  DeliverableCategory,
  DeliverableStatus,
  Profile,
  RequestPriority,
  RequestRow,
  Store,
  StatusHistoryEntry,
} from '@/lib/types';
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  DELIVERABLE_STATUS_COLORS,
  DELIVERABLE_STATUS_LABELS,
  REQUEST_STATUS_LABELS,
} from '@/lib/types';
import { createDeliverable, fmtDateFull, fmtDateTime } from '@/lib/request-utils';
import {
  appendDeliverable,
  bulkUpdateRequestStatus,
  deleteRequest,
  fetchRequest,
  patchRequest,
  removeDeliverable,
  updateDeliverable,
  updateDeliverableStatus,
} from '@/lib/requests';
import DeliverableCard from '@/components/deliverables/DeliverableCard';

const STATUS_TRANSITIONS: { to: DeliverableStatus; label: string; tone: string }[] = [
  { to: 'pending', label: '未着手', tone: 'text-gray-600' },
  { to: 'inProgress', label: '作業中', tone: 'text-orange-700' },
  { to: 'waitingFinish', label: '仕上がり待ち', tone: 'text-pink-700' },
  { to: 'onHold', label: '保留', tone: 'text-blue-700' },
  { to: 'waitingReply', label: '返答待ち', tone: 'text-yellow-700' },
  { to: 'waitingData', label: 'データ待ち', tone: 'text-purple-700' },
  { to: 'waitingReview', label: '確認待ち', tone: 'text-teal-700' },
  { to: 'completed', label: '完了', tone: 'text-emerald-700' },
  { to: 'cancelled', label: '取消', tone: 'text-gray-500' },
];

export default function RequestDetailClient({ requestId }: { requestId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [r, setR] = useState<RequestRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [actor, setActor] = useState('unknown');
  const [stores, setStores] = useState<Store[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editing, setEditing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const row = await fetchRequest(supabase, requestId);
      setR(row);
    } finally {
      setLoading(false);
    }
  }, [supabase, requestId]);

  useEffect(() => {
    refresh();
    (async () => {
      const [user, ss, ps] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('stores').select('*').order('ord').order('id'),
        supabase.from('profiles').select('*'),
      ]);
      setActor(user.data.user?.email ?? 'unknown');
      if (ss.data) setStores(ss.data as Store[]);
      if (ps.data) setProfiles(ps.data as Profile[]);
    })();
  }, [supabase, refresh]);

  const [form, setForm] = useState<{
    title: string;
    content: string;
    usagePeriod: string;
    dueDate: string;
    assigneeId: string;
    priority: RequestPriority;
  } | null>(null);

  useEffect(() => {
    if (!r) return;
    setForm({
      title: r.title,
      content: r.content,
      usagePeriod: r.usage_period ?? '',
      dueDate: r.due_date ?? '',
      assigneeId: r.assignee_id ?? '',
      priority: r.priority,
    });
  }, [r]);

  const saveBasics = async () => {
    if (!r || !form) return;
    await patchRequest(supabase, r.id, {
      title: form.title,
      content: form.content,
      usagePeriod: form.usagePeriod || null,
      dueDate: form.dueDate || null,
      assigneeId: form.assigneeId || null,
      priority: form.priority,
    });
    setEditing(false);
    refresh();
  };

  const bulkTransition = async (s: DeliverableStatus) => {
    if (!r) return;
    setBulkBusy(true);
    try {
      await bulkUpdateRequestStatus(supabase, r.id, s, actor);
      await refresh();
    } finally {
      setBulkBusy(false);
    }
  };

  const addDeliverable = async (category: DeliverableCategory) => {
    if (!r) return;
    await appendDeliverable(supabase, r.id, createDeliverable(category));
    setShowAdd(false);
    refresh();
  };

  const confirmDelete = async () => {
    if (!r) return;
    if (!confirm(`「${r.title}」を削除しますか?この操作は取り消せません。`)) return;
    await deleteRequest(supabase, r.id);
    router.push('/calendar');
  };

  const timeline: Array<StatusHistoryEntry & { deliverableLabel: string }> = useMemo(() => {
    if (!r) return [];
    const items = (r.deliverables ?? []).flatMap((d) =>
      (d.statusHistory ?? []).map((h) => ({
        ...h,
        deliverableLabel: CATEGORY_LABELS[d.category],
      })),
    );
    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [r]);

  if (loading) return <div className="text-sm text-gray-500">読み込み中…</div>;
  if (!r) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-gray-500">案件が見つかりません</p>
        <Link href="/calendar" className="mt-4 inline-block text-sm underline">
          カレンダーに戻る
        </Link>
      </div>
    );
  }

  const storeColor = r.stores?.color ?? '#9ca3af';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/calendar"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
        >
          ← カレンダーに戻る
        </Link>
        <button
          type="button"
          onClick={confirmDelete}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-red-600 hover:bg-red-50"
        >
          案件削除
        </button>
      </div>

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start gap-2">
          {r.stores && (
            <span
              className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `${storeColor}20`,
                color: storeColor,
                borderColor: `${storeColor}50`,
              }}
            >
              {r.stores.name}
            </span>
          )}
          <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            {REQUEST_STATUS_LABELS[r.status]}
          </span>
          {r.priority !== 'normal' && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                r.priority === 'urgent'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {r.priority === 'urgent' ? '緊急' : '優先'}
            </span>
          )}
          <div className="w-full text-[11px] text-gray-500 sm:ml-auto sm:w-auto sm:text-xs">
            作成: {fmtDateFull(r.created_at)} / 更新: {fmtDateFull(r.updated_at)}
          </div>
        </div>

        {editing && form ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">タイトル</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">内容</label>
              <textarea
                className="min-h-[96px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">使用期間</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={form.usagePeriod}
                  onChange={(e) => setForm({ ...form, usagePeriod: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">納期</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">担当</label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={form.assigneeId}
                  onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                >
                  <option value="">未割当</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.display_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">優先度</label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value as RequestPriority })
                  }
                >
                  <option value="normal">通常</option>
                  <option value="high">優先</option>
                  <option value="urgent">緊急</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveBasics}
                className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                保存
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <h1 className="text-xl font-bold">{r.title}</h1>
            <p className="whitespace-pre-wrap text-sm text-gray-700">{r.content}</p>
            <div className="grid gap-2 text-xs text-gray-600 grid-cols-2 sm:grid-cols-4">
              <div>
                <span className="text-gray-400">依頼者:</span> {r.requester_name}
              </div>
              <div>
                <span className="text-gray-400">使用期間:</span> {r.usage_period || '—'}
              </div>
              <div>
                <span className="text-gray-400">納期:</span> {fmtDateFull(r.due_date)}
              </div>
              <div>
                <span className="text-gray-400">担当:</span>{' '}
                {r.profiles?.display_name ?? '未割当'}
              </div>
            </div>
            {(r.reference_urls ?? []).length > 0 && (
              <div className="text-xs text-gray-600">
                <span className="text-gray-400">参考URL:</span>
                <ul className="mt-1 space-y-0.5">
                  {r.reference_urls.map((u, i) => (
                    <li key={i}>
                      <a
                        href={u}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-700 underline-offset-4 hover:underline"
                      >
                        {u}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                基本情報を編集
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Attachments */}
      {(r.attachments ?? []).length > 0 && (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold">添付ファイル ({r.attachments.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {r.attachments.map((a, i) => {
              const isImage = (a.mimeType || '').startsWith('image/');
              const previewUrl = a.downloadUrl.replace(/([?&])dl=1/, '$1dl=0');
              const size =
                a.sizeBytes >= 1024 * 1024
                  ? `${(a.sizeBytes / 1024 / 1024).toFixed(1)} MB`
                  : `${Math.max(1, Math.round(a.sizeBytes / 1024))} KB`;
              return (
                <div key={i} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block bg-gray-50"
                  >
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl}
                        alt={a.name}
                        className="h-32 w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-32 items-center justify-center text-xs text-gray-400">
                        {a.mimeType || 'ファイル'}
                      </div>
                    )}
                  </a>
                  <div className="space-y-1 border-t border-gray-100 p-2">
                    <div className="truncate text-xs font-medium" title={a.name}>
                      {a.name}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span>{size}</span>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-gray-900"
                        >
                          プレビュー
                        </a>
                        <a href={a.downloadUrl} className="hover:text-gray-900">
                          DL
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Deliverables */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <h2 className="text-lg font-bold">成果物 ({r.deliverables.length})</h2>
          <div className="sm:ml-auto">
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-xs text-gray-500">一括:</span>
              {STATUS_TRANSITIONS.map((t) => (
                <button
                  key={t.to}
                  type="button"
                  disabled={bulkBusy}
                  onClick={() => bulkTransition(t.to)}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium hover:bg-gray-100 ${t.tone}`}
                >
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.label.slice(0, 2)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {r.deliverables.map((d, idx) => (
            <EditableDeliverable
              key={d.id}
              idx={idx}
              d={d}
              stores={stores}
              actor={actor}
              requestId={r.id}
              onChanged={refresh}
            />
          ))}

          <div className="relative">
            <button
              type="button"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => setShowAdd((v) => !v)}
            >
              + 成果物を追加
            </button>
            {showAdd && (
              <div className="absolute left-1/2 z-10 mt-2 w-64 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                {(Object.keys(CATEGORY_LABELS) as DeliverableCategory[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => addDeliverable(c)}
                    className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-100"
                  >
                    {CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History */}
      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold">履歴</h2>
        {timeline.length === 0 ? (
          <p className="text-sm text-gray-500">履歴はまだありません。</p>
        ) : (
          <ul className="space-y-2">
            {timeline.map((h, i) => (
              <li key={i} className="text-sm">
                <div>
                  <span className="font-medium">{h.deliverableLabel}</span>{' '}
                  <span className="text-gray-500">
                    {h.from
                      ? `${DELIVERABLE_STATUS_LABELS[h.from as DeliverableStatus] ?? h.from} → `
                      : ''}
                    {DELIVERABLE_STATUS_LABELS[h.to as DeliverableStatus] ?? h.to}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {h.by} · {fmtDateTime(h.at)}
                  {h.note && ` · ${h.note}`}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EditableDeliverable({
  d,
  idx,
  stores,
  actor,
  requestId,
  onChanged,
}: {
  d: Deliverable;
  idx: number;
  stores: Store[];
  actor: string;
  requestId: string;
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  const change = async (next: DeliverableStatus) => {
    await updateDeliverableStatus(supabase, requestId, d.id, next, actor);
    onChanged();
  };

  const doRemove = async () => {
    if (!confirm('この成果物を削除しますか?')) return;
    await removeDeliverable(supabase, requestId, d.id);
    onChanged();
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="space-y-2 p-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[d.category]}`}
          >
            #{idx + 1} {CATEGORY_LABELS[d.category]}
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${DELIVERABLE_STATUS_COLORS[d.status]}`}
          >
            {DELIVERABLE_STATUS_LABELS[d.status]}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="rounded-md px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              {open ? '閉じる' : '詳細'}
            </button>
            <button
              type="button"
              onClick={doRemove}
              className="rounded-md px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              削除
            </button>
          </div>
        </div>
        <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1">
          {STATUS_TRANSITIONS.map((t) => (
            <button
              key={t.to}
              type="button"
              disabled={d.status === t.to}
              onClick={() => change(t.to)}
              className={`inline-flex flex-shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium hover:bg-gray-100 ${t.tone} ${
                d.status === t.to ? 'opacity-40' : ''
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {open && (
        <div className="border-t border-gray-100 p-4">
          <DeliverableCard
            deliverable={d}
            index={idx}
            stores={stores}
            onUpdate={async (patch) => {
              await updateDeliverable(supabase, requestId, d.id, patch);
              onChanged();
            }}
            onUpdateDetails={async (patch) => {
              await updateDeliverable(supabase, requestId, d.id, {
                details: { ...d.details, ...patch } as Deliverable['details'],
              });
              onChanged();
            }}
            onRemove={doRemove}
            canRemove={false}
          />
        </div>
      )}
    </div>
  );
}
