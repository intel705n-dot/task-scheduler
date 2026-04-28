// 表彰状の店舗別テンプレート (月間表彰の標準項目)。
// Excel「表彰項目構成一覧_不死鳥_蘭○.xlsx」の内容を反映。
// 店舗を選んで表彰状成果物を追加すると、自動で展開される。

import type { AwardItem, AwardRecipientV2 } from './types';

let _id = 0;
const newId = () => `ai_${Date.now().toString(36)}_${(_id++).toString(36)}`;

const blankRecipient = (
  rank: string | undefined,
  hasCertificate: boolean,
  hasEnvelope: boolean,
): AwardRecipientV2 => ({
  rank,
  name: '',
  comment: '',
  hasCertificate,
  hasEnvelope,
});

// 共通: 「常設」項目は順位範囲分の空欄受賞者を初期投入。「変動」は0人で開始。
function buildItem(opts: {
  itemName: string;
  rankRange?: string;
  presetType: 'permanent' | 'variable';
  notes?: string;
  // 「1〜5位」なら 5、 "-" は 0 (ユーザーが追加)
  initialCount: number;
  hasCertificate: boolean;
  hasEnvelope: boolean;
}): AwardItem {
  const recipients: AwardRecipientV2[] = [];
  for (let i = 1; i <= opts.initialCount; i++) {
    recipients.push(
      blankRecipient(
        opts.rankRange && opts.rankRange !== '-' ? String(i) : undefined,
        opts.hasCertificate,
        opts.hasEnvelope,
      ),
    );
  }
  return {
    id: newId(),
    itemName: opts.itemName,
    rankRange: opts.rankRange,
    presetType: opts.presetType,
    notes: opts.notes,
    collapsed: false,
    recipients,
  };
}

// 不死鳥 (全項目 賞状 + 封筒)
export function buildFushichoTemplate(): AwardItem[] {
  return [
    buildItem({
      itemName: '月間ベストオール',
      rankRange: '1〜5位',
      presetType: 'permanent',
      initialCount: 5,
      hasCertificate: true,
      hasEnvelope: true,
      notes: '社長: 山本聖子 (株式会社レジャラース)',
    }),
    buildItem({
      itemName: '同伴サービスタイムベストオール',
      rankRange: '1〜5位',
      presetType: 'permanent',
      initialCount: 5,
      hasCertificate: true,
      hasEnvelope: true,
      notes: '同点時は同順位複数名あり',
    }),
    buildItem({
      itemName: '月間新人ベストオール',
      rankRange: '1〜3位',
      presetType: 'variable',
      initialCount: 3,
      hasCertificate: true,
      hasEnvelope: true,
      notes: '対象者(新人)不在時は非表彰',
    }),
    buildItem({
      itemName: '皆勤賞',
      rankRange: '-',
      presetType: 'variable',
      initialCount: 0,
      hasCertificate: true,
      hasEnvelope: true,
      notes: '対象者全員。指名固定なし',
    }),
    buildItem({
      itemName: 'SNS賞',
      rankRange: '-',
      presetType: 'variable',
      initialCount: 0,
      hasCertificate: true,
      hasEnvelope: true,
      notes: '実績ある時のみ表彰',
    }),
    buildItem({
      itemName: 'LC賞',
      rankRange: '-',
      presetType: 'variable',
      initialCount: 0,
      hasCertificate: true,
      hasEnvelope: true,
      notes: '実績ある時のみ表彰',
    }),
    buildItem({
      itemName: '売上賞',
      rankRange: '-',
      presetType: 'variable',
      initialCount: 0,
      hasCertificate: true,
      hasEnvelope: true,
      notes: '実績ある時のみ表彰',
    }),
    buildItem({
      itemName: '新人賞',
      rankRange: '-',
      presetType: 'variable',
      initialCount: 0,
      hasCertificate: true,
      hasEnvelope: true,
      notes: '実績ある時のみ表彰',
    }),
  ];
}

// 蘭○ (賞状あり/なしが項目ごとに違う、賞状のみは無し)
// 既定: 常設項目のみ 賞状+封筒。変動項目は封筒のみ。
// (各受賞者ごとに後からトグル可)
export function buildRanmaruTemplate(): AwardItem[] {
  return [
    buildItem({
      itemName: '指名 (月間ベストオール)',
      rankRange: '1〜5位',
      presetType: 'permanent',
      initialCount: 5,
      hasCertificate: true,
      hasEnvelope: true,
      notes: '社長: 竹田和仁 (株式会社東京レジャラース)',
    }),
    buildItem({
      itemName: '売上',
      rankRange: '1〜5位',
      presetType: 'permanent',
      initialCount: 5,
      hasCertificate: true,
      hasEnvelope: true,
    }),
    buildItem({
      itemName: '同伴',
      rankRange: '1〜3位',
      presetType: 'permanent',
      initialCount: 3,
      hasCertificate: true,
      hasEnvelope: true,
      notes: '同点時複数名の可能性あり',
    }),
    buildItem({
      itemName: '新人指名 (月間新人ベストオール)',
      rankRange: '1〜3位',
      presetType: 'variable',
      initialCount: 3,
      hasCertificate: true,
      hasEnvelope: true,
      notes: '対象者(新人)不在時は非表彰',
    }),
    buildItem({
      itemName: '新人売上',
      rankRange: '1〜3位',
      presetType: 'variable',
      initialCount: 3,
      hasCertificate: true,
      hasEnvelope: true,
      notes: '対象者(新人)不在時は非表彰',
    }),
    buildItem({
      itemName: '新人同伴',
      rankRange: '1〜3位',
      presetType: 'variable',
      initialCount: 3,
      hasCertificate: true,
      hasEnvelope: true,
      notes: '対象者(新人)不在時は非表彰／同点時複数名',
    }),
    buildItem({
      itemName: 'SNS賞',
      rankRange: '-',
      presetType: 'variable',
      initialCount: 0,
      hasCertificate: false,
      hasEnvelope: true,
      notes: '対象者・実績に応じて表彰',
    }),
    buildItem({
      itemName: 'LC賞',
      rankRange: '-',
      presetType: 'variable',
      initialCount: 0,
      hasCertificate: false,
      hasEnvelope: true,
      notes: '対象者・実績に応じて表彰',
    }),
    buildItem({
      itemName: 'LBHS賞',
      rankRange: '-',
      presetType: 'variable',
      initialCount: 0,
      hasCertificate: false,
      hasEnvelope: true,
      notes: '対象者・実績に応じて表彰',
    }),
    buildItem({
      itemName: 'イベント賞',
      rankRange: '-',
      presetType: 'variable',
      initialCount: 0,
      hasCertificate: false,
      hasEnvelope: true,
      notes: '月により人数変動',
    }),
    buildItem({
      itemName: '皆勤賞',
      rankRange: '-',
      presetType: 'variable',
      initialCount: 0,
      hasCertificate: false,
      hasEnvelope: true,
      notes: '対象者全員。指名固定なし',
    }),
  ];
}

// 店舗名 → テンプレートキー
export function templateKeyForStoreName(
  name: string | undefined,
): 'fushicho' | 'ranmaru' | null {
  if (!name) return null;
  const n = name.replace(/\s+/g, '');
  if (n === '不死鳥' || n.includes('不死鳥')) return 'fushicho';
  // 蘭○ / 蘭○ など全角/半角ゆれを許容
  if (n.includes('蘭')) return 'ranmaru';
  return null;
}

export function buildTemplateByKey(
  key: 'fushicho' | 'ranmaru',
): AwardItem[] {
  return key === 'fushicho' ? buildFushichoTemplate() : buildRanmaruTemplate();
}

// 新規にカスタム項目 (店舗側で追加) を作るときの空テンプレ
export function newCustomAwardItem(): AwardItem {
  return {
    id: newId(),
    itemName: '',
    rankRange: '-',
    presetType: 'custom',
    notes: '',
    collapsed: false,
    recipients: [
      {
        rank: undefined,
        name: '',
        hasCertificate: true,
        hasEnvelope: true,
      },
    ],
  };
}

export function newAwardRecipient(
  hasCertificate: boolean,
  hasEnvelope: boolean,
): AwardRecipientV2 {
  return {
    rank: undefined,
    name: '',
    hasCertificate,
    hasEnvelope,
  };
}
