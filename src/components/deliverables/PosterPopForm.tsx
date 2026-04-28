'use client';

import type { PosterPopDetails, Orientation } from '@/lib/types';

type Props = {
  category: 'poster' | 'pop';
  value: PosterPopDetails;
  onChange: (patch: Partial<PosterPopDetails>) => void;
};

const POSTER_SIZES = ['A1', 'A2', 'A3', 'B0', 'B1', 'B2'];
const POP_SIZES = ['はがき', '名刺サイズ'];

const ORIENTATIONS: { value: Orientation; label: string }[] = [
  { value: 'vertical', label: 'タテ' },
  { value: 'horizontal', label: 'ヨコ' },
  { value: 'free', label: '構成次第' },
  { value: 'other', label: 'その他' },
];

export default function PosterPopForm({ category, value, onChange }: Props) {
  const sizeOptions = category === 'poster' ? POSTER_SIZES : POP_SIZES;
  // 旧データ (sizes 配列) 互換: 配列の先頭を size に昇格
  const currentSize =
    value.size ?? (Array.isArray(value.sizes) ? value.sizes[0] : '') ?? '';

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          サイズ * <span className="text-xs text-gray-500">(複数欲しい場合は成果物を追加)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {sizeOptions.map((s) => {
            const active = currentSize === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() =>
                  onChange({ size: active ? '' : s, sizes: undefined })
                }
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition ${
                  active
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {s}
              </button>
            );
          })}
          <input
            type="text"
            placeholder="その他サイズを入力"
            className="w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={
              !sizeOptions.includes(currentSize) ? currentSize : ''
            }
            onChange={(e) => onChange({ size: e.target.value, sizes: undefined })}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">向き</label>
        <div className="flex flex-wrap gap-2">
          {ORIENTATIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange({ orientation: o.value })}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition ${
                value.orientation === o.value
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {value.orientation === 'other' && (
          <input
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="向きの詳細"
            value={value.orientationOther ?? ''}
            onChange={(e) => onChange({ orientationOther: e.target.value })}
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">印刷枚数 *</label>
          <input
            type="number"
            min={0}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={value.printCount ?? ''}
            onChange={(e) =>
              onChange({ printCount: e.target.value === '' ? undefined : Number(e.target.value) })
            }
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">印刷用紙・加工</label>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="例: マット紙、ラミネート加工"
            value={value.paperType ?? ''}
            onChange={(e) => onChange({ paperType: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          この成果物のみの備考
        </label>
        <textarea
          className="min-h-[72px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={value.notes ?? ''}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </div>
    </div>
  );
}
