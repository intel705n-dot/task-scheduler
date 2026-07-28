# TSUKURU (task-scheduler) Codex 引き継ぎ

- **最終更新**: 2026-07-28
- **引き継ぎ元**: Claude Code (Opus 4.7)
- **引き継ぎ先**: Codex (以降はこの子が主担当)

---

## 0. まず読むもの

- 本ファイル (全体像)
- `C:\Users\nakat\.claude\CLAUDE.md` (中谷さん全プロジェクト共通ルール)
- 旧 `HANDOVER.md` は Netlify 時代の古い記述が残る参考資料。本ファイルが正。

---

## 1. プロジェクト概要

- 中谷さん (株式会社レジャラース 企画課) の社内ツール。
- 制作物 (ポスター / POP / 名刺 / 賞状) を各店舗 → 本社に依頼するフォームと、
  本社側の案件管理 / カレンダー / 各種マスタ管理を1つにまとめたもの。
- 元は Google スプレッドシート → 社内 task-scheduler → 2026-04-22 に TSUKURU 統合。
- 対外的名称: **TSUKURU** (「制作依頼フォーム」)。
- 利用者: 依頼者側 (店舗/ゲスト/個人 Google) と 管理者側 (レジャラース本社)。

---

## 2. 場所と稼働環境

| 項目 | 値 |
|---|---|
| リポジトリパス | `C:\Users\nakat\Claudeプロジェクト\task-scheduler` |
| GitHub | `https://github.com/intel705n-dot/task-scheduler.git` (master) |
| 本番URL | https://task-scheduler-xi-one.vercel.app/ |
| デプロイ | Vercel (master push で自動デプロイ) |
| DB / Auth | Supabase プロジェクト `nepslbltrifujcdxffnh` |
| ファイル添付 | Dropbox (Refresh Token 運用) |
| 開発ポート | `3001` (`npm run dev`) |
| ログイン | 全て `intel705n@gmail.com` (管理者) |

`.env.local` は既に存在 (Supabase URL/KEY, Dropbox Client/Secret/RefreshToken 入り)。触るときは中谷さんに確認。

---

## 3. 技術スタック

- Next.js 14.2.35 App Router (route groups: `(app)` / `(public)`)
- TypeScript 5 / React 18
- Tailwind CSS 3.4
- `@supabase/ssr` 0.9 + `@supabase/supabase-js` 2.100
- `@dnd-kit/core` (カンバンの D&D)
- `xlsx` / `papaparse` (import 機能で使用)

---

## 4. 認証と RLS (最重要 — 触るときは慎重に)

### ユーザー3種

| 種別 | 認証方法 | 判定条件 | 見える範囲 |
|---|---|---|---|
| **管理者** (レジャラース社内) | Google | `allowed_emails` に email 登録済み | 全依頼 / 全カレンダー / 全マスタ |
| **店舗** | Email + Password | `store_accounts` に email 登録済み | 自店舗の依頼のみ |
| **個人 (依頼者)** | Google | 上記いずれでもない Google アカウント | 自分が送信した依頼のみ |

### 主な RLS 判定関数 (`supabase/2026-04-23_public_auth.sql`)

- `public.is_admin_user()` — `allowed_emails` に JWT の email があるか
- `public.my_store_account_store_id()` — 店舗アカウントなら store_id を返す
- `requests` の select は `is_admin_user() OR (自店舗一致) OR (user_id = auth.uid())`
- `requests` の insert は `is_admin_user() OR user_id = auth.uid()`
- `events` / `tasks` は管理者のみ

### 認証遷移

- `/login` — トップ: 個人 Google ログイン + ゲスト導線 + 「店舗ログインはこちら」小リンク
- `/login/store` — 店舗パスワードログイン (2階層目)
- `/auth/callback` — OAuth コールバック。`next` パラメータで振り分け
- ログイン後: 管理者は `/calendar` へ / それ以外は `/my` へ

---

## 5. ページ構成

### 依頼者側 (`src/app/(public)/`)

| ルート | 中身 |
|---|---|
| `/` | トップ (login CTA + ゲスト導線) |
| `/select` | プリセット選択 |
| `/new` | 新規依頼フォーム (成果物 4種: poster / pop / businessCard / award) |
| `/my` | 自分/店舗の依頼一覧 — 上部に「＋ 新しい依頼を送る」CTA あり |
| `/my/[token]` | ゲスト用 token 経由の依頼確認 |
| `/request/[id]` | 個別依頼の進捗確認 |

### 管理者側 (`src/app/(app)/`)

| ルート | 中身 |
|---|---|
| `/calendar` | 月カレンダー (予定 + 依頼納期)。📋 コピペ機能あり |
| `/progress` | カンバン風進捗 |
| `/requests/[id]` | 依頼詳細/編集 |
| `/requests/kanban` | 案件カンバン (D&D) |
| `/accounts` / `/store-accounts` / `/stores` / `/presets` / `/import` | 各種マスタ管理 |
| `/tasks` | 未使用 (将来用) |

---

## 6. 主要ファイル早見表

- `src/app/(app)/calendar/page.tsx` — カレンダー本体 (コピペ機能 / 担当者は管理者のみ)
- `src/components/EventModal.tsx` — 予定編集 (`📋 コピー` ボタンあり、`template` prop で複製ペースト)
- `src/components/ShortcutPanel.tsx` — カレンダー横のサイトショートカット (localStorage、上限なし、編集可)
- `src/app/(public)/new/NewRequestForm.tsx` — 依頼フォーム本体
- `src/components/deliverables/*` — 成果物種別ごとのフォーム
  - `AwardForm.tsx` — 賞状 (店舗別テンプレ / ポイント制)
  - `BusinessCardForm.tsx` — 名刺 (QR複数)
  - `PosterPopForm.tsx` — ポスター/POP 共通
  - `OtherForm.tsx` — 旧「その他」(新規追加メニューからは削除済み、旧データ表示用に残置)
  - `DeliverableCard.tsx` — 成果物ごとの共通ラッパ
- `src/lib/award-templates.ts` — 賞状テンプレ (`不死鳥` / `蘭○` のマッチ)
- `src/lib/requests.ts` — 依頼 CRUD (RLS 通過に注意 / `insertRequest` は `.select('id').single()` で完了確認)
- `src/lib/types.ts` — 型定義まとめ
- `src/lib/supabase/{client,server,middleware}.ts` — Supabase クライアント
- `supabase/*.sql` — スキーマ / RLS の履歴 (日付順)

---

## 7. 直近の作業履歴 (2026-07-28 前後)

Claude が対応済みの直近コミット (`git log --oneline` で確認可):

- `7499c6d` ショートカット10個上限撤廃
- `b229e15` カレンダー予定にコピペ機能追加 (📋 コピーボタン + 上部バナー)
- `4434cf4` `/my` に「新しい依頼を送る」CTA を追加 (ryo/nu 依頼失敗の対応)
- `0b2cfa7` カレンダー予定の担当者ドロップダウンを管理者のみに絞る
- `74b4abb` ショートカットの名前/URL を編集可能に
- `7e53cf9` `/login` を個人+ゲスト中心にし、店舗ログインを `/login/store` に分離
- `1f66498` 依頼フォームの成果物追加メニューから「その他」を削除
- `f5f8ba4` 賞状フォーム微調整 (名前のみ+ポイント列+店舗切替再展開)

---

## 8. 開発コマンド

```powershell
# 開発サーバー
npm run dev              # http://localhost:3001

# ビルド確認 (デプロイ前に必ず通す)
npm run build

# Lint
npm run lint
```

---

## 9. Git / デプロイ運用

- ブランチは `master` 1本。直 push (PR は使っていない)。
- コミットメッセージは日本語で素直な説明 (「〇〇を追加」「〇〇を修正」)。
- master への push で Vercel が自動デプロイ。
- **push 前に必ず `npm run build` が通ることを確認する**。
- `.env.local` は絶対に commit しない (現状 `.gitignore` 済のはず)。

---

## 10. 中谷さん共通ルール (再掲・厳守)

`C:\Users\nakat\.claude\CLAUDE.md` にある全プロジェクト共通ルールを守ること。特にこのリポジトリで効いてくるのは:

- **名前**: このリポジトリは仕事文脈 → 「中谷 健 / 株式会社レジャラース 企画課」で扱う。「めし」は使わない。
- **株式会社は前株** (株式会社レジャラース)。
- **無料枠死守**: Supabase 無料枠 (行数・転送量・同時接続) と Dropbox 無料枠を圧迫する実装は避ける。
- **確定済みロジックは勝手に変えない**: RLS、`.env.local`、料金計算などは変更前に理由を提案する。

---

## 11. 既知の課題 / 未対応 / 注意事項

- **Supabase Google OAuth 設定**: 本番反映済み。独自ドメイン化する時は Supabase の Redirect URLs に追加必須。
- **ShortcutPanel の並び替え**: 上下矢印 (増えたらドラッグ式に切り替えたい可能性あり)。
- **`HANDOVER.md`**: Netlify 時代の記述が残る。TSUKURU 統合後の updated 版はこの `CODEX_HANDOFF.md` を参照。
- **依頼送信の失敗パターン (2026-07-28 時点で分かっているもの)**:
  1. `/my` に「新規依頼」ボタンがなかった (fixed at `4434cf4`)
  2. 画像アップロード〜完了までに時間がかかる間にブラウザ閉じ → 依頼未登録。UI で完了画面待ちを促す文言はまだ入れていない (改善余地あり)。
- **ryo / n u (2026-07-28 時点で身元不明な個人ログイン試行者2名)**: 中谷さんが手動で再依頼案内を送る予定。

---

## 12. Codex に期待する動き

- 中谷さんが「〜して」と依頼 → 該当ファイルを直接触って、`npm run build` を通してから push。
- 実装前に大規模な設計判断がいる場合は、先に相談 → OK が出てから着手。
- RLS / 認証 / `.env.local` に触るときは必ず事前確認。
- コミット単位は「1つの目的につき1コミット」。まとめすぎない。
- 分からないコード領域があれば `git log --oneline <path>` や `git blame` で経緯を確認できる。
