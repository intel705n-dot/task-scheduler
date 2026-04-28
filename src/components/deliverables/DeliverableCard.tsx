'use client';

import type {
  AwardDetails,
  BusinessCardDetails,
  CommonDeliverableInfo,
  Deliverable,
  DeliverableCategory,
  OtherDetails,
  PosterPopDetails,
  Store,
} from '@/lib/types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/types';
import PosterPopForm from './PosterPopForm';
import BusinessCardForm from './BusinessCardForm';
import AwardForm from './AwardForm';
import OtherForm from './OtherForm';

type Props = {
  deliverable: Deliverable;
  index: number;
  stores: Store[];
  onUpdate: (patch: Partial<Deliverable>) => void;
  onUpdateDetails: (patch: Record<string, unknown>) => void;
  onRemove: () => void;
  canRemove: boolean;
  // 添付ファイル (BLOB) は親フォームで管理 (送信時に Dropbox へ upload)
  // 新規作成 (NewRequestForm) のみ使用。詳細閲覧画面では渡さない。
  files?: File[];
  onFilesChange?: (files: File[]) => void;
  // QR コード画像 (名刺成果物のみ使用)。複数 QR 対応のため配列。
  qrFiles?: (File | null)[];
  onQrFilesChange?: (files: (File | null)[]) => void;
};

export default function DeliverableCard({
  deliverable,
  index,
  stores: _stores,
  onUpdate: _onUpdate,
  onUpdateDetails,
  onRemove,
  canRemove,
  files,
  onFilesChange,
  qrFiles,
  onQrFilesChange,
}: Props) {
  void _stores;
  const { category, details } = deliverable;
  void _onUpdate;
  const common = details as CommonDeliverableInfo;

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[category]}`}
          >
            #{index + 1} {CATEGORY_LABELS[category]}
          </span>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded px-2 py-1 text-red-600 hover:bg-red-50"
            aria-label="削除"
          >
            削除
          </button>
        )}
      </div>

      {/* 新規作成フォーム時のみ共通フィールドを編集表示する。詳細閲覧では省略。
          従業員名刺は名前・部数・電話など独自項目のみで、共通フィールド (タイトル/内容/期間等) は不要。 */}
      {onFilesChange && category !== 'businessCard' && (
        <CommonFieldsForm
          common={common}
          onChange={onUpdateDetails}
          files={files ?? []}
          onFilesChange={onFilesChange}
        />
      )}

      {(category === 'poster' || category === 'pop') && (
        <PosterPopForm
          category={category}
          value={details as PosterPopDetails}
          onChange={onUpdateDetails}
        />
      )}
      {category === 'businessCard' && (
        <BusinessCardForm
          value={details as BusinessCardDetails}
          onChange={onUpdateDetails}
          qrFiles={qrFiles ?? []}
          onQrFilesChange={onQrFilesChange ?? (() => {})}
        />
      )}
      {category === 'award' && (
        <AwardForm value={details as AwardDetails} onChange={onUpdateDetails} />
      )}
      {category === 'other' && (
        <OtherForm value={details as OtherDetails} onChange={onUpdateDetails} />
      )}
    </div>
  );
}


function CommonFieldsForm({
  common,
  onChange,
  files,
  onFilesChange,
}: {
  common: CommonDeliverableInfo;
  onChange: (patch: Record<string, unknown>) => void;
  files: File[];
  onFilesChange: (next: File[]) => void;
}) {
  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900';
  const labelCls = 'mb-1 block text-sm font-medium text-gray-700';
  const refs = common.referenceUrls ?? [''];

  return (
    <div className="space-y-3 rounded-lg bg-gray-50/60 p-3">
      <div>
        <label className={labelCls}>タイトル *</label>
        <input
          className={inputCls}
          value={common.title ?? ''}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="例: ALL for LOVE SHOW 告知ポスター"
          required
        />
      </div>
      <div>
        <label className={labelCls}>内容・メッセージ本文 *</label>
        <textarea
          className={`${inputCls} min-h-[100px]`}
          value={common.content ?? ''}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder="デザインに入れたい文言、雰囲気、注意点など"
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>イベント期間</label>
          <input
            className={inputCls}
            placeholder="例: 4/20 - 4/27"
            value={common.eventPeriod ?? ''}
            onChange={(e) => onChange({ eventPeriod: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>納品希望日</label>
          <input
            type="date"
            className={inputCls}
            value={common.dueDate ?? ''}
            onChange={(e) => onChange({ dueDate: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className={labelCls}>参考資料URL</label>
        <div className="space-y-2">
          {refs.map((url, i) => (
            <div key={i} className="flex gap-2">
              <input
                className={inputCls}
                type="url"
                placeholder="https://..."
                value={url}
                onChange={(e) => {
                  const next = [...refs];
                  next[i] = e.target.value;
                  onChange({ referenceUrls: next });
                }}
              />
              {refs.length > 1 && (
                <button
                  type="button"
                  className="rounded px-2 text-gray-500 hover:bg-gray-100"
                  onClick={() => {
                    const next = refs.filter((_, idx) => idx !== i);
                    onChange({ referenceUrls: next.length ? next : [''] });
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
            onClick={() => onChange({ referenceUrls: [...refs, ''] })}
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
                onFilesChange([...files, ...list]);
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
                    onClick={() =>
                      onFilesChange(files.filter((_, idx) => idx !== i))
                    }
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
    </div>
  );
}

export { type DeliverableCategory };
