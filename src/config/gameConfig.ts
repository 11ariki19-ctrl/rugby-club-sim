import type { SchoolRank } from '../types/school';

/**
 * ゲームバランスの設定値。数値はここ以外にベタ書きしないこと。
 * 仕様書で未確定の値は合理的な初期値で、後から調整できる。
 */
export const gameConfig = {
  // 第4章 学校ランクごとの部員数
  rankSettings: {
    weak: { initialMembers: 20, yearlyNewcomers: 5, memberCap: 40 },
    mid: { initialMembers: 30, yearlyNewcomers: 8, memberCap: 50 },
    strong: { initialMembers: 40, yearlyNewcomers: 12, memberCap: 60 },
  } as Record<SchoolRank, { initialMembers: number; yearlyNewcomers: number; memberCap: number }>,

  // 第5・6章 能力値
  ability: { min: 0, normalMax: 100 },

  // 第6章 天才・成長
  genius: { enrollBonus: 15, practiceMultiplier: 1.5, appearsEveryYears: 3 },
  practice: { team: 1.3, position: 1.2, individual: 1.0 },
  growth: { eventIntervalMonths: 3, favoritePracticeRevealedPerMonth: { min: 1, max: 5 } },

  // 第7章 スカウト
  scout: { candidatesPerAttempt: 5, abilityRangeWidth: 15 },

  // 第9章 試合
  match: {
    powerWeights: { starters: 0.65, bench: 0.10, positionBalance: 0.10, tacticsFit: 0.15 },
    randomRange: 0.10, // 基準値の±10%
    points: { try: 5, conversion: 2, penaltyGoal: 3, dropGoal: 3 },
  },

  // 第10章 大会
  tournaments: {
    summerNational: { teams: 48, seeded: 16 },
    hanazono: { prefectureReps: 47, extraSlots: 8, summerBestFourExtra: 4, rankingExtra: 4 },
  },

  // 第12章 卒業後の進路(総合能力のみで決定)
  careers: { corporateMinOverall: 95, universityMinOverall: 65 },

  // 第15章 セーブ
  save: { manualSlots: 3 },
} as const;

export type GameConfig = typeof gameConfig;
