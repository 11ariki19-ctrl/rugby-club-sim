/** セーブデータ形式のバージョン。形式を変えたら上げる。 */
export const SAVE_FORMAT_VERSION = 1;

export type SaveSlotId = 'auto' | 'slot1' | 'slot2' | 'slot3';

/** 第1段階では骨組みのみ。中身は各段階で拡張する。 */
export interface SaveData {
  formatVersion: number;
  savedAt: string; // ISO 8601
  gameYear: number;
  gameMonth: number; // 1〜12
}
