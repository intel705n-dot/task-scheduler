'use client';

import type { BusinessCardDetails } from '@/lib/types';

type Props = {
  value: BusinessCardDetails;
  onChange: (patch: Partial<BusinessCardDetails>) => void;
  // QR コード画像 (送信時に親フォームが Dropbox へ upload)
  qrFile: File | null;
  onQrFileChange: (file: File | null) => void;
};

export default function BusinessCardForm({
  value,
  onChange,
  qrFile,
  onQrFileChange,
}: Props) {
  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';
  const labelCls = 'mb-1 block text-sm font-medium text-gray-700';

  // 旧データの lineQr / lineQrNote を hasQrCode / qrCodeNote にフォールバック
  const hasQrCode = value.hasQrCode ?? value.lineQr ?? false;
  const qrCodeNote = value.qrCodeNote ?? value.lineQrNote ?? '';

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>お名前フルネーム(漢字) *</label>
          <input
            className={inputCls}
            value={value.nameKanji}
            onChange={(e) => onChange({ nameKanji: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>ローマ字(例: Taro Tanaka) *</label>
          <input
            className={inputCls}
            placeholder="Taro Tanaka"
            value={value.nameRomaji ?? ''}
            onChange={(e) => onChange({ nameRomaji: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>ふりがな *</label>
          <input
            className={inputCls}
            value={value.nameKana ?? ''}
            onChange={(e) => onChange({ nameKana: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>
            役職{' '}
            <span className="text-xs font-normal text-gray-500">
              (記載しない場合は記入しないでください)
            </span>
          </label>
          <input
            className={inputCls}
            value={value.position ?? ''}
            onChange={(e) => onChange({ position: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>
          部数{' '}
          <span className="text-xs font-normal text-gray-500">
            (1部あたり 100 枚)
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = value.quantity === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onChange({ quantity: n })}
                className={`inline-flex h-9 w-12 items-center justify-center rounded-md border text-sm font-medium transition ${
                  active
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {n}
              </button>
            );
          })}
          <span className="text-sm text-gray-500">
            部 = {(value.quantity ?? 1) * 100} 枚
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>
            個人電話番号{' '}
            <span className="text-xs font-normal text-gray-500">
              (記載しない場合は記入しないでください)
            </span>
          </label>
          <input
            className={inputCls}
            placeholder="例 080-1234-5678"
            value={value.phoneOverride ?? ''}
            onChange={(e) => onChange({ phoneOverride: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>
            メールアドレス{' '}
            <span className="text-xs font-normal text-gray-500">
              (記載しない場合は記入しないでください)
            </span>
          </label>
          <input
            className={inputCls}
            type="email"
            value={value.email ?? ''}
            onChange={(e) => onChange({ email: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={hasQrCode}
            onChange={(e) =>
              onChange({ hasQrCode: e.target.checked, lineQr: e.target.checked })
            }
          />
          <span className="text-sm">QRコードを入れる</span>
        </label>
        {hasQrCode && (
          <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div>
              <label className={labelCls}>QRコードの内容</label>
              <input
                className={inputCls}
                placeholder="例: 公式LINE / 個人ポートフォリオ"
                value={qrCodeNote}
                onChange={(e) =>
                  onChange({ qrCodeNote: e.target.value, lineQrNote: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelCls}>QRコード画像</label>
              <div className="flex flex-col gap-2">
                <label className="w-fit cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  {qrFile ? '画像を変更' : 'QRコード画像を選択'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      onQrFileChange(f);
                      e.target.value = '';
                    }}
                  />
                </label>
                {qrFile && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="flex-1 truncate">{qrFile.name}</span>
                    <span className="text-xs text-gray-500">
                      {(qrFile.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => onQrFileChange(null)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      ×
                    </button>
                  </div>
                )}
                {!qrFile && value.qrCodeAttachment && (
                  <div className="text-xs text-gray-500">
                    既存: {value.qrCodeAttachment.name}
                  </div>
                )}
              </div>
            </div>
          </div>
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
