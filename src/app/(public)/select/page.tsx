import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { fetchPresets } from '@/lib/requests';
import { CATEGORY_LABELS } from '@/lib/types';
import MyRequestsShortcut from '../_components/MyRequestsShortcut';

export const dynamic = 'force-dynamic';

export default async function PresetSelectPage() {
  const supabase = await createClient();
  let presets = [] as Awaited<ReturnType<typeof fetchPresets>>;
  try {
    presets = await fetchPresets(supabase);
  } catch (e) {
    console.error('fetchPresets failed', e);
  }

  return (
    <main className="mx-auto max-w-5xl px-3 py-6 sm:px-4 sm:py-10">
      <section className="mb-6 text-center sm:mb-8">
        <h1 className="text-2xl font-bold sm:text-3xl">何を作りますか?</h1>
        <p className="mt-2 text-sm text-gray-600">
          作りたいセットを選んで、内容を入力してください。
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {presets.map((p) => (
          <Link
            key={p.id}
            href={`/new?preset=${encodeURIComponent(p.id)}`}
            className="group flex h-full flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-900 hover:shadow"
          >
            <div>
              <div className="text-xs font-medium text-gray-500">プリセット</div>
              <h2 className="mt-1 text-lg font-bold">{p.name}</h2>
              {p.description && (
                <p className="mt-1 text-xs text-gray-600">{p.description}</p>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              {(p.deliverable_templates ?? []).map((t, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                >
                  {CATEGORY_LABELS[t.category] ?? t.category}
                </span>
              ))}
              <span className="ml-auto text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-gray-900">
                →
              </span>
            </div>
          </Link>
        ))}
        <Link
          href="/new"
          className="group flex h-full flex-col justify-between rounded-xl border border-dashed border-gray-300 bg-white p-4 shadow-sm transition hover:border-gray-900 hover:shadow"
        >
          <div>
            <div className="text-xs font-medium text-gray-500">白紙から</div>
            <h2 className="mt-1 text-lg font-bold">カスタム</h2>
            <p className="mt-1 text-xs text-gray-600">自由に成果物を組み合わせる</p>
          </div>
          <div className="mt-4 ml-auto text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-gray-900">
            →
          </div>
        </Link>
      </div>

      <MyRequestsShortcut />
    </main>
  );
}
