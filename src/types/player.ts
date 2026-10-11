import type { PlayerId, SchoolId } from './ids';

/** 14項目の能力キー(仕様書 第5章) */
export const ABILITY_KEYS = [
  // 身体能力
  'speed', 'acceleration', 'power', 'stamina', 'physique',
  // 技術
  'pass', 'kick', 'tackle', 'carry', 'scrum', 'lineout',
  // 判断・連携
  'judgment', 'positioning', 'teamwork',
] as const;
export type AbilityKey = (typeof ABILITY_KEYS)[number];
export type Abilities = Record<AbilityKey, number>;

export const ABILITY_LABELS: Record<AbilityKey, string> = {
  speed: '走力', acceleration: '加速力', power: 'パワー', stamina: '持久力', physique: '体格',
  pass: 'パス', kick: 'キック', tackle: 'タックル', carry: 'ボールキャリー',
  scrum: 'スクラム', lineout: 'ラインアウト',
  judgment: '判断力', positioning: 'ポジショニング', teamwork: '連携力',
};

export const ABILITY_GROUPS: { label: string; keys: AbilityKey[] }[] = [
  { label: '身体能力', keys: ['speed', 'acceleration', 'power', 'stamina', 'physique'] },
  { label: '技術', keys: ['pass', 'kick', 'tackle', 'carry', 'scrum', 'lineout'] },
  { label: '判断・連携', keys: ['judgment', 'positioning', 'teamwork'] },
];

/** ポジション(PR=プロップ HO=フッカー LO=ロック FL=フランカー N8=ナンバーエイト
 *  SH=スクラムハーフ SO=スタンドオフ IC=インサイドセンター OC=アウトサイドセンター
 *  WTB=ウイング FB=フルバック) */
export const POSITIONS = ['PR', 'HO', 'LO', 'FL', 'N8', 'SH', 'SO', 'IC', 'OC', 'WTB', 'FB'] as const;
export type Position = (typeof POSITIONS)[number];

export const POSITION_LABELS: Record<Position, string> = {
  PR: 'プロップ', HO: 'フッカー', LO: 'ロック', FL: 'フランカー', N8: 'ナンバーエイト',
  SH: 'スクラムハーフ', SO: 'スタンドオフ', IC: 'インサイドセンター',
  OC: 'アウトサイドセンター', WTB: 'ウイング', FB: 'フルバック',
};

/** 先発15人の背番号ごとのポジション */
export const STARTING_SLOTS: readonly Position[] = [
  'PR', 'HO', 'PR', 'LO', 'LO', 'FL', 'FL', 'N8', 'SH', 'SO', 'WTB', 'IC', 'OC', 'WTB', 'FB',
];

export type Grade = 1 | 2 | 3;

export interface Player {
  id: PlayerId;
  name: string;
  schoolId: SchoolId;
  grade: Grade;
  mainPosition: Position;
  subPosition: Position | null;
  abilities: Abilities;
  isGenius: boolean;
  /** 判明済みの得意練習(未判明は null)。練習メニューIDは第3段階で定義 */
  favoritePractice: string | null;
  enrolledYear: number;
}
