import assert from 'node:assert/strict';
import { seed, rand } from '../src/rng';
import { PREFS, SURNAMES } from '../src/data';
import { generateUniquePlayerName, generateUniqueJapaneseName, inferPlayerCountry } from '../src/names';
import { advanceCareerMonth, careerAppearanceProbability, careerOverall, newCareer, setCareerTrainingPlan, resolveCareerTransfer, careerLegacyScore, beginCareerLiveMatch, careerGrowthMultiplier, careerTeamStrengthProfile, WORLD_CUP_TEAMS, worldCupPools, saveCareer, loadCareer, setCareerSaveSlot, clearCareer, nationalCandidatePool, careerRoleByPositionalRank, nationalMatchRole } from '../src/career';

console.log('career mode tests');
const initialPlayer = newCareer('年代調整テスト', 'CTB');
seed(774411);
const generatedNameSet = new Set<string>();
for (let i = 0; i < 5000; i++) generateUniqueJapaneseName(generatedNameSet, rand);
assert.equal(generatedNameSet.size, 5000, 'generated full names remain unique across a large batch');
assert.ok([...generatedNameSet].every((name) => SURNAMES.includes(name.split(' ')[0] as never) && name.split(' ').length === 2), 'generated names use a top-300 surname and full name format');
assert.equal(new Set(initialPlayer.rivals.map((r) => r.name)).size, initialPlayer.rivals.length, 'career rival full names are unique');
assert.ok(initialPlayer.rivals.every((r) => SURNAMES.includes(r.name.split(' ')[0] as never)), 'career rivals use the top-300 surname pool');
console.log('  ok - unique random full names and top-300 surname pool');
const overseasNames = new Set<string>();
const nzName = generateUniquePlayerName(overseasNames, 'NZ', rand);
const frenchName = generateUniquePlayerName(overseasNames, 'フランス', rand);
const fijianName = generateUniquePlayerName(overseasNames, 'Fiji', rand);
assert.ok(['Smith','Williams','Brown','Taylor','Wilson','Martin','Thompson','Anderson','Walker','Robinson','Clarke','Wright'].includes(nzName.split(' ').at(-1) ?? ''), 'New Zealand player uses a local surname pool');
assert.ok(['Martin','Bernard','Dubois','Thomas','Robert','Richard','Petit','Durand','Leroy','Moreau','Laurent','Simon'].includes(frenchName.split(' ').at(-1) ?? ''), 'French player uses a French surname pool');
assert.ok(['Radradra','Tuisova','Nayacalevu','Botia','Yato','Nakarawa','Mata','Vunivalu','Nadolo','Waqaniburotu','Tawake','Drua'].includes(fijianName.split(' ').at(-1) ?? ''), 'Fijian player uses a Fijian surname pool');
assert.equal(new Set([nzName, frenchName, fijianName]).size, 3, 'international names stay unique across nationalities');
assert.equal(inferPlayerCountry('Leinster Rugby'), 'Ireland', 'Irish club resolves to Ireland');
assert.equal(inferPlayerCountry('Stade Toulousain'), 'France', 'French club resolves to France');
console.log('  ok - overseas names follow nationality and remain unique');
assert.ok(careerOverall(initialPlayer) >= 25 && careerOverall(initialPlayer) < 60, 'new high school player starts within a plausible rating range');
const eliteSchool = careerTeamStrengthProfile('highschool', '東福岡');
const averageSchool = careerTeamStrengthProfile('highschool', '北海道県立選抜');
const proClub = careerTeamStrengthProfile('professional', '埼玉パナソニックワイルドナイツ');
assert.ok(eliteSchool.center > averageSchool.center, 'elite high schools are stronger than ordinary high schools');
assert.ok(proClub.center > eliteSchool.center, 'professional squads have a higher baseline than high school squads');
const selectionProbe = newCareer('代表選考テスト', 'CTB');
assert.equal(nationalCandidatePool(selectionProbe).length, 23, 'national squad has exactly 23 players when enough candidates exist');
assert.ok(nationalCandidatePool(selectionProbe).every((p) => p.overall < 90), 'high school national candidates do not have wildly inflated ratings');
console.log('  ok - realistic age-category rating distribution and 23-player national squad limit');

const storageData = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => storageData.get(key) ?? null,
  setItem: (key: string, value: string) => { storageData.set(key, value); },
  removeItem: (key: string) => { storageData.delete(key); },
}});
setCareerSaveSlot(1);
const slotOne = newCareer('スロット1', 'CTB'); saveCareer(slotOne);
setCareerSaveSlot(2);
const slotTwo = newCareer('スロット2', 'FL'); saveCareer(slotTwo);
setCareerSaveSlot(1); assert.equal(loadCareer(1)?.player.name, 'スロット1', 'slot one persists independently');
setCareerSaveSlot(2); assert.equal(loadCareer(2)?.player.name, 'スロット2', 'slot two persists independently');
clearCareer(2);
setCareerSaveSlot(2); assert.equal(loadCareer(2), null, 'clearing slot two leaves it empty');
setCareerSaveSlot(1); assert.equal(loadCareer(1)?.player.name, 'スロット1', 'clearing slot two does not delete slot one');
setCareerSaveSlot(1);
console.log('  ok - independent local save slots and slot-specific clearing');

assert.equal(WORLD_CUP_TEAMS.length, 32, 'World Cup roster contains 32 nations');
assert.equal(new Set(WORLD_CUP_TEAMS).size, 32, 'World Cup nations are unique');
const pools = worldCupPools();
assert.equal(pools.length, 8, 'World Cup has eight pools');
assert.ok(pools.every((pool) => pool.length === 4), 'each World Cup pool has four nations');
assert.equal(new Set(pools.flat()).size, 32, 'each nation appears in exactly one pool');
assert.ok(pools.flat().includes('日本'), 'Japan is included in the World Cup pools');
console.log('  ok - World Cup format: 32 nations, 8 pools of 4');

const weakSchoolProfile = careerTeamStrengthProfile('highschool', '青森県立中央高校');
const eliteSchoolProfile = careerTeamStrengthProfile('highschool', '桐蔭学園');
const weakUniversityProfile = careerTeamStrengthProfile('university', '青森学院大学');
const eliteUniversityProfile = careerTeamStrengthProfile('university', '帝京大学');
assert.ok(weakSchoolProfile.center < eliteSchoolProfile.center, 'school ratings should follow school strength');
assert.ok(weakSchoolProfile.max <= 59, 'one- or two-star high schools must not generate many 70+ players');
assert.ok(eliteSchoolProfile.max > weakSchoolProfile.max, 'elite high schools may generate stronger players');
assert.ok(weakUniversityProfile.center < eliteUniversityProfile.center, 'university ratings should follow university strength');
assert.ok(eliteUniversityProfile.max <= 94, 'university squad ratings should remain within the club-strength ceiling');

function advanceCalendarMonth(s: ReturnType<typeof newCareer>): void {
  const month = s.month, age = s.age, phase = s.phase;
  let guard = 0;
  do { advanceCareerMonth(s); guard++; } while (s.month === month && s.age === age && s.phase === phase && guard < 20);
  assert.ok(guard < 20, 'calendar month should advance without getting stuck');
}
seed(901);
const s = newCareer('佐藤 蓮', 'SO');
assert.equal(s.player.talentType, '凡人');
seed(904);
const ordinary = newCareer('凡人テスト', 'CTB', 26, '大阪学院高校', '凡人');
seed(904);
const scholar = newCareer('秀才テスト', 'CTB', 26, '大阪学院高校', '秀才');
seed(904);
const genius = newCareer('天才テスト', 'CTB', 26, '大阪学院高校', '天才');
for (const key of Object.keys(ordinary.player.stats) as (keyof typeof ordinary.player.stats)[]) {
  assert.equal(scholar.player.stats[key], ordinary.player.stats[key] + 10, 'scholar starts at ordinary +10');
  assert.equal(genius.player.stats[key], ordinary.player.stats[key] + 15, 'genius starts at ordinary +15');
}
seed(905);
const specialist = newCareer('一芸テスト', 'WTB', 26, '大阪学院高校', '一芸');
const specialistValues = Object.values(specialist.player.stats);
assert.ok(Math.min(...specialistValues) >= 15 && Math.min(...specialistValues) <= 20, 'specialist minimum stat is between 15 and 20');
assert.ok(specialistValues.some((value) => value === Math.min(...specialistValues) * 3), 'specialist has one stat three times the minimum');
assert.equal(careerGrowthMultiplier(genius), 1.35, 'genius talent improves growth without causing runaway ratings');
assert.equal(careerGrowthMultiplier(scholar), 1.12, 'scholar talent receives a modest growth bonus');
assert.equal(careerGrowthMultiplier(ordinary), 1, 'ordinary talent keeps the existing growth rate');
console.log('  ok - four selectable talent types apply their specified starting stats');
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
const proSeasons = s.seasons.filter((r) => r.phase === 'professional');
const expectedLeagueMatches: Record<string, number> = { 'リーグワン': 18, 'リーグワンD2': 14, 'リーグワンD3': 15, 'イングランド・プレミアシップ': 18, 'フランス・トップ14': 26, 'フランス・プロD2': 30, 'ユナイテッド・ラグビー・チャンピオンシップ': 18, 'スーパーラグビー・パシフィック': 14, 'メジャーリーグラグビー': 16, 'カリーカップ': 14 };
assert.ok(proSeasons.length > 0);
assert.ok(proSeasons.every((r) => r.leaguePlayed === (expectedLeagueMatches[r.league || 'リーグワン'] ?? 18)), 'each pro season should use its selected league schedule');
assert.ok(s.experiencePoints > 0, 'match results should award experience points');
assert.ok(careerOverall(s) >= 0 && careerOverall(s) <= 200);
for (const value of Object.values(s.player.stats)) assert.ok(value >= 0 && value <= 200, 'career abilities must stay within the 200-point cap');
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
const report = schedule.lastMatch!;
assert.ok(report.scoreEvents && report.scoreEvents.length > 0, 'match report records scoring events');
assert.equal(report.scoreEvents!.reduce((sum, event) => sum + (event.side === '自チーム' ? event.points : 0), 0), report.my, 'home scoring events add up to the final score');
assert.equal(report.scoreEvents!.reduce((sum, event) => sum + (event.side === '相手' ? event.points : 0), 0), report.their, 'opponent scoring events add up to the final score');
assert.ok(report.scoreEvents!.every(event => event.minute >= 1 && event.minute <= 80 && event.scorer.length > 0), 'each scoring event has a scorer and a valid match minute');
assert.equal(report.tries, report.scoreEvents!.filter(event => event.side === '自チーム' && event.scorer === schedule.player.name && event.points !== 3).length, 'player try tally matches the scoring timeline');
console.log('  ok - match scoring timeline includes scorer and minute, with points and player try totals consistent');
seed(903);
const candidate = newCareer('代表候補テスト', 'WTB', 26, '大阪学院高校');
candidate.stageYear = 3; candidate.month = 2;
for (const key of Object.keys(candidate.player.stats) as (keyof typeof candidate.player.stats)[]) candidate.player.stats[key] = 140;
candidate.highSchoolAppearances = 6; candidate.highSchoolTries = 3;
candidate.highSchoolRatingTotal = 42; candidate.highSchoolRatingCount = 6;
advanceCareerMonth(candidate);
assert.equal(candidate.nationalCandidate, true);
assert.equal(candidate.pendingTournament?.kind, 'world');
assert.ok(candidate.lastMatch?.opponent === 'オーストラリア');
console.log('  ok - standout high-school player can be selected for the February world tournament');
console.log('  ok - pro career uses league-specific regular-season match counts');
seed(906);
const national = newCareer('日本代表テスト', 'SO', 26, '大阪学院高校', '天才');
national.phase = 'university'; national.age = 19; national.stageYear = 2; national.month = 5;
for (const key of Object.keys(national.player.stats) as (keyof typeof national.player.stats)[]) national.player.stats[key] = 120;
advanceCareerMonth(national);
assert.equal(national.japanNationalTeamSelected, true, 'university standout should be selected for Japan by positional ranking');
assert.ok((national.nationalSquad ?? []).some((p) => p.name === national.player.name && p.year === '2年'), 'university representative roster should show school year');
let internationalGuard = 0;
while (national.japanNationalTeamCaps === 0 && internationalGuard < 30) { advanceCareerMonth(national); internationalGuard++; }
assert.ok(national.japanNationalTeamCaps > 0, 'university Japan selection should play international tests');
console.log('  ok - university standouts can be selected for Japan and play test matches');
// 学年・高校時代の実績・大学での競争・プロ入り時の契約を出場確率に反映する。
const appearances = newCareer('出場機会テスト', 'CTB', 26, '大阪学院高校');
for (const key of Object.keys(appearances.player.stats) as (keyof typeof appearances.player.stats)[]) appearances.player.stats[key] = 60;
appearances.player.talent = 1;
appearances.stageYear = 1;
const hsYear1 = careerAppearanceProbability(appearances);
appearances.stageYear = 3;
const hsYear3 = careerAppearanceProbability(appearances);
assert.ok(hsYear3 > hsYear1, 'high school third-year players should have more opportunities than first-years');
appearances.phase = 'university'; appearances.stageYear = 1;
const uniYear1 = careerAppearanceProbability(appearances);
appearances.stageYear = 4;
const uniYear4 = careerAppearanceProbability(appearances);
assert.ok(uniYear4 > uniYear1, 'university fourth-years should have more opportunities than first-years');
appearances.highSchoolAppearances = 10; appearances.highSchoolTries = 5;
appearances.highSchoolRatingTotal = 72; appearances.highSchoolRatingCount = 10;
appearances.stageYear = 1;
assert.ok(careerAppearanceProbability(appearances) > uniYear1 + 0.2, 'high-school stars can enter university with starter-level opportunities');
appearances.stageYear = 2;
appearances.seasons = [{ age: 18, phase: 'university', year: 1, team: '大学', played: 12, leaguePlayed: 7, leagueWins: 3, leagueLosses: 4, leagueDraws: 0, wins: 4, losses: 8, draws: 0, pointsFor: 200, pointsAgainst: 300, appearances: 2, tries: 0, notes: [] }];
assert.ok(careerAppearanceProbability(appearances) < uniYear1 + 0.15, 'a high-school star can lose opportunities in university year two after limited first-year appearances');
appearances.phase = 'professional'; appearances.stageYear = 1; appearances.professionalStarterGuaranteed = false;
const proReserve = careerAppearanceProbability(appearances);
appearances.professionalStarterGuaranteed = true;
const proStar = careerAppearanceProbability(appearances);
assert.equal(proStar, 1, 'a guaranteed professional starter must always appear in the match simulation');
assert.ok(proStar > proReserve + 0.4, 'university stars with a guaranteed starting role should start their pro career with much higher selection odds');
console.log('  ok - appearance opportunities progress by year and reflect reputation, competition, and pro starter contracts');
assert.ok(proStar > proReserve + 0.4, 'university stars with a guaranteed starting role should start their pro career with much higher selection odds');
appearances.injuryMonths = 2;
assert.equal(careerAppearanceProbability(appearances), proStar, 'legacy injury save fields do not affect selection because injury mechanics are disabled');
appearances.injuryMonths = 0;
assert.equal(appearances.trainingPlan, 'バランス');
setCareerTrainingPlan(appearances, '技術');
assert.equal(appearances.trainingPlan, '技術', 'training plans can be changed without fatigue or injury recovery settings');
const transfer = newCareer('移籍テスト', 'CTB');
transfer.phase = 'professional'; transfer.age = 26; transfer.professionalTeam = 'テストクラブ'; transfer.proDivision = 2;
transfer.pendingTransfer = { age: 26, offers: [{ team: '海外クラブ（欧州リーグ）', division: 1, salary: 2800, overseas: true }] };
resolveCareerTransfer(transfer, 0);
assert.equal(transfer.professionalTeam, '海外クラブ（欧州リーグ）');
assert.equal(transfer.proDivision, 1);
assert.equal(transfer.proSalary, 2800);
assert.equal(transfer.pendingTransfer, undefined);
assert.ok(transfer.transferHistory[0].includes('海外移籍'));
assert.ok(careerLegacyScore(transfer) >= 0, 'career legacy score is computed from career achievements');
assert.ok(s.seasons.every((r) => (r.starts ?? 0) + (r.substituteApps ?? 0) + (r.bench ?? 0) + (r.notSelected ?? 0) === r.played), 'every played fixture is recorded as starter, substitute, bench, or not selected');
assert.ok(s.matchHistory.every((m) => ['先発','途中出場','控え','メンバー外'].includes(m.role ?? (m.appeared ? '先発' : 'メンバー外'))), 'match reports include an explicit selection role');
assert.ok(s.rivals.length >= 3, 'career includes persistent rivals');
console.log('  ok - deterministic selection roles, simplified training plans, transfers, rivals, and legacy records');
const positionalSelection = newCareer('ポジション順位テスト', 'CTB');
positionalSelection.phase = 'highschool';
positionalSelection.rivals = [70, 65, 60, 55].map((overall, index) => ({
  name: `同ポジション選手${index + 1}`, pos: 'CTB' as const, age: 16, overall,
  phase: 'highschool' as const, team: positionalSelection.highSchool, country: '日本',
  league: '高校ラグビー', appearances: 0, tries: 0, retired: false,
}));
assert.equal(careerRoleByPositionalRank(positionalSelection, 72), '先発', 'top same-position rating starts');
assert.equal(careerRoleByPositionalRank(positionalSelection, 62), '途中出場', 'next same-position rating is a substitute');
assert.equal(careerRoleByPositionalRank(positionalSelection, 50), '控え', 'lower same-position ratings fall behind starters and substitutes');
const representativeCareer = newCareer('代表選抜テスト', 'CTB', 24);
representativeCareer.phase = 'professional';
representativeCareer.japanNationalTeamSelected = true;
representativeCareer.nationalSquad = [
  { name: '代表センターA', pos: 'CTB', age: 25, overall: 90, phase: 'professional', team: '代表', country: '日本', league: '日本代表', appearances: 0, tries: 0, retired: false },
  { name: '代表選抜テスト', pos: 'CTB', age: 24, overall: 80, phase: 'professional', team: '代表', country: '日本', league: '日本代表', appearances: 0, tries: 0, retired: false },
  { name: '代表センターB', pos: 'CTB', age: 23, overall: 75, phase: 'professional', team: '代表', country: '日本', league: '日本代表', appearances: 0, tries: 0, retired: false },
];
assert.equal(nationalMatchRole(representativeCareer, 'japan-test'), '先発', 'selected national squad player starts when inside the positional starting slots');
representativeCareer.nationalSquad = representativeCareer.nationalSquad.map(p => p.name === '代表選抜テスト' ? { ...p, overall: 60 } : p);
assert.equal(nationalMatchRole(representativeCareer, 'world-cup'), '途中出場', 'selected national squad player is at least a substitute even when below the starter rank');
representativeCareer.japanNationalTeamSelected = false;
assert.equal(nationalMatchRole(representativeCareer, 'japan-test'), undefined, 'players not selected for Japan are not assigned a national-team role');
const simulatedCareer = newCareer('自動試合テスト', 'CTB');
simulatedCareer.phase = 'professional'; simulatedCareer.stageYear = 1; simulatedCareer.professionalStarterGuaranteed = true;
beginCareerLiveMatch(simulatedCareer, 'fixture', { date: 'テスト日', label: 'キャリア自動試合テスト', opponent: 'テストクラブ', difficulty: 45, kind: 'university-spring' });
assert.equal(simulatedCareer.liveMatch, undefined, 'matches resolve automatically without entering a playable mode');
assert.equal(simulatedCareer.matchHistory.length, 1, 'automatically simulated match is recorded');
assert.equal(simulatedCareer.lastMatch?.competition, 'キャリア自動試合テスト');
assert.equal(simulatedCareer.currentSeason.played, 1, 'automatic simulation updates the season record exactly once');
console.log('  ok - matches are simulated automatically without an interactive play mode');
console.log('\n10 passed');
