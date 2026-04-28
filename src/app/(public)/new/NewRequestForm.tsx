'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type {
  Attachment,
  CommonDeliverableInfo,
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

// 「その他」カテゴリは新規追加メニューから外す。
// (旧データに other が残っていても表示は壊れない: 型 / OtherForm は維持)
const CATEGORIES: DeliverableCategory[] = [
  'poster',
  'pop',
  'businessCard',
  'award',
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
  // 成果物ごとの添付ファイル / QR画像 (deliverable.id をキーにしたマップ)
  // QR は複数追加可なので配列。
  const [filesByDel, setFilesByDel] = useState<Record<string, File[]>>({});
  const [qrFilesByDel, setQrFilesByDel] = useState<
    Record<string, (File | null)[]>
  >({});
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
    setFilesByDel((prev) => {
      const { [id]: _x, ...rest } = prev;
      void _x;
      return rest;
    });
    setQrFilesByDel((prev) => {
      const { [id]: _x, ...rest } = prev;
      void _x;
      return rest;
    });
  };

  // 各成果物に title/content が入っているかチェック (従業員名刺は共通フィールド非表示なので除外)
  const allDeliverablesHaveCommonRequired = deliverables.every((d) => {
    if (d.category === 'businessCard') return true;
    const c = d.details as CommonDeliverableInfo;
    return Boolean(c.title?.trim()) && Boolean(c.content?.trim());
  });

  const canSubmit =
    storeId !== null &&
    Boolean(requesterName) &&
    deliverables.length > 0 &&
    allDeliverablesHaveCommonRequired &&
    !submitting;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const publicToken = generatePublicToken();
      const subdir = `requests/${Date.now()}_${publicToken.slice(0, 6)}`;

      const hasAnyFile =
        Object.values(filesByDel).some((arr) => arr.length > 0) ||
        Object.values(qrFilesByDel).some((arr) => arr.some(Boolean));

      if (hasAnyFile && !isDropboxConfigured()) {
        throw new Error(
          'ファイル添付用ストレージ未設定のため、添付ファイル付き送信ができません。添付を外すか管理者に連絡してください。',
        );
      }

      // 成果物ごとに添付・QR をアップロードして details に反映
      const finalDeliverables: Deliverable[] = [];
      for (let i = 0; i < deliverables.length; i++) {
        const d = deliverables[i];
        const sub = `${subdir}/d${i + 1}`;
        const attachments: Attachment[] = [];
        for (const f of filesByDel[d.id] ?? []) {
          const { path, downloadUrl } = await uploadToDropbox(sub, f);
          attachments.push({
            name: f.name,
            storagePath: path,
            downloadUrl,
            mimeType: f.type,
            sizeBytes: f.size,
            uploadedAt: new Date().toISOString(),
          });
        }

        // QR コード画像 (複数可) を qrCodes 配列に対応させてアップロード
        let mergedDetails = {
          ...(d.details as DeliverableDetails),
          attachments,
        } as DeliverableDetails;
        if (d.category === 'businessCard') {
          const detailsAsBC = d.details as import('@/lib/types').BusinessCardDetails;
          const qrCodes = detailsAsBC.qrCodes ?? [];
          const qrUploads = qrFilesByDel[d.id] ?? [];
          const updatedQrCodes = await Promise.all(
            qrCodes.map(async (entry, qrIdx) => {
              const f = qrUploads[qrIdx];
              if (!f) return entry;
              const { path, downloadUrl } = await uploadToDropbox(
                `${sub}/qr${qrIdx + 1}`,
                f,
              );
              return {
                ...entry,
                attachment: {
                  name: f.name,
                  storagePath: path,
                  downloadUrl,
                  mimeType: f.type,
                  sizeBytes: f.size,
                  uploadedAt: new Date().toISOString(),
                },
              };
            }),
          );
          mergedDetails = {
            ...mergedDetails,
            qrCodes: updatedQrCodes,
          } as DeliverableDetails;
        }

        finalDeliverables.push({ ...d, details: mergedDetails });
      }

      // request 行に持たせる集約値: 1件目をベースに、なければ次を見る
      const titleFor = (d: Deliverable): string => {
        if (d.category === 'businessCard') {
          const bc = d.details as import('@/lib/types').BusinessCardDetails;
          return bc.nameKanji ? `${bc.nameKanji} の名刺` : '従業員名刺';
        }
        return (d.details as CommonDeliverableInfo).title ?? '';
      };
      const first = finalDeliverables[0];
      const firstCommon = first.details as CommonDeliverableInfo;
      const baseTitle = titleFor(first);
      const aggregateTitle =
        finalDeliverables.length === 1
          ? baseTitle
          : `${baseTitle} 他${finalDeliverables.length - 1}件`;

      const allReferenceUrls = finalDeliverables.flatMap(
        (d) => (d.details as CommonDeliverableInfo).referenceUrls ?? [],
      );
      const allAttachments = finalDeliverables.flatMap(
        (d) => (d.details as CommonDeliverableInfo).attachments ?? [],
      );

      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const { id } = await insertRequest(supabase, {
        storeId,
        requesterName,
        title: aggregateTitle || '(タイトルなし)',
        content: firstCommon.content ?? '',
        usagePeriod: firstCommon.eventPeriod,
        dueDate: firstCommon.dueDate || undefined,
        referenceUrls: allReferenceUrls.filter(Boolean),
        attachments: allAttachments,
        deliverables: finalDeliverables,
        publicToken,
        userId: userData.user?.id ?? null,
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
                selectedStoreName={
                  storeId !== null
                    ? stores.find((s) => s.id === storeId)?.name
                    : undefined
                }
                onUpdate={(patch) => updateDeliverable(d.id, patch)}
                onUpdateDetails={(patch) => updateDeliverableDetails(d.id, patch)}
                onRemove={() => removeDeliverable(d.id)}
                canRemove={deliverables.length > 1}
                files={filesByDel[d.id] ?? []}
                onFilesChange={(next) =>
                  setFilesByDel((prev) => ({ ...prev, [d.id]: next }))
                }
                qrFiles={qrFilesByDel[d.id] ?? []}
                onQrFilesChange={(next) =>
                  setQrFilesByDel((prev) => ({ ...prev, [d.id]: next }))
                }
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
                : !allDeliverablesHaveCommonRequired
                  ? '各成果物にタイトル・内容を入力してください'
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
