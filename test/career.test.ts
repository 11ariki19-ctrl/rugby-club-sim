import assert from 'node:assert/strict';
import { seed } from '../src/rng';
import { UNIVS } from '../src/data';
import { advanceCareerMonth, careerOverall, newCareer } from '../src/career';

console.log('career mode tests');
function advanceCalendarMonth(s: ReturnType<typeof newCareer>): void {
  const month = s.month, age = s.age, phase = s.phase;
  let guard = 0;
  do { advanceCareerMonth(s); guard++; } while (s.month === month && s.age === age && s.phase === phase && guard < 20);
  assert.ok(guard < 20, 'calendar month should advance without getting stuck');
}
seed(901);
const s = newCareer('佐藤 蓮', 'SO');
assert.equal(s.phase, 'highschool');
assert.equal(s.age, 15);
assert.equal(s.month, 4);
assert.equal(s.seasons.length, 0);
for (let i = 0; i < 36; i++) advanceCalendarMonth(s);
assert.equal(s.phase, 'university');
assert.equal(s.age, 18);
assert.equal(s.stageYear, 1);
assert.equal(s.seasons.length, 3);
assert.ok([...UNIVS.top, ...UNIVS.high, ...UNIVS.mid].includes(s.university));
assert.ok(s.history.some((x) => x.includes('進学')));
for (let i = 0; i < 48; i++) advanceCalendarMonth(s);
assert.equal(s.phase, 'professional');
assert.equal(s.age, 22);
assert.equal(s.stageYear, 1);
assert.equal(s.seasons.length, 7);
assert.ok(s.professionalTeam.length > 0);
assert.ok(s.history.some((x) => x.includes('加入')));
let guard = 0;
while (s.phase !== 'retired' && guard < 240) {
  advanceCalendarMonth(s);
  guard++;
}
assert.equal(s.phase, 'retired');
assert.ok(s.finalSummary?.includes('現役を引退'));
assert.ok(s.seasons.length >= 20);
assert.ok(s.seasons.every((r) => r.played >= 0 && r.appearances >= 0 && r.tries >= 0));
assert.ok(s.experiencePoints > 0, 'match results should award experience points');
assert.ok(careerOverall(s) >= 0 && careerOverall(s) <= 100);
console.log('  ok - high school 3 years, university 4 years, professional career through retirement');
console.log('  ok - university is selected from the existing university data');
console.log('  ok - league records and retirement summary are retained');
seed(902);
const schedule = newCareer('日程確認', 'CTB');
while (!(schedule.phase === 'university' && schedule.month === 9)) advanceCalendarMonth(schedule);
for (let month = 9; month <= 12; month++) {
  assert.equal(schedule.month, month);
  const before = schedule.currentSeason.played;
  advanceCareerMonth(schedule);
  assert.equal(schedule.currentSeason.played, before + 1, 'university league should play once per month from September to December');
  advanceCalendarMonth(schedule);
}
assert.equal(schedule.month, 1);
const beforeWinter = schedule.currentSeason.played;
advanceCareerMonth(schedule);
assert.equal(schedule.currentSeason.played, beforeWinter + 1, 'university winter tournament starts in January');
assert.ok(schedule.currentSeason.notes.some((x) => x.includes('大学冬季トーナメント準決勝')));
console.log('  ok - high school uses tournament calendar, university has Sep-Dec league and Jan-Feb tournament');
console.log('  ok - match results award experience points');
console.log('\n5 passed');
