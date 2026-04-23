'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type {
  Attachment,
  Deliverable,
  DeliverableCategory,
  DeliverableDetails,
  Preset,
  Store,
} from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/types';
import {
  addStoredToken,
  createDeliverable,
  generatePublicToken,
} from '@/lib/request-utils';
import { insertRequest } from '@/lib/requests';
import { isDropboxConfigured, uploadToDropbox } from '@/lib/dropbox';
import DeliverableCard from '@/components/deliverables/DeliverableCard';

const CATEGORIES: DeliverableCategory[] = [
  'poster',
  'pop',
  'businessCard',
  'award',
  'other',
];

type Props = {
  stores: Store[];
  presets: Preset[];
};

export default function NewRequestForm({ stores, presets }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const presetId = params.get('preset');

  const [storeId, setStoreId] = useState<number | null>(null);
  const [requesterName, setRequesterName] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [usagePeriod, setUsagePeriod] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [referenceUrls, setReferenceUrls] = useState<string[]>(['']);
  const [files, setFiles] = useState<File[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const preset = useMemo(
    () => (presetId ? presets.find((p) => p.id === presetId) : null),
    [presetId, presets],
  );

  useEffect(() => {
    if (deliverables.length > 0) return;
    if (preset) {
      const built = preset.deliverable_templates.map((t) =>
        createDeliverable(t.category, t.details as Partial<DeliverableDetails>),
      );
      setDeliverables(built);
    }
  }, [preset, deliverables.length]);

  useEffect(() => {
    if (storeId === null && stores.length > 0) {
      setStoreId(stores[0].id);
    }
  }, [stores, storeId]);

  const addDeliverable = (category: DeliverableCategory) => {
    setDeliverables((prev) => [...prev, createDeliverable(category)]);
    setShowCategoryPicker(false);
  };

  const updateDeliverable = (id: string, patch: Partial<Deliverable>) => {
    setDeliverables((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const updateDeliverableDetails = (
    id: string,
    patch: Record<string, unknown>,
  ) => {
    setDeliverables((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, details: { ...d.details, ...patch } as DeliverableDetails }
          : d,
      ),
    );
  };

  const removeDeliverable = (id: string) => {
    setDeliverables((prev) => prev.filter((d) => d.id !== id));
  };

  const canSubmit =
    storeId !== null &&
    Boolean(requesterName) &&
    Boolean(title) &&
    Boolean(content) &&
    deliverables.length > 0 &&
    !submitting;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const publicToken = generatePublicToken();

      // Upload to Dropbox first — anonymous INSERT below must carry final attachments
      const attachments: Attachment[] = [];
      if (files.length > 0) {
        if (!isDropboxConfigured()) {
          throw new Error(
            'ファイル添付用ストレージ未設定のため、添付ファイル付き送信ができません。添付を外すか管理者に連絡してください。',
          );
        }
        const subdir = `requests/${Date.now()}_${publicToken.slice(0, 6)}`;
        for (const f of files) {
          const { path, downloadUrl } = await uploadToDropbox(subdir, f);
          attachments.push({
            name: f.name,
            storagePath: path,
            downloadUrl,
            mimeType: f.type,
            sizeBytes: f.size,
            uploadedAt: new Date().toISOString(),
          });
        }
      }

      const supabase = createClient();
      const { id } = await insertRequest(supabase, {
        storeId,
        requesterName,
        title,
        content,
        usagePeriod,
        dueDate: dueDate || undefined,
        referenceUrls,
        attachments,
        deliverables,
        publicToken,
      });
      addStoredToken(publicToken);
      router.push(`/request/${id}?token=${publicToken}&submitted=1`);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || '送信に失敗しました');
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900';
  const labelCls = 'mb-1 block text-sm font-medium text-gray-700';

  return (
    <main className="mx-auto max-w-3xl px-3 py-5 pb-24 sm:px-4 sm:py-8">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">制作依頼フォーム</h1>
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
        >
          ← 戻る
        </Link>
      </div>
      {preset && (
        <p className="mt-1 text-sm text-gray-600">
          プリセット: <span className="font-medium">{preset.name}</span>
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-8">
        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
          <h2 className="font-bold">基本情報</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>店舗 *</label>
              <select
                className={inputCls}
                value={storeId ?? ''}
                onChange={(e) =>
                  setStoreId(e.target.value === '' ? null : Number(e.target.value))
                }
                required
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>依頼者名 *</label>
              <input
                className={inputCls}
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>案件タイトル *</label>
            <input
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: ALL for LOVE SHOW 告知"
              required
            />
          </div>
          <div>
            <label className={labelCls}>内容・メッセージ本文 *</label>
            <textarea
              className={`${inputCls} min-h-[120px]`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="デザインに入れたい文言、雰囲気、注意点など"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>使用期間</label>
              <input
                className={inputCls}
                placeholder="例: 4/20 - 4/27"
                value={usagePeriod}
                onChange={(e) => setUsagePeriod(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>納品希望日</label>
              <input
                type="date"
                className={inputCls}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>参考資料URL</label>
            <div className="space-y-2">
              {referenceUrls.map((url, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className={inputCls}
                    type="url"
                    placeholder="https://..."
                    value={url}
                    onChange={(e) =>
                      setReferenceUrls((prev) =>
                        prev.map((u, idx) => (idx === i ? e.target.value : u)),
                      )
                    }
                  />
                  {referenceUrls.length > 1 && (
                    <button
                      type="button"
                      className="rounded px-2 text-gray-500 hover:bg-gray-100"
                      onClick={() =>
                        setReferenceUrls((prev) => prev.filter((_, idx) => idx !== i))
                      }
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                onClick={() => setReferenceUrls((prev) => [...prev, ''])}
              >
                + URLを追加
              </button>
            </div>
          </div>

          <div>
            <label className={labelCls}>添付ファイル</label>
            <div className="flex flex-col gap-2">
              <label className="w-fit cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                ファイルを選択
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const list = Array.from(e.target.files ?? []);
                    setFiles((prev) => [...prev, ...list]);
                    e.target.value = '';
                  }}
                />
              </label>
              {files.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-700">
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="text-xs text-gray-500">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-gray-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">成果物 ({deliverables.length})</h2>
          </div>

          <div className="space-y-4">
            {deliverables.map((d, i) => (
              <DeliverableCard
                key={d.id}
                deliverable={d}
                index={i}
                stores={stores}
                onUpdate={(patch) => updateDeliverable(d.id, patch)}
                onUpdateDetails={(patch) => updateDeliverableDetails(d.id, patch)}
                onRemove={() => removeDeliverable(d.id)}
                canRemove={deliverables.length > 1}
              />
            ))}

            <div className="relative">
              <button
                type="button"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setShowCategoryPicker((v) => !v)}
              >
                + 成果物を追加
              </button>
              {showCategoryPicker && (
                <div className="absolute left-1/2 z-10 mt-2 w-64 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                  {CATEGORIES.map((c) => (
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
        </section>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <div
          className="sticky bottom-0 -mx-3 border-t border-gray-200 bg-white/95 px-3 py-3 backdrop-blur sm:-mx-4 sm:px-4"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
            <div className="text-[11px] leading-tight text-gray-500 sm:text-xs">
              {deliverables.length === 0
                ? '成果物を1つ以上追加してください'
                : `成果物 ${deliverables.length}件を送信`}
            </div>
            <button
              type="submit"
              className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSubmit}
            >
              {submitting ? '送信中…' : '依頼を送信'}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
