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

  const toggleSize = (s: string) => {
    const current = value.sizes ?? [];
    const next = current.includes(s) ? current.filter((x) => x !== s) : [...current, s];
    onChange({ sizes: next });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          サイズ(複数選択可)
        </label>
        <div className="flex flex-wrap gap-2">
          {sizeOptions.map((s) => {
            const active = value.sizes?.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSize(s)}
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
            placeholder="その他サイズを追加して Enter"
            className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const v = (e.target as HTMLInputElement).value.trim();
                if (v && !value.sizes?.includes(v)) {
                  onChange({ sizes: [...(value.sizes ?? []), v] });
                  (e.target as HTMLInputElement).value = '';
                }
              }
            }}
          />
        </div>
        {value.sizes && value.sizes.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            選択中: {value.sizes.join(', ')}
          </div>
        )}
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
          <label className="mb-1 block text-sm font-medium text-gray-700">印刷枚数</label>
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
          データ納品サイズ指定
        </label>
        <input
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="例: A2原寸、塗り足し3mm"
          value={value.deliverySize ?? ''}
          onChange={(e) => onChange({ deliverySize: e.target.value })}
        />
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
