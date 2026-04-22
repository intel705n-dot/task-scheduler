# task-scheduler 引き継ぎ仕様書

最終更新: 2026-04-22

---

## 1. プロジェクト概要

Google スプレッドシートで運用していたタスク・スケジュール管理を Web アプリ化したもの。社内 5 名（オーナー含む）が利用する小規模クローズド運用。

- **目的**: タスク一覧管理 + 月次カレンダーを 1 画面で完結
- **利用者**: 許可メール 5 件のみログイン可
- **稼働環境**: Netlify（本番）+ Supabase（DB/Auth）

---

## 2. 技術スタック

| 区分 | 内容 |
|---|---|
| フレームワーク | Next.js 14.2.35（App Router + Route Groups） |
| 言語 | TypeScript 5 / React 18 |
| スタイル | Tailwind CSS 3.4 |
| DB / 認証 | Supabase（PostgreSQL + Auth）`@supabase/ssr` 0.9 |
| Excel 出力 | `xlsx` 0.18.5 |
| デプロイ | Netlify（master push で自動デプロイ） |
| 開発ポート | 3001（`npm run dev`） |

### 重要な外部サービス設定

- **Supabase プロジェクト**: `nepslbltrifujcdxffnh`
- **Netlify サイト**: `cute-druid-35c54d`
- **GitHub リポジトリ**: `intel705n-dot/task-scheduler` (master ブランチ)
- **Supabase URL Configuration**
  - Site URL / Redirect URLs に Netlify 本番 URL・`/auth/callback` が登録済み

---

## 3. ディレクトリ構成

```
task-scheduler/
├── src/
│   ├── app/
│   │   ├── (app)/                 # 認証が必要なページ群
│   │   │   ├── layout.tsx          # 3カラムレイアウト（タスク | ショートカット | カレンダー）
│   │   │   ├── calendar/page.tsx   # 月カレンダー
│   │   │   └── tasks/              # （現在は未使用・将来用）
│   │   ├── auth/callback/route.ts  # Supabase Auth コールバック（/calendar へ redirect）
│   │   ├── login/page.tsx          # パスワードログイン画面
│   │   ├── layout.tsx              # ルートレイアウト
│   │   └── globals.css             # Tailwind エントリポイント
│   ├── components/
│   │   ├── Header.tsx              # ヘッダー + 「アカウント設定」モーダル
│   │   ├── TaskPanel.tsx           # 左カラム：タスク一覧（サマリー/フィルタ/ソート/Excel 出力）
│   │   ├── TaskModal.tsx           # タスク追加・編集モーダル
│   │   ├── ShortcutPanel.tsx       # 中央カラム：外部サイトショートカット（localStorage）
│   │   └── EventModal.tsx          # カレンダーイベント追加・編集モーダル
│   ├── lib/
│   │   ├── types.ts                # 型・ステータス定数・STATUS_COLORS
│   │   └── supabase/
│   │       ├── client.ts           # ブラウザ用クライアント
│   │       ├── server.ts           # SSR 用クライアント
│   │       └── middleware.ts       # Cookie 管理 + 未認証 redirect
│   └── middleware.ts
├── supabase/
│   └── schema.sql                  # DB スキーマ + RLS + トリガー
├── .env.local                      # NEXT_PUBLIC_SUPABASE_URL / ANON_KEY
├── .npmrc
└── package.json
```

---

## 4. データベーススキーマ

詳細は `supabase/schema.sql` 参照。主要テーブル：

### `allowed_emails`
ログイン許可メールのホワイトリスト。ログイン時にクライアント側でチェック。

### `profiles` (auth.users に紐付く)
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid (FK: auth.users) | PK |
| email | text | |
| display_name | text | 例: `菊池`, `吉栖`, `中谷`, `中谷（オーナー）`, `菊池（サブ）` |
| color | text | 担当者バッジ色 |

### `stores`（マスタ）
`本社 / 不死鳥 / 蘭○ / 風雲 / 東レ / その他`

### `tasks`
ステータス: `未着手 / 作業中 / 仕上がり待ち / 保留 / 返答待ち / データ待ち / 確認待ち / 完了`
※ `priority` カラムあり (`不死！/通常`)、現在 UI では未使用

### `events`
日付・時刻付きカレンダーイベント。`priority` は `不死！/蘭○/他/通常`

### RLS
認証済みユーザーは全テーブル full CRUD 可（クローズド運用のため）。

### トリガー
- `updated_at` 自動更新（tasks / events）
- `on_auth_user_created`: 新規 auth.users 作成時に profiles を display_name / color 込みで自動作成
  - **メールと display_name のハードコードマッピングあり**。ユーザー追加時はこの関数も要更新。

---

## 5. 認証仕様

- **パスワードログインのみ**（Magic Link は 2026-04 に撤去：レート制限のため）
- `allowed_emails` に無いメールは弾く
- 未ログインユーザー → `/login` へ redirect
- ログイン成功 → `/calendar` へ redirect
- `Header.tsx` の歯車アイコンから「アカウント設定」モーダルで以下を操作可能
  - 担当者名（display_name）変更
  - メールアドレス表示（read-only）
  - パスワード変更（`supabase.auth.updateUser({ password })`）

### 現在のユーザー
| メール | display_name | 備考 |
|---|---|---|
| intel705n@gmail.com | 中谷（オーナー） | サマリー・フィルタ・担当者選択から非表示 |
| phoenix.nakatani@gmail.com | 中谷 | |
| ch8.kid@gmail.com | 菊池 | メイン |
| kikuchi@leisurelarce.co.jp | 菊池（サブ） | タスクはメイン菊池に統合済み。サマリー等から非表示 |
| saya38719@gmail.com | 吉栖 | |

`hiddenProfiles = ['中谷（オーナー）', '菊池（サブ）']` を `TaskPanel.tsx` / `TaskModal.tsx` でフィルタ。

---

## 6. 画面仕様

### レイアウト（`src/app/(app)/layout.tsx`）
3 カラム構成：

```
┌─────────┬─────┬──────────────────────┐
│ Task    │Short│  Calendar            │
│ Panel   │cut  │                      │
│ (w-80)  │Panel│  (flex-1)            │
│         │(w-48)│                      │
└─────────┴─────┴──────────────────────┘
```
- スマホでは 2 つの sidebar は `hidden lg:flex` で隠れる

### TaskPanel
- 担当者サマリー（クリックでフィルタ絞り込み、トグル）
- タブ切替: 現行 / 済
- 検索・ステータス絞り込み・担当者絞り込み
- ソート: 作成日 / ステータス / 担当者 / 店舗 / 期限 / タイトル（↑↓ トグル）
- タスクカード: チェック（完了）/ バッジ表示 / 編集ボタン
- フッター: `+ タスク追加` ボタン + `Excel` 出力ボタン
  - **Excel 出力は現在のフィルタ・ソート結果のみ** を `.xlsx` に書き出す。ファイル名 `タスク一覧_YYYY-MM-DD.xlsx`

### ShortcutPanel
- localStorage キー: `task-scheduler-shortcuts`
- 最大 10 件、サイト名 + URL を保存
- hover で並び替え（↑↓）と削除ボタンが出現
- 新規タブで開く

### Calendar
- 月単位表示
- 日付クリックでイベント追加、イベントクリックで編集
- 担当者・店舗の色バッジ付き

---

## 7. 環境変数

`.env.local`（Netlify の Environment Variables にも同じものを設定）:

```
NEXT_PUBLIC_SUPABASE_URL=https://nepslbltrifujcdxffnh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=（Supabase ダッシュボード Settings > API）
```

---

## 8. 運用・開発手順

### ローカル起動
```bash
npm install
npm run dev   # http://localhost:3001
```

### ビルド
```bash
npm run build
```

### デプロイ
`master` ブランチへ push → Netlify が自動ビルド・デプロイ

### DB スキーマ変更
1. Supabase SQL Editor で SQL 実行
2. `supabase/schema.sql` にも同じ変更を反映してコミット

### ユーザー追加・削除
1. Supabase Auth ダッシュボードで `auth.users` 作成、または SQL でパスワード付与
   ```sql
   -- auth.users と auth.identities を INSERT
   -- パスワードは crypt(password, gen_salt('bf')) で設定
   ```
2. `allowed_emails` にメール追加
3. `handle_new_user()` トリガーのハードコードマッピング更新（必要なら）
4. `HANDOVER.md` のユーザー一覧も更新

---

## 9. 既知の制約・注意点

1. **Magic Link は撤去済み**（Supabase 無料枠のメール制限 4 通/時に抵触したため）。パスワード認証のみ。
2. **`handle_new_user` トリガーにメールアドレスがハードコード** されている。ユーザー追加時は忘れずに更新。
3. **`hiddenProfiles` もコードにハードコード** (`TaskPanel.tsx`, `TaskModal.tsx`)。非表示にしたい display_name を追加するには 2 ファイル更新が必要。
4. **ショートカットは localStorage 管理** なので端末・ブラウザごとに独立。サーバー側に保存されない。
5. **`priority` カラムは DB には存在するが UI 未実装**。実装するなら TaskPanel / TaskModal / EventModal / types.ts を更新。
6. **RLS は "認証済みなら全権"**。特定担当者のタスクだけ見せる等の制御は未実装。
7. **Netlify 自動デプロイ**: master push で即本番反映。feature ブランチ運用は未導入。
8. **`.npmrc` は空の状態が望ましい**（クールダウン設定は緊急パッチ遅延リスクで不採用。MEMORY.md 参照）。

---

## 10. 今後の拡張候補（優先度順）

1. **priority UI の実装** — DB カラムは存在するので UI バッジ + フィルタを追加すれば完結
2. **カレンダーイベントの Excel / ICS エクスポート**
3. **タスクのコメント機能**（進捗やりとりを残せるように）
4. **通知機能**（期限直前など）
5. **モバイル用レイアウト改善** — 現状 lg: で 3 カラムが消えるが、スマホ向け UX は最適化余地あり

---

## 11. 直近の変更履歴（ハイライト）

```
0962b2f Excel 出力ボタンをタスク追加ボタン横に配置
1eed974 表示中のタスクを Excel 出力する機能追加
99e6fca 菊池の重複プロファイルを統合（kikuchi@leisurelarce.co.jp → 菊池（サブ））
0d29766 Magic Link 撤去 + アカウント設定モーダル + タスクソート
9546719 パスワードログイン追加
f4d4a41 担当者クリックで絞り込み / ショートカットパネル / オーナー非表示
3fbf174 ログイン後のリダイレクト先を /calendar に変更
f45f578 初期実装（Supabase + Next.js）
```

---

## 12. 連絡先・権限

- **Supabase オーナー**: intel705n@gmail.com
- **Netlify オーナー**: 同上
- **GitHub リポジトリオーナー**: intel705n-dot

新しく引き継ぐ場合、上記アカウントで各サービスにログインできる状態にしておくこと。
