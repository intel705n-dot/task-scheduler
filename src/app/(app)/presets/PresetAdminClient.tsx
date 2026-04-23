'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { deletePreset, fetchAllPresets, upsertPreset } from '@/lib/requests';
import type {
  DeliverableCategory,
  DeliverableTemplate,
  Preset,
} from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/types';

export default function PresetAdminClient() {
  const supabase = createClient();
  const [presets, setPresets] = useState<Preset[]>([]);

  const refresh = useCallback(async () => {
    setPresets(await fetchAllPresets(supabase));
  }, [supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addNew = async () => {
    const id = 'preset_' + Math.random().toString(36).slice(2, 8);
    await upsertPreset(supabase, {
      id,
      name: '新規プリセット',
      description: '',
      ord: presets.length + 1,
      active: true,
      deliverable_templates: [],
    });
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">プリセット管理</h1>
          <p className="text-xs text-gray-500">
            トップ画面(公開フォーム)に表示される成果物セットを編集します。
          </p>
        </div>
        <button
          type="button"
          onClick={addNew}
          className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + 新規プリセット
        </button>
      </div>

      <div className="space-y-3">
        {presets.map((p) => (
          <PresetEditor key={p.id} preset={p} onChanged={refresh} />
        ))}
        {presets.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
            プリセットがありません
          </div>
        )}
      </div>
    </div>
  );
}

function PresetEditor({ preset, onChanged }: { preset: Preset; onChanged: () => void }) {
  const supabase = createClient();
  const [draft, setDraft] = useState(preset);
  const [dirty, setDirty] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    setDraft(preset);
    setDirty(false);
  }, [preset]);

  const update = <K extends keyof Preset>(key: K, value: Preset[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  };

  const updateTemplateDetails = (idx: number, patch: Record<string, unknown>) => {
    setDraft((d) => ({
      ...d,
      deliverable_templates: d.deliverable_templates.map((t, i) =>
        i === idx ? { ...t, details: { ...t.details, ...patch } } : t,
      ),
    }));
    setDirty(true);
  };

  const addTemplate = (category: DeliverableCategory) => {
    const base: DeliverableTemplate =
      category === 'poster'
        ? { category, details: { sizes: [], orientation: 'vertical', printCount: 1 } }
        : category === 'pop'
          ? { category, details: { sizes: ['はがき'], orientation: 'vertical', printCount: 40 } }
          : category === 'businessCard'
            ? { category, details: { storeVariants: [], lineQr: false } }
            : category === 'award'
              ? { category, details: { printMaterials: [], recipients: [] } }
              : { category, details: {} };
    setDraft((d) => ({
      ...d,
      deliverable_templates: [...d.deliverable_templates, base],
    }));
    setDirty(true);
    setAddOpen(false);
  };

  const removeTemplate = (idx: number) => {
    setDraft((d) => ({
      ...d,
      deliverable_templates: d.deliverable_templates.filter((_, i) => i !== idx),
    }));
    setDirty(true);
  };

  const save = async () => {
    await upsertPreset(supabase, draft);
    setDirty(false);
    onChanged();
  };

  const remove = async () => {
    if (!confirm(`プリセット「${draft.name}」を削除しますか?`)) return;
    await deletePreset(supabase, draft.id);
    onChanged();
  };

  const inputCls = 'rounded-lg border border-gray-300 px-3 py-2 text-sm';

  return (
    <div
      className={`space-y-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4 ${!draft.active ? 'opacity-70' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${inputCls} flex-1 min-w-[160px] font-semibold`}
          value={draft.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="プリセット名"
        />
        <input
          className={`${inputCls} w-24`}
          type="number"
          value={draft.ord}
          onChange={(e) => update('ord', Number(e.target.value))}
          title="並び順"
        />
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
          onClick={() => update('active', !draft.active)}
        >
          {draft.active ? '有効' : '無効'}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          onClick={save}
          disabled={!dirty}
        >
          保存
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
          onClick={remove}
        >
          削除
        </button>
      </div>

      <input
        className={`${inputCls} w-full`}
        value={draft.description}
        onChange={(e) => update('description', e.target.value)}
        placeholder="説明 (任意)"
      />

      <div className="space-y-2 rounded-lg bg-gray-50 p-3">
        <div className="text-xs font-medium text-gray-600">成果物テンプレート</div>
        {draft.deliverable_templates.length === 0 && (
          <div className="text-xs text-gray-400">テンプレートを追加してください</div>
        )}
        {draft.deliverable_templates.map((t, i) => (
          <TemplateRow
            key={i}
            t={t}
            onChangeDetails={(patch) => updateTemplateDetails(i, patch)}
            onRemove={() => removeTemplate(i)}
          />
        ))}
        <div className="relative">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
            onClick={() => setAddOpen((v) => !v)}
          >
            + テンプレート追加
          </button>
          {addOpen && (
            <div className="absolute left-0 z-10 mt-2 w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
              {(Object.keys(CATEGORY_LABELS) as DeliverableCategory[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => addTemplate(c)}
                  className="block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-gray-100"
                >
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplateRow({
  t,
  onChangeDetails,
  onRemove,
}: {
  t: DeliverableTemplate;
  onChangeDetails: (patch: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  const det = t.details as Record<string, unknown>;
  const inputCls = 'rounded-lg border border-gray-300 px-2 py-1 text-xs';

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-white p-2 text-xs">
      <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5">
        {CATEGORY_LABELS[t.category]}
      </span>
      {(t.category === 'poster' || t.category === 'pop') && (
        <>
          <input
            className={`${inputCls} w-40`}
            placeholder="サイズ(カンマ区切り)"
            value={((det.sizes as string[]) ?? []).join(',')}
            onChange={(e) =>
              onChangeDetails({
                sizes: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
          <select
            className={inputCls}
            value={(det.orientation as string) ?? 'vertical'}
            onChange={(e) => onChangeDetails({ orientation: e.target.value })}
          >
            <option value="vertical">タテ</option>
            <option value="horizontal">ヨコ</option>
            <option value="free">構成次第</option>
            <option value="other">その他</option>
          </select>
          <input
            className={`${inputCls} w-20`}
            type="number"
            placeholder="枚数"
            value={(det.printCount as number | undefined) ?? ''}
            onChange={(e) =>
              onChangeDetails({
                printCount: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
          />
        </>
      )}
      {t.category === 'award' && (
        <input
          className={`${inputCls} w-56`}
          placeholder="作成物(カンマ区切り)"
          value={((det.printMaterials as string[]) ?? []).join(',')}
          onChange={(e) =>
            onChangeDetails({
              printMaterials: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      )}
      {t.category === 'businessCard' && (
        <label className="inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={Boolean(det.lineQr)}
            onChange={(e) => onChangeDetails({ lineQr: e.target.checked })}
          />
          <span>LINE QR</span>
        </label>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-red-600 hover:bg-red-50"
      >
        削除
      </button>
    </div>
  );
}
