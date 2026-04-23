# タスク・スケジュール管理 Web アプリ

Next.js 14 + Supabase + Tailwind CSS によるタスク管理 & カレンダーアプリ。

## セットアップ手順

### 1. Supabase プロジェクト設定

1. [Supabase ダッシュボード](https://supabase.com/dashboard) でプロジェクトを開く
2. **SQL Editor** で `supabase/schema.sql` の内容をすべて実行
3. **Authentication > URL Configuration** で以下を設定:
   - Site URL: `https://your-app.vercel.app`（デプロイ後のURL）
   - Redirect URLs: `https://your-app.vercel.app/auth/callback`
4. **Authentication > Providers > Email** で:
   - Enable Email provider: ON
   - Enable Email OTP (Magic Link): ON

### 2. 環境変数

`.env.local` を編集し、Supabase の API キーを設定:

```
NEXT_PUBLIC_SUPABASE_URL=https://nepslbltrifujcdxffnh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=（Settings > API から取得）
```

### 3. ローカル開発

```bash
npm install
npm run dev
```

http://localhost:3000 でアクセス。

### 4. Vercel へデプロイ

1. GitHub にリポジトリを push
2. [Vercel](https://vercel.com) でリポジトリをインポート
3. Environment Variables に以下を追加:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy をクリック
5. デプロイ後の URL を Supabase の Redirect URLs に追加

## 機能

- **Magic Link 認証**: 許可メールのみログイン可能
- **タスク管理**: ステータス・担当者・店舗・優先度でカード表示、フィルター・検索
- **カレンダー**: 月表示、日付クリックで予定追加、イベント編集・削除
- **レスポンシブ**: スマホ・PC 両対応

## 技術スタック

- Next.js 14 (App Router) + TypeScript
- Supabase (PostgreSQL + Auth)
- Tailwind CSS
- Vercel
