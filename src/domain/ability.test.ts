import { describe, it, expect } from 'vitest';
import { clampAbility, clampAbilities, isValidAbilities } from './ability';
import { ABILITY_KEYS, STARTING_SLOTS, type Abilities } from '../types/player';

const makeAbilities = (v: number): Abilities =>
  Object.fromEntries(ABILITY_KEYS.map((k) => [k, v])) as Abilities;

describe('能力値の範囲', () => {
  it('能力は14項目ある', () => {
    expect(ABILITY_KEYS.length).toBe(14);
  });

  it('先発は15人分のスロットがある', () => {
    expect(STARTING_SLOTS.length).toBe(15);
  });

  it('通常選手は 0〜100 に収まる', () => {
    expect(clampAbility(-5, false)).toBe(0);
    expect(clampAbility(120, false)).toBe(100);
    expect(clampAbility(63.6, false)).toBe(64);
  });

  it('天才選手は100を超えられるが0未満にはならない', () => {
    expect(clampAbility(112, true)).toBe(112);
    expect(clampAbility(-3, true)).toBe(0);
  });

  it('NaN は最小値になる', () => {
    expect(clampAbility(Number.NaN, false)).toBe(0);
  });

  it('clampAbilities は元のデータを変更しない', () => {
    const src = makeAbilities(130);
    const out = clampAbilities(src, false);
    expect(src.speed).toBe(130);
    expect(out.speed).toBe(100);
  });

  it('isValidAbilities が範囲外を検出する', () => {
    expect(isValidAbilities(makeAbilities(100), false)).toBe(true);
    expect(isValidAbilities(makeAbilities(101), false)).toBe(false);
    expect(isValidAbilities(makeAbilities(101), true)).toBe(true);
    expect(isValidAbilities(makeAbilities(-1), true)).toBe(false);
  });
});
