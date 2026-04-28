'use client';

import type { BusinessCardDetails, QrCodeEntry } from '@/lib/types';

type Props = {
  value: BusinessCardDetails;
  onChange: (patch: Partial<BusinessCardDetails>) => void;
  // QR コード画像 (送信時に親フォームが Dropbox へ upload)。
  // qrCodes と同じ length で対応する。null = まだファイル未選択 or 既存添付済み。
  qrFiles: (File | null)[];
  onQrFilesChange: (files: (File | null)[]) => void;
};

export default function BusinessCardForm({
  value,
  onChange,
  qrFiles,
  onQrFilesChange,
}: Props) {
  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';
  const labelCls = 'mb-1 block text-sm font-medium text-gray-700';

  // 旧データの単発 QR を qrCodes 配列にマージして読む (書き戻しは qrCodes 一本)
  const legacy: QrCodeEntry[] =
    (value.qrCodeNote || value.qrCodeAttachment)
      ? [
          {
            note: value.qrCodeNote,
            attachment: value.qrCodeAttachment,
          },
        ]
      : (value.lineQrNote
          ? [{ note: value.lineQrNote }]
          : []);
  const qrCodes: QrCodeEntry[] = value.qrCodes ?? legacy;
  const hasAnyQr = qrCodes.length > 0 || (value.hasQrCode ?? value.lineQr ?? false);

  const updateQrEntry = (idx: number, patch: Partial<QrCodeEntry>) => {
    const next = [...qrCodes];
    next[idx] = { ...next[idx], ...patch };
    onChange({ qrCodes: next });
  };

  const addQrEntry = () => {
    const next = [...qrCodes, {}];
    onChange({ qrCodes: next, hasQrCode: true });
    onQrFilesChange([...qrFiles, null]);
  };

  const removeQrEntry = (idx: number) => {
    const next = qrCodes.filter((_, i) => i !== idx);
    onChange({ qrCodes: next, hasQrCode: next.length > 0 });
    onQrFilesChange(qrFiles.filter((_, i) => i !== idx));
  };

  const toggleQrSection = (checked: boolean) => {
    if (checked) {
      // チェック ON: エントリーがゼロなら 1個追加
      if (qrCodes.length === 0) {
        onChange({ qrCodes: [{}], hasQrCode: true, lineQr: true });
        onQrFilesChange([null]);
      } else {
        onChange({ hasQrCode: true, lineQr: true });
      }
    } else {
      // チェック OFF: 全消去
      onChange({ qrCodes: [], hasQrCode: false, lineQr: false });
      onQrFilesChange([]);
    }
  };

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
            checked={hasAnyQr}
            onChange={(e) => toggleQrSection(e.target.checked)}
          />
          <span className="text-sm">QRコードを入れる</span>
        </label>
        {hasAnyQr && qrCodes.length > 0 && (
          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            {qrCodes.map((entry, idx) => {
              const file = qrFiles[idx] ?? null;
              return (
                <div
                  key={idx}
                  className="space-y-2 rounded-md border border-gray-200 bg-white p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-600">
                      QR #{idx + 1}
                    </span>
                    {qrCodes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQrEntry(idx)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        削除
                      </button>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>QRコードの内容</label>
                    <input
                      className={inputCls}
                      placeholder="例: 公式LINE / 個人ポートフォリオ"
                      value={entry.note ?? ''}
                      onChange={(e) =>
                        updateQrEntry(idx, { note: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>QRコード画像</label>
                    <div className="flex flex-col gap-2">
                      <label className="w-fit cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        {file ? '画像を変更' : 'QRコード画像を選択'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            const next = [...qrFiles];
                            next[idx] = f;
                            onQrFilesChange(next);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {file && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="flex-1 truncate">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(0)} KB
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...qrFiles];
                              next[idx] = null;
                              onQrFilesChange(next);
                            }}
                            className="text-gray-400 hover:text-red-600"
                          >
                            ×
                          </button>
                        </div>
                      )}
                      {!file && entry.attachment && (
                        <div className="text-xs text-gray-500">
                          既存: {entry.attachment.name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={addQrEntry}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                + さらに追加
              </button>
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
