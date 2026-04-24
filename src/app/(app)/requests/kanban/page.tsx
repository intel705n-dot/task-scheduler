import { redirect } from 'next/navigation';

// 旧 /requests/kanban は /progress (進捗管理) に統合
export default function RequestKanbanRedirect() {
  redirect('/progress');
}
