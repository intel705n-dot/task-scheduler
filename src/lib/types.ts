export type Profile = {
  id: string;
  email: string;
  display_name: string;
  color: string;
  created_at: string;
};

export type Store = {
  id: number;
  name: string;
  color: string;
};

export type TaskStatus =
  | '未着手'
  | '作業中'
  | '仕上がり待ち'
  | '保留'
  | '返答待ち'
  | 'データ待ち'
  | '確認待ち'
  | '完了';

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  assignee_id: string | null;
  store_id: number | null;
  due_date: string | null;
  is_done: boolean;
  notes: string | null;
  linked_request_id: string | null;
  created_at: string;
  updated_at: string;
  // joined
  profiles?: Profile | null;
  stores?: Store | null;
  // 依頼由来タスクは対応する request レコードを join して attachments を引ける
  linked_request?: {
    id: string;
    title: string;
    attachments: Attachment[];
  } | null;
};

export type CalendarEvent = {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  assignee_id: string | null;
  store_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  profiles?: Profile | null;
  stores?: Store | null;
};

export const TASK_STATUSES: TaskStatus[] = [
  '未着手',
  '作業中',
  '仕上がり待ち',
  '保留',
  '返答待ち',
  'データ待ち',
  '確認待ち',
  '完了',
];

// スプレッドシート準拠の色分け（目立つ配色）
export const STATUS_COLORS: Record<TaskStatus, string> = {
  '未着手': 'bg-gray-500 text-white',
  '作業中': 'bg-orange-500 text-white',
  '仕上がり待ち': 'bg-pink-500 text-white',
  '保留': 'bg-blue-400 text-white',
  '返答待ち': 'bg-yellow-400 text-yellow-900',
  'データ待ち': 'bg-purple-500 text-white',
  '確認待ち': 'bg-teal-500 text-white',
  '完了': 'bg-green-500 text-white',
};

// ============================================================
// 制作依頼 (2026-04-22 TSUKURU 合併)
// ============================================================

export type DeliverableCategory =
  | 'poster'
  | 'pop'
  | 'businessCard'
  | 'award'
  | 'other';

// 2026-04-23: task と揃えて 9 値に拡張
export type DeliverableStatus =
  | 'pending'
  | 'inProgress'
  | 'waitingFinish'
  | 'onHold'
  | 'waitingReply'
  | 'waitingData'
  | 'waitingReview'
  | 'completed'
  | 'cancelled';

export type RequestStatus = DeliverableStatus;

export type RequestPriority = 'normal' | 'high' | 'urgent';

export type Orientation = 'vertical' | 'horizontal' | 'free' | 'other';

export type PosterPopDetails = {
  sizes: string[];
  orientation: Orientation;
  orientationOther?: string;
  printCount?: number;
  paperType?: string;
  deliverySize?: string;
  notes?: string;
};

export type BusinessCardDetails = {
  nameKanji: string;
  nameRomaji?: string;
  nameKana?: string;
  position?: string;
  storeVariants: string[];
  phoneOverride?: string;
  email?: string;
  lineQr: boolean;
  lineQrNote?: string;
  notes?: string;
};

export type AwardRecipient = {
  awardType: string;
  rank?: string;
  name: string;
};

export type AwardDetails = {
  ceremonyDate: string;
  printMaterials: string[];
  recipients: AwardRecipient[];
  notes?: string;
};

export type OtherDetails = {
  sizes?: string[];
  printCount?: number;
  notes?: string;
};

export type DeliverableDetails =
  | PosterPopDetails
  | BusinessCardDetails
  | AwardDetails
  | OtherDetails;

export type StatusHistoryEntry = {
  from: string;
  to: string;
  by: string;
  at: string; // ISO8601
  note?: string;
};

export type Deliverable = {
  id: string;
  category: DeliverableCategory;
  status: DeliverableStatus;
  assigneeOverride?: string | null;
  dueDateOverride?: string | null;
  details: DeliverableDetails;
  statusHistory: StatusHistoryEntry[];
  completedAt?: string | null;
};

export type Attachment = {
  name: string;
  storagePath: string;
  downloadUrl: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string; // ISO8601
};

// Supabase 行そのまま (snake_case)
export type RequestRow = {
  id: string;
  store_id: number | null;
  requester_name: string;
  title: string;
  content: string;
  usage_period: string | null;
  due_date: string | null;
  reference_urls: string[];
  attachments: Attachment[];
  deliverables: Deliverable[];
  status: RequestStatus;
  assignee_id: string | null;
  priority: RequestPriority;
  public_token: string;
  completed_at: string | null;
  legacy_id: string | null;
  created_at: string;
  updated_at: string;
  // join
  stores?: Store | null;
  profiles?: Profile | null;
};

export type DeliverableTemplate = {
  category: DeliverableCategory;
  details: Record<string, unknown>;
};

export type Preset = {
  id: string;
  name: string;
  description: string;
  ord: number;
  active: boolean;
  deliverable_templates: DeliverableTemplate[];
};

export const CATEGORY_LABELS: Record<DeliverableCategory, string> = {
  poster: 'ポスター',
  pop: '卓上POP',
  businessCard: '名刺',
  award: '賞状・表彰状',
  other: 'その他',
};

export const DELIVERABLE_STATUS_LABELS: Record<DeliverableStatus, string> = {
  pending: '未着手',
  inProgress: '作業中',
  waitingFinish: '仕上がり待ち',
  onHold: '保留',
  waitingReply: '返答待ち',
  waitingData: 'データ待ち',
  waitingReview: '確認待ち',
  completed: '完了',
  cancelled: '取消',
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = DELIVERABLE_STATUS_LABELS;

// tasks の STATUS_COLORS に対応するよう、同じ色スキームを使う
export const DELIVERABLE_STATUS_COLORS: Record<DeliverableStatus, string> = {
  pending: 'bg-gray-100 text-gray-700 border-gray-200',
  inProgress: 'bg-orange-100 text-orange-800 border-orange-200',
  waitingFinish: 'bg-pink-100 text-pink-800 border-pink-200',
  onHold: 'bg-blue-100 text-blue-800 border-blue-200',
  waitingReply: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  waitingData: 'bg-purple-100 text-purple-800 border-purple-200',
  waitingReview: 'bg-teal-100 text-teal-800 border-teal-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-gray-200 text-gray-500 border-gray-300 line-through',
};

// 表示順 (未着手→作業中→仕上がり待ち→... の自然な進行順)
export const DELIVERABLE_STATUS_ORDER: DeliverableStatus[] = [
  'pending',
  'inProgress',
  'waitingFinish',
  'onHold',
  'waitingReply',
  'waitingData',
  'waitingReview',
  'completed',
  'cancelled',
];

export const CATEGORY_COLORS: Record<DeliverableCategory, string> = {
  poster: 'bg-sky-50 text-sky-700 border-sky-200',
  pop: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  businessCard: 'bg-violet-50 text-violet-700 border-violet-200',
  award: 'bg-amber-50 text-amber-700 border-amber-200',
  other: 'bg-gray-50 text-gray-700 border-gray-200',
};
