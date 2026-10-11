import type { SchoolId } from './ids';

export type SchoolRank = 'weak' | 'mid' | 'strong';
export const SCHOOL_RANK_LABELS: Record<SchoolRank, string> = {
  weak: '弱小', mid: '中堅', strong: '強豪',
};

export interface School {
  id: SchoolId;
  name: string;
  prefectureCode: number; // 1〜47
  rank: SchoolRank;
  /** 全国ランキング評価値(順位とは別に保持) */
  rankingRating: number;
  /** 実在校か架空校か。実在校の情報と架空設定を区別する */
  isReal: boolean;
  isPlayerSchool: boolean;
}
