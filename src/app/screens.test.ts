import { describe, it, expect } from 'vitest';
import { SCREENS, getScreen } from './screens';

describe('画面定義', () => {
  it('仕様書どおり17画面ある', () => {
    expect(SCREENS.length).toBe(17);
  });

  it('画面IDが重複しない', () => {
    expect(new Set(SCREENS.map((s) => s.id)).size).toBe(SCREENS.length);
  });

  it('下部ナビ常時表示は4つ以内(+メニュー)', () => {
    expect(SCREENS.filter((s) => s.primary).length).toBeLessThanOrEqual(4);
  });

  it('getScreen で取得できる', () => {
    expect(getScreen('home').label).toBe('ホーム・監督室');
  });
});
