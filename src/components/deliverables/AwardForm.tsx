'use client';

import { useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import type { AwardDetails, AwardItem, AwardRecipientV2 } from '@/lib/types';
import {
  buildTemplateByKey,
  newAwardRecipient,
  newCustomAwardItem,
  templateKeyForStoreName,
} from '@/lib/award-templates';

type Props = {
  value: AwardDetails;
  onChange: (patch: Partial<AwardDetails>) => void;
  // 店舗テンプレート自動展開のための店舗名
  storeName?: string;
};

export default function AwardForm({ value, onChange, storeName }: Props) {
  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';
  const labelCls = 'mb-1 block text-sm font-medium text-gray-700';

  const items: AwardItem[] = value.items ?? [];

  // 初回 (items 未設定 + テンプレキー判定可能) で自動展開
  useEffect(() => {
    if (value.items !== undefined && value.items.length > 0) return;
    if (value.storeTemplate) return; // 既に手動選択済み
    const key = templateKeyForStoreName(storeName);
    if (key) {
      onChange({
        items: buildTemplateByKey(key),
        storeTemplate: key,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeName]);

  const updateItem = (id: string, patch: Partial<AwardItem>) => {
    onChange({
      items: items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    });
  };

  const removeItem = (id: string) => {
    onChange({ items: items.filter((it) => it.id !== id) });
  };

  const addCustomItem = () => {
    onChange({ items: [...items, newCustomAwardItem()] });
  };

  const applyTemplate = (key: 'fushicho' | 'ranmaru') => {
    if (
      items.length > 0 &&
      !confirm('現在の項目をすべて置き換えます。よろしいですか?')
    ) {
      return;
    }
    onChange({ items: buildTemplateByKey(key), storeTemplate: key });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>表彰式日</label>
          <input
            type="date"
            className={inputCls}
            value={value.ceremonyDate}
            onChange={(e) => onChange({ ceremonyDate: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>対象月 (任意)</label>
          <input
            className={inputCls}
            placeholder="例: 2026-04 / 4月度"
            value={value.targetMonth ?? ''}
            onChange={(e) => onChange({ targetMonth: e.target.value })}
          />
        </div>
      </div>

      {items.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-600">
          表彰項目がまだ追加されていません。
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => applyTemplate('fushicho')}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs hover:bg-gray-50"
            >
              不死鳥テンプレートを読込
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('ranmaru')}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs hover:bg-gray-50"
            >
              蘭○テンプレートを読込
            </button>
            <button
              type="button"
              onClick={addCustomItem}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs hover:bg-gray-50"
            >
              + 空の項目を追加
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map((it, idx) => (
          <AwardItemCard
            key={it.id}
            index={idx}
            item={it}
            onChange={(patch) => updateItem(it.id, patch)}
            onRemove={() => removeItem(it.id)}
          />
        ))}
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addCustomItem}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
            カスタム表彰項目を追加
          </button>
          <span className="text-[11px] text-gray-500">
            (店舗側で追加した特別賞などはここから)
          </span>
        </div>
      )}

      {items.length > 0 && <Summary items={items} />}
    </div>
  );
}

function Summary({ items }: { items: AwardItem[] }) {
  let cert = 0;
  let env = 0;
  for (const it of items) {
    for (const r of it.recipients) {
      if (!r.name?.trim()) continue;
      if (r.hasCertificate) cert++;
      if (r.hasEnvelope) env++;
    }
  }
  const total = cert + env;
  if (total === 0) return null;
  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
      <span className="font-semibold">合計</span>: 賞状 {cert} 枚 / 封筒{' '}
      {env} 袋
    </div>
  );
}

function AwardItemCard({
  index,
  item,
  onChange,
  onRemove,
}: {
  index: number;
  item: AwardItem;
  onChange: (patch: Partial<AwardItem>) => void;
  onRemove: () => void;
}) {
  const recipients = item.recipients;
  const collapsed = Boolean(item.collapsed);
  const inputCls = 'w-full rounded border border-gray-300 px-2 py-1 text-xs';

  const updateRecipient = (idx: number, patch: Partial<AwardRecipientV2>) => {
    const next = [...recipients];
    next[idx] = { ...next[idx], ...patch };
    onChange({ recipients: next });
  };

  const addRecipient = () => {
    const last = recipients[recipients.length - 1];
    const cert = last?.hasCertificate ?? true;
    const env = last?.hasEnvelope ?? true;
    onChange({ recipients: [...recipients, newAwardRecipient(cert, env)] });
  };

  const addTiedRecipient = (idx: number) => {
    const base = recipients[idx];
    const next = [...recipients];
    next.splice(idx + 1, 0, {
      rank: base.rank,
      name: '',
      hasCertificate: base.hasCertificate,
      hasEnvelope: base.hasEnvelope,
    });
    onChange({ recipients: next });
  };

  const removeRecipient = (idx: number) => {
    onChange({ recipients: recipients.filter((_, i) => i !== idx) });
  };

  // サマリ用
  const filledCount = recipients.filter((r) => r.name?.trim()).length;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
        <button
          type="button"
          onClick={() => onChange({ collapsed: !collapsed })}
          className="inline-flex flex-1 items-center gap-1.5 text-left"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
          <span className="text-sm font-semibold text-gray-800">
            #{index + 1} {item.itemName || '(項目名未入力)'}
          </span>
          {item.rankRange && item.rankRange !== '-' && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
              {item.rankRange}
            </span>
          )}
          {item.presetType === 'permanent' && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">
              常設
            </span>
          )}
          {item.presetType === 'variable' && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">
              変動
            </span>
          )}
          {item.presetType === 'custom' && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] text-indigo-700">
              カスタム
            </span>
          )}
          <span className="text-xs text-gray-500">
            {filledCount > 0
              ? `(受賞者 ${filledCount} 名)`
              : `(${recipients.length} 枠)`}
          </span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          項目削除
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-3 p-3">
          {/* 項目名/順位範囲/備考 */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-0.5 block text-[11px] font-medium text-gray-600">
                項目名
              </label>
              <input
                className={inputCls}
                value={item.itemName}
                onChange={(e) => onChange({ itemName: e.target.value })}
                placeholder="例: 月間ベストオール"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-[11px] font-medium text-gray-600">
                順位範囲 (任意)
              </label>
              <input
                className={inputCls}
                value={item.rankRange ?? ''}
                onChange={(e) => onChange({ rankRange: e.target.value })}
                placeholder="例: 1〜5位 / -"
              />
            </div>
          </div>
          <div>
            <label className="mb-0.5 block text-[11px] font-medium text-gray-600">
              備考
            </label>
            <input
              className={inputCls}
              value={item.notes ?? ''}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="社長名・条件などのメモ"
            />
          </div>

          {/* 受賞者リスト */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-[56px_1fr_72px_44px_44px_44px] gap-1 px-1 text-[10px] font-semibold text-gray-500">
              <span>順位</span>
              <span>名前 / 内容</span>
              <span className="text-right">賞金</span>
              <span className="text-center">賞状</span>
              <span className="text-center">封筒</span>
              <span></span>
            </div>
            {recipients.map((r, ri) => (
              <RecipientRow
                key={ri}
                value={r}
                onChange={(patch) => updateRecipient(ri, patch)}
                onAddTied={() => addTiedRecipient(ri)}
                onRemove={() => removeRecipient(ri)}
              />
            ))}
            <button
              type="button"
              onClick={addRecipient}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50"
            >
              <Plus className="h-3.5 w-3.5" />
              受賞者を追加
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RecipientRow({
  value,
  onChange,
  onAddTied,
  onRemove,
}: {
  value: AwardRecipientV2;
  onChange: (patch: Partial<AwardRecipientV2>) => void;
  onAddTied: () => void;
  onRemove: () => void;
}) {
  const inputCls = 'w-full rounded border border-gray-300 px-2 py-1 text-xs';
  return (
    <div className="grid grid-cols-[56px_1fr_72px_44px_44px_44px] gap-1 items-center">
      <input
        className={inputCls}
        placeholder="-"
        value={value.rank ?? ''}
        onChange={(e) => onChange({ rank: e.target.value || undefined })}
      />
      <div className="flex flex-col gap-0.5">
        <input
          className={inputCls}
          placeholder="氏名"
          value={value.name ?? ''}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <input
          className={inputCls + ' text-[11px]'}
          placeholder="達成内容など (任意)"
          value={value.comment ?? ''}
          onChange={(e) => onChange({ comment: e.target.value })}
        />
      </div>
      <input
        type="number"
        className={inputCls + ' text-right'}
        placeholder="-"
        value={value.prizeAmount ?? ''}
        onChange={(e) =>
          onChange({
            prizeAmount:
              e.target.value === '' ? undefined : Number(e.target.value),
          })
        }
      />
      <label className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={value.hasCertificate}
          onChange={(e) => onChange({ hasCertificate: e.target.checked })}
        />
      </label>
      <label className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={value.hasEnvelope}
          onChange={(e) => onChange({ hasEnvelope: e.target.checked })}
        />
      </label>
      <div className="flex items-center justify-end gap-0.5">
        <button
          type="button"
          onClick={onAddTied}
          className="rounded px-1 text-[10px] text-gray-500 hover:bg-gray-100"
          title="同順位を追加"
        >
          同
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded px-1 text-[10px] text-red-500 hover:bg-red-50"
          title="削除"
        >
          ×
        </button>
      </div>
    </div>
  );
}
