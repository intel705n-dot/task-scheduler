'use client';

import type { OtherDetails } from '@/lib/types';

type Props = {
  value: OtherDetails;
  onChange: (patch: Partial<OtherDetails>) => void;
};

const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';
const labelCls = 'mb-1 block text-sm font-medium text-gray-700';

export default function OtherForm({ value, onChange }: Props) {
  const addSize = (s: string) => {
    if (!s) return;
    const current = value.sizes ?? [];
    if (current.includes(s)) return;
    onChange({ sizes: [...current, s] });
  };

  const removeSize = (s: string) => {
    onChange({ sizes: (value.sizes ?? []).filter((x) => x !== s) });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>サイズ・仕様(自由入力)</label>
        <div className="flex flex-wrap gap-2">
          {(value.sizes ?? []).map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full border border-gray-900 bg-gray-900 px-3 py-1 text-sm text-white"
            >
              {s}
              <button
                type="button"
                onClick={() => removeSize(s)}
                className="ml-1 text-xs text-white/70 hover:text-white"
              >
                ×
              </button>
            </span>
          ))}
          <input
            className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Enter で追加"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSize((e.target as HTMLInputElement).value.trim());
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>印刷枚数・個数</label>
        <input
          type="number"
          min={0}
          className={inputCls}
          value={value.printCount ?? ''}
          onChange={(e) =>
            onChange({ printCount: e.target.value === '' ? undefined : Number(e.target.value) })
          }
        />
      </div>

      <div>
        <label className={labelCls}>備考(何を作るかの詳細)</label>
        <textarea
          className="min-h-[96px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={value.notes ?? ''}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </div>
    </div>
  );
}
