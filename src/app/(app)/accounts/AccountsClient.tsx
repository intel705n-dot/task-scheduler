'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Store } from '@/lib/types';
import { Trash2, Save, Plus, UserPlus, Store as StoreIcon, User } from 'lucide-react';

type StoreAccount = {
  email: string;
  store_id: number;
  display_name: string | null;
};

export default function AccountsClient() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
  const [storeAccounts, setStoreAccounts] = useState<StoreAccount[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(
    null,
  );
  const [addModal, setAddModal] = useState<'admin' | 'store' | null>(null);

  const refresh = useCallback(async () => {
    const [p, a, sa, s] = await Promise.all([
      supabase.from('profiles').select('*').order('email'),
      supabase.from('allowed_emails').select('email'),
      supabase.from('store_accounts').select('*').order('created_at'),
      supabase.from('stores').select('*').order('ord').order('id'),
    ]);
    if (p.data) setProfiles(p.data as Profile[]);
    if (a.data) setAllowedEmails(a.data.map((r) => r.email));
    if (sa.data) setStoreAccounts(sa.data as StoreAccount[]);
    if (s.data) setStores(s.data as Store[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const { admins, storeList, personals } = useMemo(() => {
    const allowedSet = new Set(allowedEmails);
    const storeEmailSet = new Set(storeAccounts.map((s) => s.email));
    const byEmail = new Map(profiles.map((p) => [p.email, p] as const));
    const admins = profiles.filter((p) => allowedSet.has(p.email));
    const storeList = storeAccounts.map((sa) => ({
      ...sa,
      profile: byEmail.get(sa.email) ?? null,
      store: stores.find((s) => s.id === sa.store_id) ?? null,
    }));
    const personals = profiles.filter(
      (p) => !allowedSet.has(p.email) && !storeEmailSet.has(p.email),
    );
    return { admins, storeList, personals };
  }, [profiles, allowedEmails, storeAccounts, stores]);

  const flash = (kind: 'ok' | 'err', text: string) => {
    setMsg({ kind, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleCreate = async (body: {
    role: 'admin' | 'store';
    email: string;
    password: string;
    storeId?: number;
    displayName?: string;
  }) => {
    const r = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) {
      flash('err', data.error ?? '作成失敗');
      return false;
    }
    flash('ok', '作成しました');
    refresh();
    return true;
  };

  const handleDelete = async (email: string, role: 'admin' | 'store') => {
    if (!confirm(`${email} を削除しますか? ログイン不可になります。`)) return;
    const r = await fetch('/api/accounts', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    const data = await r.json();
    if (!r.ok) {
      flash('err', data.error ?? '削除失敗');
      return;
    }
    flash('ok', '削除しました');
    refresh();
  };

  const handleRenameProfile = async (userId: string, displayName: string) => {
    const r = await fetch('/api/accounts', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId, displayName }),
    });
    const data = await r.json();
    if (!r.ok) {
      flash('err', data.error ?? '更新失敗');
      return;
    }
    flash('ok', '表示名を更新');
    refresh();
  };

  const handleResetPassword = async (userId: string) => {
    const pw = window.prompt('新しいパスワード (6文字以上)');
    if (!pw) return;
    if (pw.length < 6) {
      flash('err', 'パスワードは 6 文字以上');
      return;
    }
    const r = await fetch('/api/accounts', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId, password: pw }),
    });
    const data = await r.json();
    if (!r.ok) {
      flash('err', data.error ?? 'パスワード更新失敗');
      return;
    }
    flash('ok', 'パスワードを更新');
  };

  const handleStoreUpdate = async (
    email: string,
    patch: { store_id?: number; display_name?: string | null },
  ) => {
    const { error } = await supabase
      .from('store_accounts')
      .update(patch)
      .eq('email', email);
    if (error) {
      flash('err', error.message);
      return;
    }
    refresh();
  };

  if (loading) {
    return <div className="text-sm text-gray-500">読み込み中…</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">アカウント管理</h1>
        <p className="mt-1 text-xs text-gray-500">
          管理者・店舗・個人の 3 つのレベルでログインアカウントを管理します。
        </p>
      </div>

      {msg && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            msg.kind === 'ok'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* 管理者 */}
      <Section
        title="管理者"
        description="すべてのページにアクセス可"
        icon={<UserPlus className="h-4 w-4" />}
        onAdd={() => setAddModal('admin')}
      >
        {admins.length === 0 ? (
          <Empty label="管理者が未登録" />
        ) : (
          <AccountTable>
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500">
                <th className="px-3 py-2 text-left">名前</th>
                <th className="px-3 py-2 text-left">メール</th>
                <th className="px-3 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {admins.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2">
                    <EditableName
                      value={p.display_name}
                      color={p.color}
                      onSave={(v) => handleRenameProfile(p.id, v)}
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-700">
                    {p.email}
                  </td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => handleResetPassword(p.id)}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      パスワード再設定
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.email, 'admin')}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </AccountTable>
        )}
      </Section>

      {/* 店舗 */}
      <Section
        title="店舗"
        description="店舗の依頼一覧全てを確認できます"
        icon={<StoreIcon className="h-4 w-4" />}
        onAdd={() => setAddModal('store')}
      >
        {storeList.length === 0 ? (
          <Empty label="店舗アカウントが未登録" />
        ) : (
          <AccountTable>
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500">
                <th className="px-3 py-2 text-left">店舗</th>
                <th className="px-3 py-2 text-left">メール</th>
                <th className="px-3 py-2 text-left">表示名</th>
                <th className="px-3 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {storeList.map((s) => (
                <tr key={s.email}>
                  <td className="px-3 py-2">
                    <select
                      value={s.store_id}
                      onChange={(e) =>
                        handleStoreUpdate(s.email, {
                          store_id: Number(e.target.value),
                        })
                      }
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                    >
                      {stores.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-700">
                    {s.email}
                  </td>
                  <td className="px-3 py-2">
                    <EditableName
                      value={s.display_name ?? ''}
                      onSave={(v) =>
                        handleStoreUpdate(s.email, { display_name: v || null })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-right space-x-2">
                    {s.profile && (
                      <button
                        type="button"
                        onClick={() => handleResetPassword(s.profile!.id)}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        パスワード再設定
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(s.email, 'store')}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </AccountTable>
        )}
      </Section>

      {/* 個人 */}
      <Section
        title="個人"
        description="ログインした場合、その人の依頼のみ確認できます"
        icon={<User className="h-4 w-4" />}
      >
        {personals.length === 0 ? (
          <Empty label="個人ログインユーザーは未登録" />
        ) : (
          <AccountTable>
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500">
                <th className="px-3 py-2 text-left">名前</th>
                <th className="px-3 py-2 text-left">メール</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {personals.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2">
                    <EditableName
                      value={p.display_name}
                      color={p.color}
                      onSave={(v) => handleRenameProfile(p.id, v)}
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-700">
                    {p.email}
                  </td>
                </tr>
              ))}
            </tbody>
          </AccountTable>
        )}
      </Section>

      {/* 追加モーダル */}
      {addModal === 'admin' && (
        <AddAdminModal
          onClose={() => setAddModal(null)}
          onCreate={async (email, password) => {
            const ok = await handleCreate({ role: 'admin', email, password });
            if (ok) setAddModal(null);
          }}
        />
      )}
      {addModal === 'store' && (
        <AddStoreModal
          stores={stores}
          onClose={() => setAddModal(null)}
          onCreate={async (email, password, storeId, displayName) => {
            const ok = await handleCreate({
              role: 'store',
              email,
              password,
              storeId,
              displayName,
            });
            if (ok) setAddModal(null);
          }}
        />
      )}
    </div>
  );
}

function Section({
  title,
  description,
  icon,
  onAdd,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onAdd?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-800">
            {icon}
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        </div>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-3.5 w-3.5" />
            追加する
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-8 text-center text-xs text-gray-400">
      {label}
    </div>
  );
}

function AccountTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

function EditableName({
  value,
  color,
  onSave,
}: {
  value: string;
  color?: string;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    setDraft(value);
    setDirty(false);
  }, [value]);
  return (
    <div className="flex items-center gap-1.5">
      {color && (
        <span
          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      <input
        className="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setDirty(true);
        }}
        placeholder="表示名"
      />
      {dirty && (
        <button
          type="button"
          onClick={() => {
            onSave(draft.trim());
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

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AddAdminModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    try {
      await onCreate(email, password);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Modal title="管理者を追加" onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="text-xs text-gray-500">メールアドレス</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-gray-500">パスワード (6文字以上)</span>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="初期パスワード"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !email || password.length < 6}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? '作成中…' : '登録'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AddStoreModal({
  stores,
  onClose,
  onCreate,
}: {
  stores: Store[];
  onClose: () => void;
  onCreate: (
    email: string,
    password: string,
    storeId: number,
    displayName?: string,
  ) => Promise<void>;
}) {
  const [storeId, setStoreId] = useState<number | ''>(stores[0]?.id ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (storeId === '') return;
    setSubmitting(true);
    try {
      await onCreate(email, password, Number(storeId), displayName || undefined);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Modal title="店舗アカウントを追加" onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="text-xs text-gray-500">店舗</span>
          <select
            value={storeId}
            onChange={(e) =>
              setStoreId(e.target.value === '' ? '' : Number(e.target.value))
            }
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">店舗を選択</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs text-gray-500">メールアドレス</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="store@example.com"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-gray-500">パスワード (6文字以上)</span>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="初期パスワード"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-gray-500">表示名 (任意)</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="蘭○ など"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !email || password.length < 6 || storeId === ''}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? '作成中…' : '登録'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
