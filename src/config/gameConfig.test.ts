import { describe, it, expect } from 'vitest';
import { gameConfig } from './gameConfig';

describe('gameConfig(仕様書の初期値)', () => {
  it('学校ランク別の部員数・新入生・上限が仕様どおり', () => {
    const r = gameConfig.rankSettings;
    expect([r.weak.initialMembers, r.weak.yearlyNewcomers, r.weak.memberCap]).toEqual([20, 5, 40]);
    expect([r.mid.initialMembers, r.mid.yearlyNewcomers, r.mid.memberCap]).toEqual([30, 8, 50]);
    expect([r.strong.initialMembers, r.strong.yearlyNewcomers, r.strong.memberCap]).toEqual([40, 12, 60]);
  });

  it('試合力の重みの合計が100%になる', () => {
    const w = gameConfig.match.powerWeights;
    expect(w.starters + w.bench + w.positionBalance + w.tacticsFit).toBeCloseTo(1, 10);
    expect(w.starters).toBe(0.65);
  });

  it('得点の点数が仕様どおり', () => {
    expect(gameConfig.match.points).toEqual({ try: 5, conversion: 2, penaltyGoal: 3, dropGoal: 3 });
  });

  it('天才・練習倍率・スカウトの初期値が仕様どおり', () => {
    expect(gameConfig.genius.enrollBonus).toBe(15);
    expect(gameConfig.genius.practiceMultiplier).toBe(1.5);
    expect(gameConfig.practice).toEqual({ team: 1.3, position: 1.2, individual: 1.0 });
    expect(gameConfig.scout.candidatesPerAttempt).toBe(5);
    expect(gameConfig.scout.abilityRangeWidth).toBe(15);
  });

  it('大会の枠数が仕様どおり(夏48校、花園 47+8)', () => {
    expect(gameConfig.tournaments.summerNational.teams).toBe(48);
    expect(gameConfig.tournaments.summerNational.seeded).toBe(16);
    const h = gameConfig.tournaments.hanazono;
    expect(h.prefectureReps + h.extraSlots).toBe(55);
    expect(h.summerBestFourExtra + h.rankingExtra).toBe(h.extraSlots);
  });

  it('進路の境界値が仕様どおり', () => {
    expect(gameConfig.careers.corporateMinOverall).toBe(95);
    expect(gameConfig.careers.universityMinOverall).toBe(65);
  });
});
