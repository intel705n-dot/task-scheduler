'use client';

import type { AwardDetails, AwardRecipient } from '@/lib/types';

type Props = {
  value: AwardDetails;
  onChange: (patch: Partial<AwardDetails>) => void;
};

const MATERIALS = ['賞状', '封筒', '賞金袋', '表彰状'];

const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';
const labelCls = 'mb-1 block text-sm font-medium text-gray-700';

export default function AwardForm({ value, onChange }: Props) {
  const toggleMaterial = (m: string) => {
    const current = value.printMaterials ?? [];
    const next = current.includes(m) ? current.filter((x) => x !== m) : [...current, m];
    onChange({ printMaterials: next });
  };

  const updateRecipient = (i: number, patch: Partial<AwardRecipient>) => {
    const next = value.recipients.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    onChange({ recipients: next });
  };

  const addRecipient = () => {
    onChange({
      recipients: [...(value.recipients ?? []), { awardType: '', rank: '', name: '' }],
    });
  };

  const removeRecipient = (i: number) => {
    onChange({ recipients: value.recipients.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>授賞式・配布日</label>
        <input
          type="date"
          className={inputCls}
          value={value.ceremonyDate ?? ''}
          onChange={(e) => onChange({ ceremonyDate: e.target.value })}
        />
      </div>

      <div>
        <label className={labelCls}>作成物</label>
        <div className="flex flex-wrap gap-2">
          {MATERIALS.map((m) => {
            const active = value.printMaterials?.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggleMaterial(m)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition ${
                  active
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className={labelCls + ' !mb-0'}>受賞者</label>
          <button
            type="button"
            onClick={addRecipient}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
          >
            + 追加
          </button>
        </div>
        <div className="space-y-2">
          {value.recipients.length === 0 && (
            <p className="text-xs text-gray-500">
              受賞者は後から管理画面で追加することもできます。
            </p>
          )}
          {value.recipients.map((r, i) => (
            <div
              key={i}
              className="grid gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <input
                className={inputCls}
                placeholder="賞の種類(例: 売上1位)"
                value={r.awardType}
                onChange={(e) => updateRecipient(i, { awardType: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="ランク・位"
                value={r.rank ?? ''}
                onChange={(e) => updateRecipient(i, { rank: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="受賞者名"
                value={r.name}
                onChange={(e) => updateRecipient(i, { name: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeRecipient(i)}
                className="rounded px-2 py-1 text-red-600 hover:bg-red-50"
                aria-label="削除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>備考</label>
        <textarea
          className="min-h-[72px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={value.notes ?? ''}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </div>
    </div>
  );
}
