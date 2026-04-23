'use client';

import type { BusinessCardDetails, Store } from '@/lib/types';

type Props = {
  value: BusinessCardDetails;
  onChange: (patch: Partial<BusinessCardDetails>) => void;
  stores: Store[];
};

export default function BusinessCardForm({ value, onChange, stores }: Props) {
  const toggleStore = (name: string) => {
    const current = value.storeVariants ?? [];
    const next = current.includes(name)
      ? current.filter((s) => s !== name)
      : [...current, name];
    onChange({ storeVariants: next });
  };

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';
  const labelCls = 'mb-1 block text-sm font-medium text-gray-700';

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>キャスト名(漢字) *</label>
          <input
            className={inputCls}
            value={value.nameKanji}
            onChange={(e) => onChange({ nameKanji: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>ローマ字</label>
          <input
            className={inputCls}
            value={value.nameRomaji ?? ''}
            onChange={(e) => onChange({ nameRomaji: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>ふりがな</label>
          <input
            className={inputCls}
            value={value.nameKana ?? ''}
            onChange={(e) => onChange({ nameKana: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>役職</label>
          <input
            className={inputCls}
            value={value.position ?? ''}
            onChange={(e) => onChange({ position: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>掲載する店舗電話</label>
        <div className="flex flex-wrap gap-2">
          {stores.map((s) => {
            const active = value.storeVariants?.includes(s.name);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleStore(s.name)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition ${
                  active
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          複数店舗の電話を掲載する場合は複数選択。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>電話番号の上書き</label>
          <input
            className={inputCls}
            placeholder="上の選択と違う場合のみ"
            value={value.phoneOverride ?? ''}
            onChange={(e) => onChange({ phoneOverride: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>メール</label>
          <input
            className={inputCls}
            type="email"
            value={value.email ?? ''}
            onChange={(e) => onChange({ email: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-start gap-3">
        <label className="mt-1 inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.lineQr}
            onChange={(e) => onChange({ lineQr: e.target.checked })}
          />
          <span className="text-sm">LINE QR を入れる</span>
        </label>
        {value.lineQr && (
          <input
            className={inputCls + ' flex-1'}
            placeholder="LINE QRの指示・URL等"
            value={value.lineQrNote ?? ''}
            onChange={(e) => onChange({ lineQrNote: e.target.value })}
          />
        )}
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
