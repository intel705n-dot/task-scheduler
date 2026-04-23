import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { fetchRequestByToken } from '@/lib/requests';
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  DELIVERABLE_STATUS_COLORS,
  DELIVERABLE_STATUS_LABELS,
  REQUEST_STATUS_LABELS,
} from '@/lib/types';
import { deliverableSummary, fmtDateFull } from '@/lib/request-utils';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;
type Search = Promise<{ token?: string; submitted?: string }>;

export default async function RequestStatusPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { id } = await params;
  const { token, submitted } = await searchParams;
  const supabase = await createClient();
  const r = token
    ? await fetchRequestByToken(supabase, id, token).catch(() => null)
    : null;

  return (
    <main className="mx-auto max-w-2xl px-3 py-5 sm:px-4 sm:py-8">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">依頼の状況</h1>
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
        >
          ← トップへ
        </Link>
      </div>

      {submitted && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
          <div>
            <div className="font-medium">依頼を送信しました</div>
            <div className="text-xs">
              このページをブックマークすると進捗を確認できます。
            </div>
          </div>
        </div>
      )}

      {!r ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
          依頼が見つかりません。URL が正しいか確認してください。
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
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
          <h2 className="text-xl font-bold">{r.title}</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{r.content}</p>
          <div className="grid gap-1 text-xs text-gray-600 sm:grid-cols-3">
            <div>
              <span className="text-gray-400">依頼者:</span> {r.requester_name}
            </div>
            <div>
              <span className="text-gray-400">使用期間:</span> {r.usage_period || '—'}
            </div>
            <div>
              <span className="text-gray-400">納品希望:</span> {fmtDateFull(r.due_date)}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">成果物</h3>
            <ul className="space-y-1.5">
              {(r.deliverables ?? []).map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
                >
                  <span
                    className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium ${CATEGORY_COLORS[d.category]}`}
                  >
                    {CATEGORY_LABELS[d.category]}
                  </span>
                  <span className="flex-1 truncate text-gray-700">
                    {deliverableSummary(d)}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium ${DELIVERABLE_STATUS_COLORS[d.status]}`}
                  >
                    {DELIVERABLE_STATUS_LABELS[d.status]}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {(r.attachments ?? []).length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">添付ファイル</h3>
              <ul className="space-y-1">
                {r.attachments.map((a, i) => (
                  <li key={i} className="text-sm">
                    <a
                      href={a.downloadUrl.replace(/([?&])dl=1/, '$1dl=0')}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sky-700 underline-offset-4 hover:underline"
                    >
                      {a.name}
                    </a>
                    <span className="ml-2 text-xs text-gray-400">
                      {a.sizeBytes >= 1024 * 1024
                        ? `${(a.sizeBytes / 1024 / 1024).toFixed(1)} MB`
                        : `${Math.max(1, Math.round(a.sizeBytes / 1024))} KB`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
