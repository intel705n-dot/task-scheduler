import type { SupabaseClient } from '@supabase/supabase-js';
import { generatePublicToken } from '../request-utils';
import type { MigrationRow } from './mapping';

export type CommitResult = {
  successCount: number;
  failedRows: MigrationRow[];
};

export type CommitProgress = {
  total: number;
  done: number;
};

export async function commitMigration(
  supabase: SupabaseClient,
  rows: MigrationRow[],
  onProgress?: (p: CommitProgress) => void,
): Promise<CommitResult> {
  const selected = rows.filter((r) => r.selected && r.status !== 'error');
  const result: CommitResult = { successCount: 0, failedRows: [] };
  const total = selected.length;
  onProgress?.({ total, done: 0 });

  for (let i = 0; i < selected.length; i++) {
    const row = selected[i];
    try {
      const publicToken = generatePublicToken();
      const completedAt =
        row.mapped.deliverables.every((d) => d.status === 'completed')
          ? new Date().toISOString()
          : null;
      const allCancelled =
        row.mapped.deliverables.length > 0 &&
        row.mapped.deliverables.every((d) => d.status === 'cancelled');

      const status = allCancelled
        ? 'cancelled'
        : completedAt
          ? 'completed'
          : row.mapped.deliverables.some(
                (d) => d.status === 'inProgress' || d.status === 'reviewing',
              )
            ? 'inProgress'
            : 'pending';

      const { data: inserted, error } = await supabase
        .from('requests')
        .insert({
          store_id: row.mapped.storeId,
          requester_name: row.mapped.requesterName,
          title: row.mapped.title,
          content: row.mapped.content,
          usage_period: row.mapped.usagePeriod ?? null,
          due_date: row.mapped.dueDate,
          reference_urls: row.mapped.referenceUrls,
          attachments: [],
          deliverables: row.mapped.deliverables,
          status,
          priority: row.mapped.priority,
          public_token: publicToken,
          completed_at: completedAt,
          legacy_id: row.mapped.legacyId,
        })
        .select('id')
        .single();
      if (error) throw error;

      // audit: legacy_imports
      await supabase.from('legacy_imports').insert({
        source: row.source,
        original_row: row.originalRow,
        migrated_request_id: inserted.id,
      });

      result.successCount++;
    } catch (e) {
      result.failedRows.push({
        ...row,
        status: 'error',
        error: (e as Error).message,
      });
    }
    onProgress?.({ total, done: i + 1 });
  }

  return result;
}

export function failedRowsToCsv(rows: MigrationRow[]): string {
  if (rows.length === 0) return '';
  const headers = new Set<string>();
  for (const r of rows) Object.keys(r.originalRow).forEach((k) => headers.add(k));
  headers.add('__error');
  const headerArr = Array.from(headers);
  const escape = (v: string) => {
    const s = v ?? '';
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = [headerArr.map(escape).join(',')];
  for (const r of rows) {
    const row = headerArr.map((h) => {
      if (h === '__error') return escape(r.error ?? '');
      return escape(r.originalRow[h] ?? '');
    });
    lines.push(row.join(','));
  }
  return lines.join('\n');
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
