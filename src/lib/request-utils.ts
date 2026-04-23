import type {
  Deliverable,
  DeliverableCategory,
  DeliverableDetails,
  RequestStatus,
  DeliverableStatus,
} from './types';

export function generatePublicToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateDeliverableId(): string {
  return 'd_' + Math.random().toString(36).slice(2, 10);
}

const TOKEN_STORAGE_KEY = 'tsukuru:tokens';

export function getStoredTokens(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addStoredToken(token: string) {
  if (typeof window === 'undefined') return;
  const tokens = getStoredTokens();
  if (!tokens.includes(token)) {
    tokens.push(token);
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  }
}

export function getLatestStoredToken(): string | null {
  const t = getStoredTokens();
  return t.length > 0 ? t[t.length - 1] : null;
}

export function defaultDetailsFor(category: DeliverableCategory): DeliverableDetails {
  switch (category) {
    case 'poster':
    case 'pop':
      return {
        sizes: category === 'pop' ? ['はがき'] : [],
        orientation: 'vertical',
        printCount: category === 'pop' ? 40 : 1,
        paperType: '',
        deliverySize: '',
        notes: '',
      };
    case 'businessCard':
      return {
        nameKanji: '',
        nameRomaji: '',
        nameKana: '',
        position: '',
        storeVariants: [],
        phoneOverride: '',
        email: '',
        lineQr: false,
        lineQrNote: '',
        notes: '',
      };
    case 'award':
      return {
        ceremonyDate: '',
        printMaterials: [],
        recipients: [],
        notes: '',
      };
    case 'other':
      return {
        sizes: [],
        printCount: 1,
        notes: '',
      };
  }
}

export function createDeliverable(
  category: DeliverableCategory,
  partialDetails?: Partial<DeliverableDetails>,
): Deliverable {
  const defaults = defaultDetailsFor(category);
  return {
    id: generateDeliverableId(),
    category,
    status: 'pending',
    details: { ...defaults, ...partialDetails } as DeliverableDetails,
    statusHistory: [],
  };
}

export function aggregateStatus(deliverables: Deliverable[]): {
  status: RequestStatus;
  completedAt: string | null;
} {
  if (!deliverables || deliverables.length === 0) {
    return { status: 'pending', completedAt: null };
  }
  const active = deliverables.filter((d) => d.status !== 'cancelled');
  if (active.length === 0) return { status: 'cancelled', completedAt: null };

  const allCompleted = active.every((d) => d.status === 'completed');
  if (allCompleted) {
    const latest = active
      .map((d) => d.completedAt)
      .filter((t): t is string => !!t)
      .sort()
      .reverse()[0];
    return { status: 'completed', completedAt: latest ?? new Date().toISOString() };
  }
  const anyInProgress = active.some(
    (d) => d.status !== 'pending' && d.status !== 'completed' && d.status !== 'cancelled',
  );
  if (anyInProgress) return { status: 'inProgress', completedAt: null };
  return { status: 'pending', completedAt: null };
}

export function deliverableSummary(d: Deliverable): string {
  const det = d.details as Record<string, unknown>;
  if (d.category === 'poster' || d.category === 'pop') {
    const sizes = (det.sizes as string[] | undefined)?.join(',') ?? '';
    const count = det.printCount ? ` ${det.printCount}` : '';
    return `${sizes || '-'}${count}`;
  }
  if (d.category === 'businessCard') {
    return String(det.nameKanji ?? '名刺');
  }
  if (d.category === 'award') {
    const mats = (det.printMaterials as string[] | undefined)?.join('+') ?? '';
    return mats || '表彰';
  }
  const notes = (det.notes as string | undefined) ?? '';
  return notes.slice(0, 12) || 'その他';
}

export function fmtDate(s?: string | null): string {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function fmtDateFull(s?: string | null): string {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
}

export function fmtDateTime(s?: string | null): string {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// 旧API(5値前提)は types.ts の DELIVERABLE_STATUS_COLORS に統合済み。
// 呼び出し側は import { DELIVERABLE_STATUS_COLORS } from '@/lib/types' に
// 切り替え済みなので、ここでは互換用に薄いラッパだけ残す。
import { DELIVERABLE_STATUS_COLORS } from './types';
export function statusBadgeColor(status: DeliverableStatus): string {
  return DELIVERABLE_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700 border-gray-200';
}
