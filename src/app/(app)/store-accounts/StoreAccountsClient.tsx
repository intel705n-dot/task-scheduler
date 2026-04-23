'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Store } from '@/lib/types';
import { Trash2, Save, Plus } from 'lucide-react';

type StoreAccount = {
  email: string;
  store_id: number;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export default function StoreAccountsClient() {
  const supabase = createClient();
  const [accounts, setAccounts] = useState<StoreAccount[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  const [newEmail, setNewEmail] = useState('');
  const [newStoreId, setNewStoreId] = useState<number | ''>('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [sa, ss] = await Promise.all([
      supabase.from('store_accounts').select('*').order('created_at'),
      supabase.from('stores').select('*').order('ord').order('id'),
    ]);
    if (sa.data) setAccounts(sa.data as StoreAccount[]);
    if (ss.data) setStores(ss.data as Store[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = async () => {
    if (!newEmail.trim() || newStoreId === '') {
      setMsg('メールと店舗を指定してください');
      return;
    }
    setAdding(true);
    setMsg(null);
    const { error } = await supabase.from('store_accounts').upsert({
      email: newEmail.toLowerCase().trim(),
      store_id: Number(newStoreId),
      display_name: newDisplayName.trim() || null,
    });
    setAdding(false);
    if (error) {
      setMsg(`追加失敗: ${error.message}`);
      return;
    }
    setNewEmail('');
    setNewStoreId('');
    setNewDisplayName('');
    setMsg('登録しました。Supabase Auth 側でも同じメールのユーザー作成とパスワード設定を忘れずに。');
    refresh();
  };

  const remove = async (email: string) => {
    if (!confirm(`店舗アカウント "${email}" を削除しますか?`)) return;
    await supabase.from('store_accounts').delete().eq('email', email);
    refresh();
  };

  const updateStore = async (email: string, storeId: number) => {
    await supabase.from('store_accounts').update({ store_id: storeId }).eq('email', email);
    refresh();
  };

  const updateDisplayName = async (email: string, displayName: string) => {
    await supabase
      .from('store_accounts')
      .update({ display_name: displayName || null })
      .eq('email', email);
  };

  if (loading) {
    return <div className="text-sm text-gray-500">読み込み中…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">店舗アカウント管理</h1>
        <p className="mt-1 text-xs text-gray-500">
          店舗ごとに発行するログインアカウント。ここに登録したメールアドレスで
          パスワードログインすると、その店舗宛ての依頼だけが閲覧できます。
          <br />
          <strong className="text-gray-700">
            Supabase Auth 側でも同じメールのユーザー作成 + パスワード設定が別途必要。
          </strong>
        </p>
      </div>

      {/* 新規追加 */}
      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Plus className="h-4 w-4" /> 新規店舗アカウント
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto]">
          <input
            type="email"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="example@gmail.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={newStoreId}
            onChange={(e) =>
              setNewStoreId(e.target.value === '' ? '' : Number(e.target.value))
            }
          >
            <option value="">店舗選択</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="表示名 (任意)"
            value={newDisplayName}
            onChange={(e) => setNewDisplayName(e.target.value)}
          />
          <button
            type="button"
            onClick={add}
            disabled={adding}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            追加
          </button>
        </div>
        {msg && (
          <div
            className={`text-xs ${msg.includes('失敗') ? 'text-red-600' : 'text-emerald-700'}`}
          >
            {msg}
          </div>
        )}
      </section>

      {/* 一覧 */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">メール</th>
              <th className="px-3 py-2 text-left">店舗</th>
              <th className="px-3 py-2 text-left">表示名</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {accounts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-sm text-gray-400">
                  店舗アカウントは未登録
                </td>
              </tr>
            )}
            {accounts.map((a) => (
              <tr key={a.email}>
                <td className="px-3 py-2 font-mono text-xs">{a.email}</td>
                <td className="px-3 py-2">
                  <select
                    value={a.store_id}
                    onChange={(e) => updateStore(a.email, Number(e.target.value))}
                    className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <EditableName
                    value={a.display_name ?? ''}
                    onSave={(v) => updateDisplayName(a.email, v)}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => remove(a.email)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <strong>手順まとめ</strong>:
        <ol className="mt-1 list-decimal space-y-1 pl-4">
          <li>上のフォームでメール + 店舗 を登録</li>
          <li>
            <a
              href="https://supabase.com/dashboard/project/nepslbltrifujcdxffnh/auth/users"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Supabase Auth
            </a>{' '}
            → Add user → Create new user で、同じメールと店舗用パスワードを入力
            (Auto Confirm を ON)
          </li>
          <li>
            店舗スタッフに TSUKURU トップURL + ログイン情報 (メール/パスワード)
            を伝える
          </li>
        </ol>
      </section>
    </div>
  );
}

function EditableName({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    setDraft(value);
    setDirty(false);
  }, [value]);
  return (
    <div className="flex items-center gap-1">
      <input
        className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setDirty(true);
        }}
        placeholder="(任意)"
      />
      {dirty && (
        <button
          type="button"
          onClick={() => {
            onSave(draft);
            setDirty(false);
          }}
          className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
        >
          <Save className="h-3.5 w-3.5" />
          保存
        </button>
      )}
    </div>
  );
}
