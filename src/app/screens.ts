/** 仕様書 第14章の17画面の定義。実装済みかどうかをここで管理する。 */
export type ScreenId =
  | 'title' | 'schoolSelect' | 'home' | 'members' | 'training' | 'scout'
  | 'lineup' | 'tactics' | 'matchReport' | 'tournaments' | 'ranking'
  | 'schoolDirectory' | 'playerDirectory' | 'compare' | 'careers' | 'history' | 'save';

export interface ScreenDef {
  id: ScreenId;
  label: string;
  shortLabel: string;
  icon: string;
  /** 実装予定の段階(1〜7)。現在の段階以下なら実装済みとして扱う。 */
  stage: number;
  /** 画面下部ナビ(スマホ)に常時表示するか */
  primary: boolean;
}

export const SCREENS: readonly ScreenDef[] = [
  { id: 'title', label: 'タイトル', shortLabel: 'タイトル', icon: '🏉', stage: 1, primary: false },
  { id: 'schoolSelect', label: '高校選択・作成', shortLabel: '高校選択', icon: '🏫', stage: 2, primary: false },
  { id: 'home', label: 'ホーム・監督室', shortLabel: 'ホーム', icon: '🏠', stage: 1, primary: true },
  { id: 'members', label: '部員一覧', shortLabel: '部員', icon: '👥', stage: 2, primary: true },
  { id: 'training', label: '練習・育成', shortLabel: '練習', icon: '💪', stage: 3, primary: true },
  { id: 'scout', label: 'スカウト', shortLabel: 'スカウト', icon: '🔍', stage: 3, primary: true },
  { id: 'lineup', label: '先発・控え編成', shortLabel: '編成', icon: '📋', stage: 4, primary: false },
  { id: 'tactics', label: '戦術設定', shortLabel: '戦術', icon: '🧠', stage: 4, primary: false },
  { id: 'matchReport', label: '試合結果', shortLabel: '試合', icon: '📊', stage: 4, primary: false },
  { id: 'tournaments', label: '大会・トーナメント', shortLabel: '大会', icon: '🏆', stage: 5, primary: false },
  { id: 'ranking', label: '全国ランキング', shortLabel: 'ランキング', icon: '📈', stage: 5, primary: false },
  { id: 'schoolDirectory', label: '全国高校名鑑', shortLabel: '高校名鑑', icon: '📖', stage: 2, primary: false },
  { id: 'playerDirectory', label: '全国選手名鑑', shortLabel: '選手名鑑', icon: '📇', stage: 2, primary: false },
  { id: 'compare', label: '選手比較', shortLabel: '比較', icon: '⚖️', stage: 2, primary: false },
  { id: 'careers', label: '進路・卒業生', shortLabel: '進路', icon: '🎓', stage: 5, primary: false },
  { id: 'history', label: '学校の歴史', shortLabel: '歴史', icon: '📜', stage: 5, primary: false },
  { id: 'save', label: 'セーブ・ロード', shortLabel: 'セーブ', icon: '💾', stage: 6, primary: false },
];

/** 現在完了している開発段階 */
export const CURRENT_STAGE = 1;

export const isImplemented = (s: ScreenDef) => s.stage <= CURRENT_STAGE;
export const getScreen = (id: ScreenId): ScreenDef => SCREENS.find((s) => s.id === id)!;
