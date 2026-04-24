'use client';

import { useCallback, useEffect, useState } from 'react';

// TaskPanel (/calendar 左カラム) と ProgressClient (/progress) で
// 担当者・店舗の絞り込みを同期させるための共有状態。
// 仕組み: localStorage に保存 + CustomEvent で同タブ内の他コンポーネントに通知 +
//         'storage' イベントで別タブにも反映。

export type SharedFilters = {
  assigneeId: string | 'all' | 'unassigned';
  storeId: number | 'all';
};

const DEFAULTS: SharedFilters = {
  assigneeId: 'all',
  storeId: 'all',
};

const KEY = 'tsukuru:shared-filters';
const EVENT = 'tsukuru:shared-filters-changed';

function load(): SharedFilters {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<SharedFilters>;
    return {
      assigneeId: parsed.assigneeId ?? DEFAULTS.assigneeId,
      storeId: parsed.storeId ?? DEFAULTS.storeId,
    };
  } catch {
    return DEFAULTS;
  }
}

function save(state: SharedFilters) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useSharedFilters(): [
  SharedFilters,
  (patch: Partial<SharedFilters>) => void,
] {
  const [state, setState] = useState<SharedFilters>(DEFAULTS);

  useEffect(() => {
    // 初期読み込み
    setState(load());
    const onChange = () => setState(load());
    window.addEventListener('storage', onChange);
    window.addEventListener(EVENT, onChange);
    return () => {
      window.removeEventListener('storage', onChange);
      window.removeEventListener(EVENT, onChange);
    };
  }, []);

  const update = useCallback((patch: Partial<SharedFilters>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);

  return [state, update];
}
