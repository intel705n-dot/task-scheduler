import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { fetchRequestsByToken } from '@/lib/requests';
import { CATEGORY_LABELS, DELIVERABLE_STATUS_LABELS, REQUEST_STATUS_LABELS, CATEGORY_COLORS, DELIVERABLE_STATUS_COLORS } from '@/lib/types';
import { fmtDateFull } from '@/lib/request-utils';

export const dynamic = 'force-dynamic';

type Params = Promise<{ token: string }>;

export default async function MyRequestsPage({ params }: { params: Params }) {
  const { token } = await params;
  const supabase = await createClient();
  const requests = await fetchRequestsByToken(supabase, token).catch(() => []);

  return (
    <main className="mx-auto max-w-3xl px-3 py-5 sm:px-4 sm:py-8">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">あなたの依頼</h1>
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
        >
          ← トップへ
        </Link>
      </div>
      <p className="text-xs text-gray-500">
        このリンク(トークン)を知っている人だけが閲覧できます。
      </p>

      <div className="mt-6 space-y-3">
        {requests.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
            この端末からの依頼は見つかりませんでした。
          </div>
        )}
        {requests.map((r) => (
          <Link
            key={r.id}
            href={`/request/${r.id}?token=${encodeURIComponent(token)}`}
            className="block rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:border-gray-900 hover:shadow sm:p-4"
          >
            <div className="flex items-center gap-2">
              {r.stores && (
                <span
                  className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: `${r.stores.color}20`,
                    color: r.stores.color,
                    borderColor: `${r.stores.color}50`,
                  }}
                >
                  {r.stores.name}
                </span>
              )}
              <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                {REQUEST_STATUS_LABELS[r.status]}
              </span>
              <span className="ml-auto text-xs text-gray-500">
                {fmtDateFull(r.created_at)} 送信
              </span>
            </div>
            <div className="mt-1.5 font-semibold">{r.title}</div>
            <ul className="mt-2 space-y-0.5 text-xs text-gray-600">
              {(r.deliverables ?? []).map((d) => (
                <li key={d.id} className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium ${CATEGORY_COLORS[d.category]}`}
                  >
                    {CATEGORY_LABELS[d.category]}
                  </span>
                  <span
                    className={`ml-auto inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium ${DELIVERABLE_STATUS_COLORS[d.status]}`}
                  >
                    {DELIVERABLE_STATUS_LABELS[d.status]}
                  </span>
                </li>
              ))}
            </ul>
            {r.due_date && (
              <div className="mt-2 text-xs text-gray-500">
                納品希望: {fmtDateFull(r.due_date)}
              </div>
            )}
          </Link>
        ))}
      </div>
    </main>
  );
}
