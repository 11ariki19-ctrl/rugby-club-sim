import type { GameState } from './game';

const KEY = 'rugby-club-sim:v1';

export function saveGame(s: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 保存できない環境では何もしない */
  }
}

export function loadGame(): GameState | null {
  try {
    const t = localStorage.getItem(KEY);
    if (!t) return null;
    const s = JSON.parse(t) as GameState;
    return s && s.v === 1 && Array.isArray(s.players) ? s : null;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  return loadGame() !== null;
}

export function clearGame(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 何もしない */
  }
}
