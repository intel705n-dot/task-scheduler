'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getAdjacentPages } from '@/lib/page-nav';

// メインコンテンツの左右端に配置する前/次ページ切替ボタン。
// カレンダーを中心に進捗 ← プリセット ← 店舗マスタ ← カレンダー → アカウント → データ移行 と
// 両端は循環 (進捗 ⇔ データ移行) で移動できる。
export default function PageSwitchArrows() {
  const pathname = usePathname();
  const router = useRouter();
  const { prev, next } = getAdjacentPages(pathname);

  // page-nav に含まれない (たとえば /requests/:id などの詳細) では何も描画しない
  if (!prev || !next) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => router.push(prev.href)}
        className="group fixed left-1 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-1 rounded-full bg-white/90 p-2 shadow-md backdrop-blur transition-all hover:bg-indigo-50 hover:text-indigo-700 lg:flex"
        aria-label={`前のページ: ${prev.label}`}
        title={`← ${prev.label}`}
      >
        <ChevronLeft className="h-5 w-5 text-gray-600 group-hover:text-indigo-700" />
        <span className="text-[10px] font-medium text-gray-600 group-hover:text-indigo-700 [writing-mode:vertical-rl]">
          {prev.label}
        </span>
      </button>
      <button
        type="button"
        onClick={() => router.push(next.href)}
        className="group fixed right-1 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-1 rounded-full bg-white/90 p-2 shadow-md backdrop-blur transition-all hover:bg-indigo-50 hover:text-indigo-700 lg:flex"
        aria-label={`次のページ: ${next.label}`}
        title={`${next.label} →`}
      >
        <ChevronRight className="h-5 w-5 text-gray-600 group-hover:text-indigo-700" />
        <span className="text-[10px] font-medium text-gray-600 group-hover:text-indigo-700 [writing-mode:vertical-rl]">
          {next.label}
        </span>
      </button>
    </>
  );
}
