import assert from 'node:assert/strict';
import { PREFS, schoolsOf } from '../src/data';
import { seed } from '../src/rng';
import {
  newGame, advanceMonth, scout, pickStarters, teamStrength, overall, overallAt, careerFor,
  rankOf, committedCount, MAX_COMMIT, SLOTS, playMatch, nextEvent, setLineupSlot,
} from '../src/game';
import type { GameState } from '../src/game';

let passed = 0;
function t(name: string, fn: () => void): void {
  fn();
  passed++;
  console.log(`  ok - ${name}`);
}

function run(prefIdx: number, type: number, months: number, doScout: boolean): GameState {
  const s = newGame(prefIdx, type);
  for (let i = 0; i < months; i++) {
    if (doScout) scout(s, i % 3 === 2 ? 'national' : i % 3 === 1 ? 'strong' : 'local');
    advanceMonth(s);
    // Tournament rounds are separate advances but do not consume calendar months.
    while (s.pendingTour) advanceMonth(s);
  }
  return s;
}

console.log('game tests');

t('47都道府県と、それぞれ3校がある', () => {
  assert.equal(PREFS.length, 47);
  for (let i = 0; i < 47; i++) {
    const list = schoolsOf(i);
    assert.equal(list.length, 3);
    for (const sc of list) {
      assert.ok(sc.name.length > 3);
      assert.ok(sc.power >= 1 && sc.power <= 5);
    }
  }
  assert.equal(schoolsOf(0)[0].name, '北海道立中央高校');
  assert.equal(schoolsOf(12)[0].name, '東京都立中央高校');
  assert.equal(schoolsOf(26)[0].name, '大阪府立中央高校');
});

t('新規ゲームは27人で、先発15枠がすべて埋まる', () => {
  seed(1);
  const s = newGame(26, 2);
  assert.equal(s.players.length, 27);
  const st = pickStarters(s.players);
  assert.equal(st.length, SLOTS.length);
  assert.ok(st.every((x) => x.player !== null));
  assert.equal(new Set(st.map((x) => x.player?.id)).size, 15);
  const ts = teamStrength(s);
  assert.ok(ts > 20 && ts < 90, `strength ${ts}`);
});

t('先発は重複せず、試合準備で任意に変更できる', () => {
  seed(21);
  const s = newGame(26, 1);
  const before = [...(s.lineup ?? [])];
  assert.equal(before.length, 15);
  assert.equal(new Set(before).size, 15);
  const replacement = s.players.find((p) => p.status === 'active' && !before.includes(p.id));
  if (replacement) {
    const slot = 0;
    const ok = setLineupSlot(s, slot, replacement.id);
    assert.equal(ok, true);
    assert.equal(s.lineup?.[slot], replacement.id);
    assert.equal(new Set(s.lineup).size, 15);
  }
});

t('強い学校ほどチーム力が高い', () => {
  seed(2);
  const avg = (type: number) => {
    let sum = 0;
    for (let i = 0; i < 20; i++) sum += teamStrength(newGame(26, type));
    return sum / 20;
  };
  assert.ok(avg(2) > avg(0) + 5);
});

t('能力値は0〜100に収まる', () => {
  seed(3);
  const s = run(10, 1, 36, true);
  for (const p of s.players) {
    assert.ok(overallAt(p) >= 0 && overallAt(p) <= 100);
    for (const v of Object.values(p.stats)) assert.ok(v >= 0 && v <= 99);
  }
});

t('3年で卒業し、進路が決まる', () => {
  seed(4);
  const s = run(26, 1, 36, true);
  assert.equal(s.year, 4);
  assert.equal(s.month, 4);
  assert.equal(s.grads.length, 3);
  const grads = s.players.filter((p) => p.status === 'graduated');
  assert.ok(grads.length >= 27);
  for (const g of grads) assert.ok(typeof g.career === 'string' && g.career.length > 0);
  const active = s.players.filter((p) => p.status === 'active');
  assert.ok(active.length >= 10);
  assert.ok(active.every((p) => p.grade >= 1 && p.grade <= 3));
});

t('1年目の3月に最初の卒業生が出る', () => {
  seed(5);
  const s = run(0, 0, 12, false);
  assert.equal(s.year, 2);
  assert.equal(s.grads[0].list.length, 9);
});

t('スカウト：月1回、内定は上限まで', () => {
  seed(6);
  const s = newGame(26, 1);
  const r1 = scout(s, 'local');
  assert.ok(r1 && r1.length === 2);
  assert.equal(scout(s, 'local'), null);
  assert.equal(committedCount(s), r1.filter((x) => x.accepted).length);
  for (let i = 0; i < 40; i++) {
    s.scoutedThisMonth = false;
    scout(s, 'local');
  }
  assert.ok(committedCount(s) <= MAX_COMMIT);
});

t('スカウトした選手は4月に入学し、スカウト結果が残る', () => {
  seed(7);
  const s = newGame(26, 2);
  scout(s, 'local');
  const ids = s.players.filter((p) => p.status === 'committed').map((p) => p.id);
  for (let i = 0; i < 12; i++) {
    advanceMonth(s);
    while (s.pendingTour) advanceMonth(s);
  }
  for (const id of ids) {
    const p = s.players.find((x) => x.id === id);
    assert.ok(p && p.status === 'active' && p.grade === 1);
  }
  assert.ok(s.scoutLog.length >= 2);
});

t('大会は決まった月に行われる', () => {
  seed(8);
  const s = newGame(26, 2);
  const kinds: string[] = [];
  for (let i = 0; i < 12; i++) {
    let r = advanceMonth(s);
    while (s.pendingTour) r = advanceMonth(s);
    if (r.tour) {
      kinds.push(`${r.monthBefore}:${r.tour.kind}`);
      assert.ok(r.tour.rounds.length >= 1);
      assert.ok(r.tour.rounds.length <= (r.tour.kind === 'nat' ? 5 : r.tour.kind === 'newbie' ? 3 : 4));
      assert.equal(r.tour.rounds.every((x, idx, arr) => x.win || idx === arr.length - 1), true);
      assert.equal(r.tour.title, r.tour.rounds.every((x) => x.win));
    }
  }
  assert.ok(kinds.includes('7:summer'));
  assert.ok(kinds.includes('11:pref'));
  assert.ok(kinds.includes('2:newbie'));
});

t('試合に引き分けはない', () => {
  seed(9);
  for (let i = 0; i < 500; i++) {
    const m = playMatch(50, 50);
    assert.notEqual(m.my, m.their);
  }
});

t('評判は0〜100に収まる', () => {
  seed(10);
  for (let k = 0; k < 5; k++) {
    const s = run(26, 2, 60, true);
    assert.ok(s.reputation >= 0 && s.reputation <= 100);
  }
});

t('同じシードなら同じ結果になる', () => {
  seed(11);
  const a = run(5, 1, 24, true);
  seed(11);
  const b = run(5, 1, 24, true);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

t('保存データはJSONで往復できる', () => {
  seed(12);
  const s = run(20, 1, 20, true);
  const back = JSON.parse(JSON.stringify(s)) as GameState;
  assert.deepEqual(back, s);
  advanceMonth(back);
});

t('進路は能力に応じて決まる', () => {
  assert.match(careerFor(90), /日本代表候補/);
  assert.match(careerFor(80), /スポーツ推薦/);
  assert.match(careerFor(70), /進学/);
  assert.match(careerFor(30), /就職|専門学校|引退/);
  assert.equal(rankOf(75), 'S');
  assert.equal(rankOf(34), 'E');
});

t('次の大会の案内', () => {
  assert.equal(nextEvent(7).inMonths, 0);
  assert.equal(nextEvent(4).inMonths, 3);
  assert.equal(nextEvent(3).label, '夏季県大会');
});

t('全都道府県で36か月まわしても落ちない', () => {
  seed(13);
  for (let i = 0; i < 47; i++) {
    const s = run(i, i % 3, 36, true);
    assert.equal(s.year, 4);
    assert.ok(s.players.some((p) => overall(p) > 0));
  }
});

console.log(`\n${passed} passed`);
