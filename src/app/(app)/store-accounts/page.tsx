import { redirect } from 'next/navigation';

// 旧 /store-accounts は /accounts (アカウント管理) へ統合済み
export default function StoreAccountsRedirect() {
  redirect('/accounts');
}
