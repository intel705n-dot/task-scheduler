// ヘッダーの主要ナビ順序 + メインコンテンツ左右の切替ボタン用。
// 真ん中 (index 3) が デフォルトの カレンダー。

export type PageNavItem = {
  href: string;
  label: string;
  // 現在のパスがこのページに属するか
  matcher: (pathname: string | null) => boolean;
};

export const PAGE_NAV: PageNavItem[] = [
  {
    href: '/presets',
    label: 'プリセット',
    matcher: (p) => Boolean(p && p.startsWith('/presets')),
  },
  {
    href: '/accounts',
    label: 'アカウント',
    matcher: (p) =>
      Boolean(p && (p.startsWith('/accounts') || p.startsWith('/store-accounts'))),
  },
  {
    href: '/progress',
    label: '進捗',
    matcher: (p) =>
      Boolean(p && (p.startsWith('/progress') || p.startsWith('/requests'))),
  },
  {
    href: '/calendar',
    label: 'カレンダー',
    matcher: (p) => Boolean(p && p.startsWith('/calendar')),
  },
  {
    href: '/stores',
    label: '店舗マスタ',
    matcher: (p) => Boolean(p && p.startsWith('/stores')),
  },
  {
    href: '/import',
    label: 'データ移行',
    matcher: (p) => Boolean(p && p.startsWith('/import')),
  },
];

export function getCurrentPageIndex(pathname: string | null): number {
  return PAGE_NAV.findIndex((p) => p.matcher(pathname));
}

// 左右の隣接ページ (端で循環)
export function getAdjacentPages(pathname: string | null): {
  prev: PageNavItem | null;
  next: PageNavItem | null;
} {
  const idx = getCurrentPageIndex(pathname);
  if (idx < 0) return { prev: null, next: null };
  const len = PAGE_NAV.length;
  return {
    prev: PAGE_NAV[(idx - 1 + len) % len],
    next: PAGE_NAV[(idx + 1) % len],
  };
}
