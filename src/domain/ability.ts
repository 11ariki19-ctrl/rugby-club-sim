import { gameConfig } from '../config/gameConfig';
import { ABILITY_KEYS, type Abilities, type AbilityKey } from '../types/player';

/**
 * 能力値を有効な範囲に収める。
 * 通常選手は 0〜100。天才選手は上限なし(100超えOK)だが 0 未満にはならない。
 */
export function clampAbility(value: number, isGenius: boolean): number {
  const { min, normalMax } = gameConfig.ability;
  const rounded = Math.round(value);
  if (Number.isNaN(rounded)) return min;
  const lowered = Math.max(min, rounded);
  return isGenius ? lowered : Math.min(normalMax, lowered);
}

/** 全能力に clampAbility を適用した新しいオブジェクトを返す(元は変更しない)。 */
export function clampAbilities(abilities: Abilities, isGenius: boolean): Abilities {
  const result = { ...abilities };
  for (const key of ABILITY_KEYS) {
    result[key] = clampAbility(abilities[key], isGenius);
  }
  return result;
}

/** 14項目すべてが有効範囲内かを判定する。 */
export function isValidAbilities(abilities: Abilities, isGenius: boolean): boolean {
  return ABILITY_KEYS.every((key: AbilityKey) => {
    const v = abilities[key];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < gameConfig.ability.min) return false;
    return isGenius ? true : v <= gameConfig.ability.normalMax;
  });
}
