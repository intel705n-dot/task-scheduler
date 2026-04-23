'use client';

import Papa from 'papaparse';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DeliverableCategory, Store } from '@/lib/types';
import { CATEGORY_LABELS, DELIVERABLE_STATUS_LABELS, DELIVERABLE_STATUS_COLORS, CATEGORY_COLORS } from '@/lib/types';
import {
  commitMigration,
  downloadCsv,
  failedRowsToCsv,
  type CommitProgress,
  type CommitResult,
} from '@/lib/migration/commit';
import { mapRow, type MigrationRow, type MigrationSource } from '@/lib/migration/mapping';

type Phase = 'upload' | 'preview' | 'done';

export default function ImportClient() {
  const supabase = createClient();
  const [phase, setPhase] = useState<Phase>('upload');
  const [source, setSource] = useState<MigrationSource>('poster_form');
  const [rows, setRows] = useState<MigrationRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [progress, setProgress] = useState<CommitProgress | null>(null);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from('stores')
      .select('*')
      .order('ord')
      .order('id')
      .then(({ data }) => {
        if (data) setStores(data as Store[]);
      });
  }, [supabase]);

  const visibleRows = useMemo(() => {
    if (!showOnlyIssues) return rows;
    return rows.filter((r) => r.status !== 'ok');
  }, [rows, showOnlyIssues]);

  const okCount = rows.filter((r) => r.status === 'ok').length;
  const warnCount = rows.filter((r) => r.status === 'warning').length;
  const errCount = rows.filter((r) => r.status === 'error').length;
  const selectedCount = rows.filter((r) => r.selected).length;

  const reset = () => {
    setPhase('upload');
    setRows([]);
    setFileName('');
    setParseError(null);
    setProgress(null);
    setResult(null);
    setShowOnlyIssues(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    setParseError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        if (res.errors && res.errors.length > 0) {
          setParseError(res.errors.map((e) => e.message).join(', '));
        }
        const mapped = res.data.map((row, i) => mapRow(source, row, i, stores));
        setRows(mapped);
        setPhase('preview');
      },
      error: (err) => setParseError(err.message),
    });
  };

  const patchRow = (index: number, patch: Partial<MigrationRow>) => {
    setRows((prev) => prev.map((r) => (r.index === index ? { ...r, ...patch } : r)));
  };

  const patchMapped = (
    index: number,
    patch: Partial<MigrationRow['mapped']>,
  ) => {
    setRows((prev) =>
      prev.map((r) => (r.index === index ? { ...r, mapped: { ...r.mapped, ...patch } } : r)),
    );
  };

  const patchDeliverable = (
    index: number,
    patch: Partial<MigrationRow['mapped']['deliverables'][number]>,
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.index !== index) return r;
        const dels = r.mapped.deliverables.map((d, i) =>
          i === 0 ? { ...d, ...patch } : d,
        );
        return { ...r, mapped: { ...r.mapped, deliverables: dels } };
      }),
    );
  };

  const toggleAll = (v: boolean) => {
    setRows((prev) =>
      prev.map((r) => (r.status === 'error' ? r : { ...r, selected: v })),
    );
  };

  const doCommit = async () => {
    setCommitting(true);
    setProgress({ total: 0, done: 0 });
    try {
      const res = await commitMigration(supabase, rows, (p) => setProgress(p));
      setResult(res);
      setPhase('done');
    } finally {
      setCommitting(false);
    }
  };

  const exportFailed = () => {
    if (!result || result.failedRows.length === 0) return;
    const csv = failedRowsToCsv(result.failedRows);
    downloadCsv(`tsukuru-failed-${Date.now()}.csv`, csv);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">データ移行</h1>
        <p className="text-xs text-gray-500">
          旧 Google フォーム(名刺用・ポスター/POP用)のCSVを取り込みます。
        </p>
      </div>

      {phase === 'upload' && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <div className="mb-1 block text-sm font-medium text-gray-700">CSVの種類</div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['business_card_form', '名刺フォーム'],
                  ['poster_form', 'ポスター/POPフォーム'],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSource(v)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    source === v
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            CSVを選択
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>

          {parseError && (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-800">
              {parseError}
            </div>
          )}

          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
            <div className="mb-1 font-semibold">取り込みルール</div>
            <ul className="list-disc space-y-0.5 pl-4">
              <li>1行 = 1依頼(成果物1件)に変換します</li>
              <li>
                ポスター/POPフォームは「制作サイズ」列からカテゴリ自動判定:
                A1-B2 → ポスター、はがき/名刺サイズ → POP、封筒/賞状 → award、動画 → other
              </li>
              <li>店舗名の完全一致がない場合は未割当(プレビューで手動選択可)</li>
              <li>元データは legacy_imports に原本保管されます</li>
              <li>取り込まれた依頼ごとに「タスク」が自動生成されます</li>
            </ul>
          </div>
        </div>
      )}

      {phase === 'preview' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
            <div className="text-sm">
              <span className="font-medium">{fileName}</span>{' '}
              <span className="text-gray-500">({rows.length} 行)</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span>OK {okCount}</span>
              <span className="text-amber-700">警告 {warnCount}</span>
              <span className="text-red-700">エラー {errCount}</span>
              <span className="text-gray-500">/ 選択 {selectedCount}</span>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                onClick={() => setShowOnlyIssues((v) => !v)}
              >
                {showOnlyIssues ? '全行表示' : '問題のみ表示'}
              </button>
              <button
                type="button"
                onClick={() => toggleAll(true)}
                className="rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
              >
                全選択
              </button>
              <button
                type="button"
                onClick={() => toggleAll(false)}
                className="rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
              >
                全解除
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                やり直す
              </button>
              <button
                type="button"
                onClick={doCommit}
                disabled={selectedCount === 0 || committing}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {selectedCount} 件を取り込み
              </button>
            </div>
          </div>

          {committing && progress && (
            <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs">
              取り込み中… {progress.done}/{progress.total}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full bg-gray-900 transition-all"
                  style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[960px] text-xs">
              <thead className="border-b border-gray-200 bg-gray-50 uppercase text-gray-500">
                <tr>
                  <th className="px-2 py-2 text-left">#</th>
                  <th className="px-2 py-2 text-left">状態</th>
                  <th className="px-2 py-2 text-left">店舗</th>
                  <th className="px-2 py-2 text-left">依頼者</th>
                  <th className="px-2 py-2 text-left">タイトル</th>
                  <th className="px-2 py-2 text-left">カテゴリ</th>
                  <th className="px-2 py-2 text-left">状態</th>
                  <th className="px-2 py-2 text-left">警告</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleRows.map((r) => (
                  <RowEditor
                    key={r.index}
                    row={r}
                    stores={stores}
                    onToggle={(v) => patchRow(r.index, { selected: v })}
                    onMappedChange={(patch) => patchMapped(r.index, patch)}
                    onDeliverableChange={(patch) => patchDeliverable(r.index, patch)}
                  />
                ))}
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-sm text-gray-400">
                      表示する行がありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {phase === 'done' && result && (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-700">
            <span className="font-bold">取り込み完了</span>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-gray-500">成功</dt>
            <dd>{result.successCount} 件</dd>
            <dt className="text-gray-500">失敗</dt>
            <dd>{result.failedRows.length} 件</dd>
          </dl>
          <div className="flex flex-wrap gap-2">
            {result.failedRows.length > 0 && (
              <button
                type="button"
                onClick={exportFailed}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                失敗行をCSVで出力
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              続けて別のCSVを取り込む
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RowEditor({
  row,
  stores,
  onToggle,
  onMappedChange,
  onDeliverableChange,
}: {
  row: MigrationRow;
  stores: Store[];
  onToggle: (v: boolean) => void;
  onMappedChange: (patch: Partial<MigrationRow['mapped']>) => void;
  onDeliverableChange: (
    patch: Partial<MigrationRow['mapped']['deliverables'][number]>,
  ) => void;
}) {
  const d = row.mapped.deliverables[0];
  return (
    <tr
      className={
        row.status === 'error'
          ? 'bg-red-50/60'
          : row.status === 'warning'
            ? 'bg-amber-50/40'
            : undefined
      }
    >
      <td className="px-2 py-1 align-top">
        <label className="inline-flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={row.selected}
            disabled={row.status === 'error'}
            onChange={(e) => onToggle(e.target.checked)}
          />
          <span className="text-gray-500">{row.index + 1}</span>
        </label>
      </td>
      <td className="px-2 py-1 align-top">
        {row.status === 'ok' && '✓'}
        {row.status === 'warning' && '⚠'}
        {row.status === 'error' && '×'}
      </td>
      <td className="px-2 py-1 align-top">
        <select
          className="rounded-md border border-gray-300 px-1 py-0.5 text-xs"
          value={row.mapped.storeId ?? ''}
          onChange={(e) =>
            onMappedChange({
              storeId: e.target.value === '' ? null : Number(e.target.value),
            })
          }
        >
          <option value="">(未割当)</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1 align-top">
        <input
          className="w-28 rounded-md border border-gray-300 px-1 py-0.5 text-xs"
          value={row.mapped.requesterName}
          onChange={(e) => onMappedChange({ requesterName: e.target.value })}
        />
      </td>
      <td className="px-2 py-1 align-top">
        <input
          className="w-64 rounded-md border border-gray-300 px-1 py-0.5 text-xs"
          value={row.mapped.title}
          onChange={(e) => onMappedChange({ title: e.target.value })}
        />
      </td>
      <td className="px-2 py-1 align-top">
        {d && (
          <select
            className={`rounded-md border px-1 py-0.5 text-xs ${CATEGORY_COLORS[d.category]}`}
            value={d.category}
            onChange={(e) =>
              onDeliverableChange({ category: e.target.value as DeliverableCategory })
            }
          >
            {(Object.keys(CATEGORY_LABELS) as DeliverableCategory[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        )}
      </td>
      <td className="px-2 py-1 align-top">
        {d && (
          <span
            className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium ${DELIVERABLE_STATUS_COLORS[d.status]}`}
          >
            {DELIVERABLE_STATUS_LABELS[d.status]}
          </span>
        )}
      </td>
      <td className="px-2 py-1 align-top text-amber-700">
        {row.error && <div className="text-red-700">{row.error}</div>}
        {row.warnings.length > 0 && (
          <ul className="list-disc pl-3 text-[11px]">
            {row.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        )}
      </td>
    </tr>
  );
}
