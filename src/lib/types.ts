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
  created_at: string;
  updated_at: string;
  // joined
  profiles?: Profile | null;
  stores?: Store | null;
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
