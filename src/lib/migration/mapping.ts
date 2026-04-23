import type {
  AwardDetails,
  BusinessCardDetails,
  Deliverable,
  DeliverableCategory,
  DeliverableStatus,
  OtherDetails,
  PosterPopDetails,
  Store,
} from '../types';
import { generateDeliverableId } from '../request-utils';

export type MigrationSource = 'business_card_form' | 'poster_form';

export type MappedRequest = {
  storeId: number | null;
  storeNameGuess: string;
  requesterName: string;
  title: string;
  content: string;
  usagePeriod?: string;
  dueDate: string | null;
  referenceUrls: string[];
  deliverables: Deliverable[];
  assigneeGuess?: string;
  priority: 'normal';
  legacyId: string;
};

export type RowStatus = 'ok' | 'warning' | 'error';

export type MigrationRow = {
  index: number;
  source: MigrationSource;
  originalRow: Record<string, string>;
  mapped: MappedRequest;
  warnings: string[];
  error?: string;
  status: RowStatus;
  selected: boolean;
};

function pick(row: Record<string, string>, candidates: string[]): string {
  for (const c of candidates) {
    const v = row[c];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  for (const key of Object.keys(row)) {
    const normalized = key.replace(/\s+/g, '');
    for (const c of candidates) {
      if (normalized === c.replace(/\s+/g, '')) {
        const v = row[key];
        if (v != null && String(v).trim() !== '') return String(v).trim();
      }
    }
  }
  return '';
}

function toBool(v: string): boolean {
  const s = v.trim().toLowerCase();
  return (
    s === 'true' ||
    s === 'yes' ||
    s === '1' ||
    s === '希望' ||
    s === 'あり' ||
    s === '有' ||
    s === '✓' ||
    s === '○' ||
    s === '◯'
  );
}

function normalizeStatus(v: string): DeliverableStatus {
  const s = v.trim().toLowerCase();
  if (!s) return 'pending';
  if (s.includes('完了') || s === 'done' || s === 'completed' || s === '済') return 'completed';
  if (s.includes('確認')) return 'reviewing';
  if (s.includes('進行') || s.includes('作業') || s === 'in progress') return 'inProgress';
  if (s.includes('キャンセル') || s === 'cancelled' || s === '中止') return 'cancelled';
  return 'pending';
}

function resolveStoreId(v: string, stores: Store[]): number | null {
  const s = v.trim();
  if (!s) return null;
  // Loose match: existing store.name substring
  for (const st of stores) {
    if (s.includes(st.name) || st.name.includes(s)) return st.id;
  }
  return null;
}

function normalizeOrientation(v: string): PosterPopDetails['orientation'] {
  const s = v.trim();
  if (!s) return 'free';
  if (s.includes('タテ') || s.includes('縦') || /vertical/i.test(s)) return 'vertical';
  if (s.includes('ヨコ') || s.includes('横') || /horizontal/i.test(s)) return 'horizontal';
  if (s.includes('構成')) return 'free';
  return 'other';
}

function splitSizes(v: string): string[] {
  if (!v) return [];
  return v
    .split(/[,、・\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractUrls(v: string): string[] {
  if (!v) return [];
  const urls: string[] = [];
  const re = /https?:\/\/[^\s,、]+/g;
  let m;
  while ((m = re.exec(v)) !== null) urls.push(m[0]);
  return urls;
}

function detectCategory(sizeField: string): DeliverableCategory {
  const s = sizeField.trim();
  if (!s) return 'other';
  if (/はがき/.test(s) || /名刺サイズ/.test(s)) return 'pop';
  if (/\bA[0-3]\b|\bB[0-2]\b/i.test(s)) return 'poster';
  if (/封筒|賞状|表彰状/.test(s)) return 'award';
  if (/動画/.test(s)) return 'other';
  return 'other';
}

export function mapBusinessCardRow(
  row: Record<string, string>,
  rowIndex: number,
  stores: Store[],
): MigrationRow {
  const warnings: string[] = [];
  const requesterName = pick(row, ['お名前', '依頼者', 'requesterName']);
  const storeInput = pick(row, ['店舗', 'store']);
  const storeId = resolveStoreId(storeInput, stores);
  if (!storeInput) warnings.push('店舗が空 → 未割当');

  const nameKanji = pick(row, ['キャスト名(漢字)', 'キャスト名', '漢字']);
  if (!nameKanji) warnings.push('キャスト名(漢字)が空');

  const details: BusinessCardDetails = {
    nameKanji: nameKanji || '(名前不明)',
    nameRomaji: pick(row, ['ローマ字', 'romaji']) || undefined,
    nameKana: pick(row, ['ふりがな', 'よみがな', 'kana']) || undefined,
    position: pick(row, ['役職', 'position']) || undefined,
    storeVariants: storeInput ? [storeInput] : [],
    phoneOverride: pick(row, ['電話番号', '電話', 'phone']) || undefined,
    email: pick(row, ['メール', 'email']) || undefined,
    lineQr: toBool(pick(row, ['LINE QR 希望', 'LINE QR', 'LINEQR'])),
  };

  const doneFlag = toBool(pick(row, ['済', '完了']));
  const status: DeliverableStatus = doneFlag
    ? 'completed'
    : normalizeStatus(pick(row, ['ステータス', 'status']));

  const deliverable: Deliverable = {
    id: generateDeliverableId(),
    category: 'businessCard',
    status,
    details,
    statusHistory: [],
    completedAt: status === 'completed' ? new Date().toISOString() : null,
  };

  return {
    index: rowIndex,
    source: 'business_card_form',
    originalRow: row,
    mapped: {
      storeId,
      storeNameGuess: storeInput,
      requesterName: requesterName || '(不明)',
      title: `${details.nameKanji} 名刺`,
      content: '(移行データ: 名刺依頼)',
      dueDate: null,
      referenceUrls: [],
      deliverables: [deliverable],
      priority: 'normal',
      legacyId: `bc_${rowIndex + 1}`,
    },
    warnings,
    status: warnings.length > 0 ? 'warning' : 'ok',
    selected: true,
  };
}

export function mapPosterPopRow(
  row: Record<string, string>,
  rowIndex: number,
  stores: Store[],
): MigrationRow {
  const warnings: string[] = [];
  const requesterName = pick(row, ['お名前', '依頼者']);
  const title = pick(row, ['タイトル', 'title']) || '(無題)';
  const content = pick(row, ['内容', 'content', 'メッセージ']);
  const usagePeriod = pick(row, ['イベント期間', '使用期間', '期間']);
  const sizeField = pick(row, ['制作サイズ', 'サイズ']);
  if (!sizeField) warnings.push('制作サイズが空のため other にマッピング');
  const category = detectCategory(sizeField);
  if (/動画/.test(sizeField)) warnings.push('動画カテゴリは廃止、other に移行');

  const orientation = normalizeOrientation(pick(row, ['向き', 'orientation']));
  const paperType = pick(row, ['印刷用紙', '加工', '印刷用紙・加工']);
  const printCount = Number(pick(row, ['印刷枚数', '枚数']) || '0') || undefined;
  const deliverySize = pick(row, ['データ納品サイズ', '納品サイズ']);
  const referenceUrls = extractUrls(pick(row, ['参考資料', '参考URL', '参考']));
  const otherNotes = pick(row, ['その他質問', 'その他', '備考']);
  const storeInput = pick(row, ['店舗']);
  const storeId = resolveStoreId(storeInput, stores);
  if (!storeInput) warnings.push('店舗が空 → 未割当');

  const doneFlag = toBool(pick(row, ['済', '完了']));
  const status: DeliverableStatus = doneFlag
    ? 'completed'
    : normalizeStatus(pick(row, ['ステータス', 'status']));
  const sizes = splitSizes(sizeField);

  let details: PosterPopDetails | AwardDetails | OtherDetails;
  if (category === 'poster' || category === 'pop') {
    details = {
      sizes,
      orientation,
      printCount,
      paperType: paperType || undefined,
      deliverySize: deliverySize || undefined,
      notes: otherNotes || undefined,
    };
  } else if (category === 'award') {
    details = {
      ceremonyDate: '',
      printMaterials: sizes,
      recipients: [],
      notes: (otherNotes ? otherNotes + '\n' : '') + (sizeField || ''),
    };
  } else {
    details = {
      sizes,
      printCount,
      notes:
        [
          /動画/.test(sizeField) ? '動画依頼(移行データ)' : '',
          otherNotes,
          sizeField ? `原本: ${sizeField}` : '',
        ]
          .filter(Boolean)
          .join('\n') || undefined,
    };
  }

  const deliverable: Deliverable = {
    id: generateDeliverableId(),
    category,
    status,
    details,
    statusHistory: [],
    completedAt: status === 'completed' ? new Date().toISOString() : null,
  };

  return {
    index: rowIndex,
    source: 'poster_form',
    originalRow: row,
    mapped: {
      storeId,
      storeNameGuess: storeInput,
      requesterName: requesterName || '(不明)',
      title,
      content: content || '(移行データ)',
      usagePeriod: usagePeriod || undefined,
      dueDate: null,
      referenceUrls,
      deliverables: [deliverable],
      priority: 'normal',
      legacyId: `pp_${rowIndex + 1}`,
    },
    warnings,
    status: warnings.length > 0 ? 'warning' : 'ok',
    selected: true,
  };
}

export function mapRow(
  source: MigrationSource,
  row: Record<string, string>,
  idx: number,
  stores: Store[],
): MigrationRow {
  try {
    if (source === 'business_card_form') return mapBusinessCardRow(row, idx, stores);
    return mapPosterPopRow(row, idx, stores);
  } catch (e) {
    return {
      index: idx,
      source,
      originalRow: row,
      mapped: {
        storeId: null,
        storeNameGuess: '',
        requesterName: '',
        title: '',
        content: '',
        dueDate: null,
        referenceUrls: [],
        deliverables: [],
        priority: 'normal',
        legacyId: `err_${idx + 1}`,
      },
      warnings: [],
      error: (e as Error).message,
      status: 'error',
      selected: false,
    };
  }
}
