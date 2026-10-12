import assert from 'node:assert/strict';
import { seed } from '../src/rng';
import { PREFS } from '../src/data';
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
assert.ok(['関東大学対抗戦A','関東大学リーグ戦1部','関西大学Aリーグ'].includes(s.universityGroup));
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
console.log('  ok - university is assigned to a 2025 official league group');
console.log('  ok - league records and retirement summary are retained');
seed(902);
const schedule = newCareer('日程確認', 'CTB', 26, '大阪学院高校');
assert.equal(schedule.prefIndex, 26);
assert.equal(PREFS[schedule.prefIndex].name, '大阪府');
while (!(schedule.phase === 'university' && schedule.month === 9)) advanceCalendarMonth(schedule);
for (let month = 9; month <= 11; month++) {
  while (schedule.month === month) advanceCareerMonth(schedule);
  if (month < 11) assert.equal(schedule.month, month + 1);
}
assert.equal(schedule.currentSeason.leaguePlayed, 7, 'university league has seven matches for an eight-team round robin');
assert.ok(schedule.currentSeason.notes.some((x) => x.includes('関西大学Aリーグ') || x.includes('関東大学')));
console.log('  ok - university league has seven official matches across September-November');
assert.ok(schedule.matchHistory.length > 0);
assert.ok(schedule.lastMatch?.scenes.length);
assert.ok(schedule.lastMatch?.experience > 0);
console.log('  ok - match report includes scenes, individual performance, and experience points');
seed(903);
const candidate = newCareer('代表候補テスト', 'WTB', 26, '大阪学院高校');
candidate.stageYear = 3; candidate.month = 2;
candidate.highSchoolAppearances = 6; candidate.highSchoolTries = 3;
candidate.highSchoolRatingTotal = 42; candidate.highSchoolRatingCount = 6;
advanceCareerMonth(candidate);
assert.equal(candidate.nationalCandidate, true);
assert.equal(candidate.pendingTournament?.kind, 'world');
assert.ok(candidate.lastMatch?.opponent === 'ニュージーランド');
console.log('  ok - standout high-school player can be selected for the February world tournament');
console.log('\n6 passed');
