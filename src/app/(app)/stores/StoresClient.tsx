'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Store } from '@/lib/types';

export default function StoresClient() {
  const supabase = createClient();
  const [stores, setStores] = useState<Store[]>([]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('stores').select('*').order('id');
    if (data) setStores(data as Store[]);
  }, [supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addStore = async () => {
    const name = prompt('新しい店舗名');
    if (!name) return;
    await supabase.from('stores').insert({ name, color: '#9ca3af' });
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">店舗マスタ</h1>
          <p className="text-xs text-gray-500">
            色はカラーピッカーで選択。変更は保存ボタンで反映されます。
          </p>
        </div>
        <button
          type="button"
          onClick={addStore}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + 新規店舗
        </button>
      </div>

      <div className="space-y-2">
        {stores.map((s) => (
          <StoreRow key={s.id} store={s} onChanged={refresh} />
        ))}
      </div>
    </div>
  );
}

function StoreRow({ store, onChanged }: { store: Store; onChanged: () => void }) {
  const supabase = createClient();
  const [draft, setDraft] = useState(store);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(store);
    setDirty(false);
  }, [store]);

  const save = async () => {
    await supabase
      .from('stores')
      .update({ name: draft.name, color: draft.color })
      .eq('id', draft.id);
    setDirty(false);
    onChanged();
  };

  const remove = async () => {
    if (!confirm(`店舗「${draft.name}」を削除しますか?`)) return;
    await supabase.from('stores').delete().eq('id', draft.id);
    onChanged();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <input
        type="color"
        value={draft.color || '#9ca3af'}
        onChange={(e) => {
          setDraft({ ...draft, color: e.target.value });
          setDirty(true);
        }}
        className="h-9 w-9 cursor-pointer rounded border border-gray-300 p-0.5"
        title="カラーピッカー"
      />
      <input
        className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        value={draft.name}
        onChange={(e) => {
          setDraft({ ...draft, name: e.target.value });
          setDirty(true);
        }}
      />
      <input
        className="w-28 rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs"
        value={draft.color}
        onChange={(e) => {
          setDraft({ ...draft, color: e.target.value });
          setDirty(true);
        }}
      />
      <button
        type="button"
        onClick={save}
        disabled={!dirty}
        className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        保存
      </button>
      <button
        type="button"
        onClick={remove}
        className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
      >
        削除
      </button>
    </div>
  );
}
