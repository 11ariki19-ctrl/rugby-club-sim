import { PREFS, SUFFIX, SURNAMES, schoolsOf, allSchools } from './data';
import { generateUniquePlayerName, inferPlayerCountry } from './names';
import { rand, int, pick, gauss, clamp } from './rng';
import { POS_LABEL, STAT_KEYS, STAT_LABEL, overallAt, rankOf } from './game';
import type { Pos, StatKey, Stats } from './game';

export type CareerPhase = 'highschool' | 'university' | 'professional' | 'retired';
export type CareerTalentType = '凡人' | '秀才' | '天才' | '一芸';
export type CareerRole = '先発' | '途中出場' | '控え' | 'メンバー外';
export type CareerTrainingPlan = 'バランス' | '筋力' | '技術' | '持久力';
export interface CareerRival { id?: string; name: string; pos: Pos; age: number; overall: number; stats?: Stats; height?: number; weight?: number; careerPath?: { phase: Exclude<CareerPhase, 'retired'>; age: number; team: string; year: number }[]; phase: CareerPhase; team: string; country?: string; league?: string; appearances: number; tries: number; retired: boolean; }
export const CAREER_TALENTS: { id: CareerTalentType; label: string; description: string }[] = [
  { id: '凡人', label: '凡人', description: '現行仕様のランダム能力・成長' },
  { id: '秀才', label: '秀才', description: '凡人の初期能力に全ステータス+10' },
  { id: '天才', label: '天才', description: '凡人の初期能力に全ステータス+15' },
  { id: '一芸', label: '一芸', description: '1能力が最低能力の3倍。最低能力は15〜20' },
];
export interface CareerSeason {
  age: number;
  phase: Exclude<CareerPhase, 'retired'>;
  year: number;
  team: string;
  league?: string;
  played: number;
  leaguePlayed: number;
  leagueWins: number;
  leagueLosses: number;
  leagueDraws: number;
  wins: number;
  losses: number;
  draws: number;
  pointsFor: number;
  pointsAgainst: number;
  appearances: number;
  starts?: number;
  substituteApps?: number;
  bench?: number;
  notSelected?: number;
  tries: number;
  awards?: string[];
  notes: string[];
}
export interface CareerScoreEvent {
  minute: number;
  side: '自チーム' | '相手';
  points: 3 | 5 | 7;
  scorer: string;
  method: 'ペナルティゴール' | 'トライ（コンバージョン成功）' | 'トライ（コンバージョン失敗）';
}
export interface CareerMatch {
  date: string; competition: string; opponent: string; my: number; their: number;
  result: '勝利' | '引分' | '敗戦'; appeared: boolean; role?: CareerRole; tries: number; carries: number;
  tackles: number; lineBreaks: number; kicks: number; errors: number; rating: number;
  experience: number; scenes: string[]; scoreEvents?: CareerScoreEvent[];
}
export interface CareerFixture {
  date: string; label: string; opponent: string; difficulty: number;
  kind: 'university-league' | 'university-spring' | 'university-championship' | 'university-playoff' | 'professional-league' | 'professional-playoff' | 'japan-test' | 'world-cup' | 'highschool' | 'world';
}
export type CareerMatchAction = 'carry' | 'pass' | 'kick' | 'goal' | 'scrum' | 'lineout' | 'rush' | 'drift' | 'jackal';
export interface CareerLiveMatch {
  source: 'tournament' | 'fixture'; fixture: CareerFixture; elapsed: number; possession: '自チーム' | '相手'; fieldPosition: number;
  scoreFor: number; scoreAgainst: number; role: CareerRole; tries: number; carries: number; tackles: number; lineBreaks: number; kicks: number; errors: number;
  scenes: string[]; lastEvent: string; actions: number;
}
export interface CareerPlayer {
  name: string;
  pos: Pos;
  stats: Stats;
  talent: number;
  talentType: CareerTalentType;
  height: number;
  weight: number;
  peak: number;
}
export interface CareerRosterSeason {
  age: number; phase: Exclude<CareerPhase, 'retired'>; year: number; team: string;
  appearances: number; starts: number; tries: number; tackles: number; wins: number; losses: number; draws: number;
}
export interface CareerRosterPlayer {
  id: string; name: string; pos: Pos; number: number; age: number; phase: CareerPhase; team: string;
  stats: Stats; height: number; weight: number; overall: number; isUser?: boolean;
  seasons: CareerRosterSeason[]; currentSeason: CareerRosterSeason;
  careerPath: { phase: Exclude<CareerPhase, 'retired'>; age: number; team: string; year: number }[];
}
export interface CareerState {
  v: 1;
  phase: CareerPhase;
  age: number;
  month: number;
  stageYear: number;
  elapsedMonths: number;
  prefIndex: number;
  experiencePoints: number;
  qualified: boolean;
  universityTournamentFinalist: boolean;
  pendingTournament?: { name: string; kind: 'summer' | 'pref' | 'nat' | 'newbie' | 'world'; totalRounds: number; rounds: number; wins: number };
  pendingFixtures?: CareerFixture[]; liveMatch?: CareerLiveMatch; lastMatch?: CareerMatch; matchHistory: CareerMatch[];
  highSchoolAppearances: number; highSchoolTries: number; highSchoolRatingTotal: number; highSchoolRatingCount: number;
  nationalCandidate: boolean; worldTournamentWins: number;
  worldCup?: { year: number; pool: string; poolOpponents: string[]; poolRivalWins: number[]; poolPlayed: number; poolWins: number; qualified: boolean; knockoutStage: number; completed: boolean };
  japanNationalTeamSelected: boolean; japanNationalTeamCaps: number; japanNationalTeamWins: number; nationalSquad?: { name: string; pos: Pos; overall: number; team: string; year?: string; country?: string }[];
  professionalStarterGuaranteed: boolean;
  fatigue: number;
  injuryMonths: number;
  injurySeverity?: string;
  morale: number;
  trainingPlan: CareerTrainingPlan;
  proContractYears: number;
  proSalary: number;
  pendingTransfer?: { offers: { team: string; division: 1 | 2 | 3; salary: number; overseas: boolean; league?: string }[]; age: number };
  transferHistory: string[];
  rivals: CareerRival[];
  generatedNameVersion?: number;
  legacyScore?: number;
  awards: string[];
  universityGroup: '関東大学対抗戦A' | '関東大学対抗戦B' | '関東大学リーグ戦1部' | '関東大学リーグ戦2部' | '関西大学Aリーグ' | '関西大学Bリーグ';
  universityQualified: boolean; universityTournamentAlive: boolean; universityPlayoff?: { targetGroup: CareerState['universityGroup']; wins: number; losses: number };
  proDivision: 1 | 2 | 3; proMatchIndex: number; proSchedule: CareerFixture[]; proStandings?: { team: string; wins: number }[];
  tournamentCompletedMonth?: number;
  training: StatKey;
  player: CareerPlayer;
  rosterPlayers?: CareerRosterPlayer[];
  playerArchive?: CareerRosterPlayer[];
  opponentRosters?: Record<string, CareerRosterPlayer[]>;
  highSchool: string;
  university: string;
  universityTier: string;
  professionalTeam: string;
  professionalLeague?: string;
  retirementAge: number;
  seasons: CareerSeason[];
  currentSeason: CareerSeason;
  history: string[];
  finalSummary?: string;
}
const KEY = 'rugby-club-sim:career:v1';
let activeCareerSlot: 1 | 2 = 1;
export function setCareerSaveSlot(slot: 1 | 2): void { activeCareerSlot = slot; }
export function getCareerSaveSlot(): 1 | 2 { return activeCareerSlot; }
function slotKey(slot: 1 | 2): string { return `${KEY}:slot${slot}`; }
const POSITIONS: Pos[] = ['PR', 'HO', 'LO', 'FL', 'N8', 'SH', 'SO', 'CTB', 'WTB', 'FB'];
const BODY: Record<Pos, [number, number]> = {
  PR: [172, 92], HO: [172, 86], LO: [183, 90], FL: [177, 82], N8: [180, 88],
  SH: [167, 66], SO: [170, 68], CTB: [173, 76], WTB: [172, 68], FB: [172, 70],
};
const PRO_TEAMS: Record<1 | 2 | 3, string[]> = {
  1: ['埼玉パナソニックワイルドナイツ','東芝ブレイブルーパス東京','クボタスピアーズ船橋・東京ベイ','東京サントリーサンゴリアス','コベルコ神戸スティーラーズ','横浜キヤノンイーグルス','静岡ブルーレヴズ','三菱重工相模原ダイナボアーズ','トヨタヴェルブリッツ','三重ホンダヒート','リコーブラックラムズ東京','浦安D-Rocks'],
  2: ['花園近鉄ライナーズ','豊田自動織機シャトルズ愛知','NECグリーンロケッツ東葛','レッドハリケーンズ大阪','清水建設江東ブルーシャークス','日本製鉄釜石シーウェイブス','九州電力キューデンヴォルテクス','日野レッドドルフィンズ'],
  3: ['ヤクルトレビンズ戸田','栗田工業ウォーターガッシュ昭島','中国電力レッドレグリオンズ','ルリーロ福岡','狭山セコムラガッツ','マツダスカイアクティブズ広島'],
};
const PRO_LEAGUES: Record<string, { country: string; teams: string[]; matches: number; tier: 1 | 2 | 3 }> = {
  'リーグワン': { country: '日本', tier: 1, matches: 18, teams: PRO_TEAMS[1] },
  'リーグワンD2': { country: '日本', tier: 2, matches: 14, teams: PRO_TEAMS[2] },
  'リーグワンD3': { country: '日本', tier: 3, matches: 15, teams: PRO_TEAMS[3] },
  'イングランド・プレミアシップ': { country: 'イングランド', tier: 1, matches: 18, teams: ['Bath Rugby','Bristol Bears','Exeter Chiefs','Gloucester Rugby','Harlequins','Leicester Tigers','Newcastle Red Bulls','Northampton Saints','Sale Sharks','Saracens'] },
  'フランス・トップ14': { country: 'フランス', tier: 1, matches: 26, teams: ['Stade Toulousain','Union Bordeaux Bègles','Stade Rochelais','RC Toulon','Racing 92','ASM Clermont Auvergne','Montpellier Hérault Rugby','Stade Français Paris','Section Paloise','Castres Olympique','Lyon OU','Aviron Bayonnais','USA Perpignan','US Montauban'] },
  'フランス・プロD2': { country: 'フランス', tier: 2, matches: 30, teams: ['Provence Rugby','Grenoble','Brive','Oyonnax','Béziers','Colomiers','Biarritz Olympique','Agen','Valence Romans','Nevers','Aurillac','Mont-de-Marsan','Dax','Soyaux Angoulême','Carcassonne','Vannes'] },
  'ユナイテッド・ラグビー・チャンピオンシップ': { country: '多国籍', tier: 1, matches: 18, teams: ['Leinster Rugby','Munster Rugby','Connacht Rugby','Ulster Rugby','Glasgow Warriors','Edinburgh Rugby','Cardiff Rugby','Ospreys','Scarlets','Dragons RFC','Benetton Rugby','Zebre Parma','DHL Stormers','Vodacom Bulls','Hollywoodbets Sharks','Emirates Lions'] },
  'スーパーラグビー・パシフィック': { country: '南半球', tier: 1, matches: 14, teams: ['Blues','Brumbies','Chiefs','Crusaders','Fijian Drua','Highlanders','Hurricanes','Moana Pasifika','NSW Waratahs','Queensland Reds','Western Force'] },
  'メジャーリーグラグビー': { country: '北米', tier: 2, matches: 16, teams: ['Chicago Hounds','Dallas Jackals','Houston SaberCats','Miami Sharks','New England Free Jacks','Old Glory DC','Rugby FC Los Angeles','San Diego Legion','Seattle Seawolves','Utah Warriors'] },
  'カリーカップ': { country: '南アフリカ', tier: 2, matches: 14, teams: ['Blue Bulls','Cheetahs','Golden Lions','Griquas','Pumas','Sharks','Western Province','Boland Cavaliers'] },
};
const OVERSEAS_LEAGUE_NAMES = Object.keys(PRO_LEAGUES).filter((name) => !name.startsWith('リーグワン'));
function leagueForClub(club: string): string {
  for (const [league, data] of Object.entries(PRO_LEAGUES)) if (data.teams.includes(club)) return league;
  return 'リーグワン';
}
function teamsForLeague(league: string): string[] { return PRO_LEAGUES[league]?.teams ?? PRO_TEAMS[1]; }
const WORLD_OPPONENTS = ['オーストラリア','ウェールズ','フィジー'];
export const WORLD_CUP_TEAMS = ['日本','ニュージーランド','南アフリカ','アイルランド','フランス','イングランド','オーストラリア','アルゼンチン','スコットランド','ウェールズ','フィジー','イタリア','サモア','トンガ','ジョージア','ルーマニア','ナミビア','ウルグアイ','チリ','ポルトガル','スペイン','アメリカ合衆国','カナダ','香港','韓国','ロシア','ジンバブエ','ケニア','ブラジル','パラグアイ','オランダ','ベルギー'];
export function worldCupPools(teams: readonly string[] = WORLD_CUP_TEAMS): string[][] {
  if (teams.length !== 32 || new Set(teams).size !== 32) throw new Error('ワールドカップは重複のない32か国が必要です');
  const shuffled = [...teams];
  for (let i = shuffled.length - 1; i > 0; i--) { const j = int(0, i); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  return Array.from({ length: 8 }, (_, i) => shuffled.slice(i * 4, i * 4 + 4));
}
const JAPAN_TEST_OPPONENTS = ['ニュージーランド','オーストラリア','イングランド'];
const PHASE_LABEL: Record<CareerPhase, string> = {
  highschool: '高校生', university: '大学生', professional: '社会人', retired: '引退',
};
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
export function careerOverall(s: CareerState): number {
  return Math.round(overallAt({ pos: s.player.pos, stats: s.player.stats } as never));
}
function newSeason(s: CareerState): CareerSeason {
  return { age: s.age, phase: s.phase === 'retired' ? 'professional' : s.phase, year: s.stageYear, team: currentTeam(s), league: s.phase === 'professional' ? s.professionalLeague : undefined, played: 0, leaguePlayed: 0, leagueWins: 0, leagueLosses: 0, leagueDraws: 0, wins: 0, losses: 0, draws: 0, pointsFor: 0, pointsAgainst: 0, appearances: 0, starts: 0, substituteApps: 0, bench: 0, notSelected: 0, tries: 0, awards: [], notes: [] };
}
export function currentTeam(s: CareerState): string {
  if (s.phase === 'highschool') return s.highSchool;
  if (s.phase === 'university') return s.university;
  return s.professionalTeam || '所属先未定';
}
export function phaseLabel(p: CareerPhase): string { return PHASE_LABEL[p]; }
export function universityTierFor(o: number): string {
  if (o >= 75) return '最上位';
  if (o >= 65) return '上位';
  if (o >= 55) return '中位';
  return '育成枠';
}
export const UNIVERSITY_GROUPS: Record<CareerState['universityGroup'], string[]> = {
  '関東大学対抗戦A': ['帝京大学','明治大学','早稲田大学','筑波大学','慶應義塾大学','青山学院大学','立教大学','日本体育大学'],
  '関東大学対抗戦B': ['武蔵大学','明治学院大学','成蹊大学','東京大学','一橋大学','成城大学','上智大学','学習院大学'],
  '関東大学リーグ戦1部': ['東海大学','東洋大学','流通経済大学','法政大学','日本大学','大東文化大学','関東学院大学','立正大学'],
  '関東大学リーグ戦2部': ['山梨学院大学','中央大学','専修大学','國學院大學','拓殖大学','朝鮮大学校','白鷗大学','新潟食料農業大学'],
  '関西大学Aリーグ': ['京都産業大学','天理大学','同志社大学','関西学院大学','立命館大学','近畿大学','関西大学','摂南大学'],
  '関西大学Bリーグ': ['龍谷大学','大阪体育大学','甲南大学','追手門学院大学','大阪産業大学','大阪経済大学','京都大学','大阪国際大学','神戸大学','大阪大学','関西外国語大学','大阪教育大学'],
};
export function groupForUniversity(name: string): CareerState['universityGroup'] {
  for (const [group, teams] of Object.entries(UNIVERSITY_GROUPS)) if (teams.includes(name)) return group as CareerState['universityGroup'];
  return '関東大学対抗戦A';
}
export function selectCareerUniversity(s: CareerState, name: string): boolean {
  if (s.phase !== 'university' || !Object.values(UNIVERSITY_GROUPS).some((teams) => teams.includes(name))) return false;
  s.university = name;
  s.universityGroup = groupForUniversity(name);
  s.universityTier = universityTierFor(careerOverall(s));
  s.universityQualified = false;
  s.universityTournamentAlive = false;
  s.proSchedule = [];
  s.history.unshift(`進学先を${name}（${s.universityGroup}）に変更しました。`);
  s.rivals = s.rivals.filter((r) => r.phase !== 'university' || r.team === name);
  addPhaseRivals(s);
  saveCareer(s);
  return true;
}
function assignUniversity(s: CareerState): void {
  const o = careerOverall(s);
  const all = Object.values(UNIVERSITY_GROUPS).flatMap((x) => [...x]);
  const elite = ['帝京大学','明治大学','早稲田大学','東海大学','天理大学','京都産業大学','筑波大学','関西学院大学'];
  const upper = ['慶應義塾大学','同志社大学','立命館大学','近畿大学','東洋大学','流通経済大学','法政大学','立正大学','日本大学','関東学院大学','青山学院大学','日本体育大学'];
  s.university = pick(o >= 75 ? elite : o >= 65 ? upper : all);
  s.universityTier = universityTierFor(o); s.universityGroup = groupForUniversity(s.university);
  s.universityQualified = false; s.universityTournamentAlive = false;
  s.history.unshift(`高校卒業。総合値${o}・${rankOf(o)}ランクの評価で、${s.university}（${s.universityGroup}）へ進学。`);
  s.phase = 'university'; s.stageYear = 1; s.age = 18; s.month = 4; s.currentSeason = newSeason(s);
  transitionRoster(s);
  addPhaseRivals(s);
}
function buildProSchedule(s: CareerState): CareerFixture[] {
  const league = s.professionalLeague || (s.proDivision === 1 ? 'リーグワン' : s.proDivision === 2 ? 'リーグワンD2' : 'リーグワンD3');
  const competition = PRO_LEAGUES[league] ?? PRO_LEAGUES['リーグワン'];
  const teams = teamsForLeague(league);
  const opponents = teams.filter((x) => x !== s.professionalTeam);
  s.proStandings = opponents.map((team) => ({ team, wins: int(3, 11) }));
  const count = competition.matches;
  const rounds: string[] = [];
  if (league === 'リーグワンD2') {
    // 8 clubs, home-and-away double round robin: each opponent exactly twice.
    rounds.push(...opponents, ...[...opponents].reverse());
  } else if (league === 'リーグワンD3') {
    rounds.push(...opponents, ...[...opponents].reverse(), ...opponents);
  } else {
    for (let i = 0; i < count; i++) rounds.push(opponents[i % Math.max(1, opponents.length)]);
    for (let i = rounds.length - 1; i > 0; i--) { const j = int(0, i); [rounds[i], rounds[j]] = [rounds[j], rounds[i]]; }
  }
  const months = league === 'スーパーラグビー・パシフィック' ? [12,1,2,3,4,5] : [12,1,2,3,4,5];
  const fixturesPerMonth = Math.ceil(count / months.length);
  return rounds.map((opponent, i) => {
    const month = months[Math.min(months.length - 1, Math.floor(i / fixturesPerMonth))];
    return { date: `${month}月第${i + 1}節`, label: `${league} 第${i + 1}節`, opponent, difficulty: 75 + rand() * 45, kind: 'professional-league' as const };
  });
}
function assignProfessional(s: CareerState): void {
  const universitySeasons = s.seasons.filter((x) => x.phase === 'university');
  const wins = universitySeasons.reduce((n, x) => n + x.wins, 0);
  const universityAppearances = universitySeasons.reduce((n, x) => n + x.appearances, 0);
  const universityTries = universitySeasons.reduce((n, x) => n + x.tries, 0);
  const universityMatchRatings = s.matchHistory.filter((m) => m.appeared && /大学|リーグ戦|春季/.test(m.competition)).map((m) => m.rating);
  const universityAverageRating = universityMatchRatings.length ? universityMatchRatings.reduce((sum, rating) => sum + rating, 0) / universityMatchRatings.length : 0;
  const o = careerOverall(s);
  s.professionalStarterGuaranteed = o >= 70 && universityAppearances >= 22 && (universityTries >= 6 || universityAverageRating >= 7.0);
  s.proDivision = o >= 75 || wins >= 20 ? 1 : o >= 60 || wins >= 12 ? 2 : 3;
  s.professionalLeague = s.proDivision === 1 ? 'リーグワン' : s.proDivision === 2 ? 'リーグワンD2' : 'リーグワンD3';
  s.professionalTeam = pick(PRO_TEAMS[s.proDivision]); s.retirementAge = int(35, 38); s.proMatchIndex = 0;
  s.proContractYears = 3;
  s.proSalary = Math.round((s.proDivision === 1 ? 1800 : s.proDivision === 2 ? 900 : 500) + o * 18);
  const role = s.professionalStarterGuaranteed ? '大学時代のスター選手として、加入時から先発起用を約束された。' : 'まずは控えからプロキャリアをスタートする。';
  s.history.unshift(`大学卒業。大学リーグでの勝利${wins}勝・総合値${o}を評価され、リーグワン ディビジョン${s.proDivision}の${s.professionalTeam}に加入。${role}`);
  s.phase = 'professional'; s.stageYear = 1; s.age = 22; s.month = 7; s.currentSeason = newSeason(s); s.proSchedule = buildProSchedule(s);
  transitionRoster(s);
  addPhaseRivals(s);
}
const CAREER_ROSTER_POSITIONS: Pos[] = ['PR','HO','PR','LO','LO','FL','FL','N8','SH','SO','CTB','CTB','WTB','WTB','FB','PR','HO','LO','FL','N8','SH','SO','CTB'];
function rosterOverall(pos: Pos, stats: Stats): number { return Math.round(overallAt({ pos, stats } as never)); }
function makeRosterSeason(age: number, phase: CareerPhase, year: number, team: string): CareerRosterSeason {
  return { age, phase: phase === 'retired' ? 'professional' : phase as Exclude<CareerPhase, 'retired'>, year, team, appearances: 0, starts: 0, tries: 0, tackles: 0, wins: 0, losses: 0, draws: 0 };
}
function createCareerRoster(s: CareerState): CareerRosterPlayer[] {
  const team = currentTeam(s), profile = careerTeamStrengthProfile(s.phase, team);
  const used = new Set<string>([s.player.name, ...s.rivals.map((r) => r.name)]);
  let userPlaced = false;
  return CAREER_ROSTER_POSITIONS.map((pos, index) => {
    const isUser = !userPlaced && pos === s.player.pos;
    if (isUser) userPlaced = true;
    const stats = {} as Stats;
    if (isUser) for (const key of STAT_KEYS) stats[key] = s.player.stats[key];
    else {
      const posBase: Record<Pos, number> = { PR: -1, HO: 0, LO: 0, FL: 1, N8: 2, SH: 0, SO: 1, CTB: 2, WTB: 2, FB: 1 };
      for (const key of STAT_KEYS) stats[key] = clamp(Math.round(profile.center + posBase[pos] + gauss(0, 4)), profile.min, profile.max);
    }
    const name = isUser ? s.player.name : generateUniquePlayerName(used, '日本', rand); used.add(name);
    const [h,w] = BODY[pos], age = s.age;
    return { id: `hs-${index+1}-${name.replace(/\s/g,'')}`, name, pos, number:index+1, age, phase:s.phase, team, stats,
      height:isUser?s.player.height:Math.round(h+gauss(0,3)), weight:isUser?s.player.weight:Math.round(w+gauss(0,4)),
      overall:isUser?careerOverall(s):rosterOverall(pos,stats), isUser, seasons:[],
      currentSeason:makeRosterSeason(age,s.phase,s.stageYear,team),
      careerPath:[{phase:s.phase==='retired'?'professional':s.phase,age,team,year:s.stageYear}] };
  });
}
function finishRosterSeason(s: CareerState): void {
  for (const p of s.rosterPlayers ?? []) {
    if (p.isUser) { p.stats = { ...s.player.stats }; p.overall = careerOverall(s); }
    p.seasons.push({ ...p.currentSeason, age:p.age, phase:p.phase==='retired'?'professional':p.phase, team:p.team });
  }
}
function transitionRoster(s: CareerState): void {
  const phase=s.phase, team=currentTeam(s), continuing:CareerRosterPlayer[]=[], archive=[...(s.playerArchive??[])];
  for (const p of s.rosterPlayers??[]) {
    if (p.isUser) {
      p.age=s.age; p.phase=phase; p.team=team; p.stats={...s.player.stats}; p.overall=careerOverall(s);
      p.currentSeason=makeRosterSeason(s.age,phase,s.stageYear,team);
      p.careerPath.push({phase:phase==='retired'?'professional':phase,age:s.age,team,year:s.stageYear}); continuing.push(p); continue;
    }
    const o=rosterOverall(p.pos,p.stats);
    // 同じ高校・大学のチームメイト全員が同じ進学先へ進むのを避け、経歴を個別化する。
    const chance=phase==='university'
      ? (p.phase==='highschool'?(o>=55?.24:o>=45?.12:.04):(o>=55?.48:o>=45?.25:.08))
      : (p.phase==='university'?(o>=72?.20:o>=60?.08:.02):(o>=72?.38:o>=60?.18:.05));
    if (phase!=='retired' && rand()<chance) {
      p.age=s.age;p.phase=phase;p.team=team;
      // 継続選手も進学・移籍先チームのランクに合わせて能力帯を調整する。
      const destinationProfile=careerTeamStrengthProfile(phase,team);
      for(const key of STAT_KEYS)p.stats[key]=clamp(Math.round(p.stats[key]+gauss(phase==='university'?0.8:1,0.7)),destinationProfile.min,destinationProfile.max);
      p.overall=rosterOverall(p.pos,p.stats);p.currentSeason=makeRosterSeason(p.age,phase,s.stageYear,team);
      p.careerPath.push({phase,age:p.age,team,year:s.stageYear});continuing.push(p);
    } else { p.phase='retired'; archive.push(p); }
  }
  s.playerArchive=archive;
  const used=new Set([...continuing.map(p=>p.name),s.player.name]), profile=careerTeamStrengthProfile(phase,team);
  // 新加入選手には現在の所属先だけでなく、それぞれ異なる過去の出身校・大学を記録する。
  const schoolPool=allSchools().slice().sort((a,b)=>a.name.localeCompare(b.name));
  const usedSchoolNames=new Set(continuing.flatMap(p=>p.careerPath.filter(h=>h.phase==='highschool').map(h=>h.team)));
  const universityPool=[...new Set(Object.values(UNIVERSITY_GROUPS).flatMap(group=>[...group]))].sort().map(name=>({name}));
  const usedUniversityNames=new Set(continuing.flatMap(p=>p.careerPath.filter(h=>h.phase==='university').map(h=>h.team)));
  let backgroundIndex=0;
  const distinctBackground=(pool:{name:string}[],usedNames:Set<string>,fallback:string):string=>{
    const available=pool.filter(item=>!usedNames.has(item.name));
    const selected=available.length?available[backgroundIndex++%available.length]?.name:pool[backgroundIndex++%Math.max(1,pool.length)]?.name;
    if(selected)usedNames.add(selected);
    return selected??fallback;
  };
  while(continuing.length<23) {
    const i=continuing.length,pos=CAREER_ROSTER_POSITIONS[i%23],stats={} as Stats;
    const base=profile.center;
    // 新規加入選手も所属チームのランクに見合う能力帯で生成する。
    for(const key of STAT_KEYS)stats[key]=clamp(Math.round(base+gauss(0,4)),profile.min,profile.max);
    const name=generateUniquePlayerName(used,'日本',rand);used.add(name);const [h,w]=BODY[pos];
    const rosterPhase: Exclude<CareerPhase, 'retired'> = phase === 'retired' ? 'professional' : phase;
    const careerPath:{phase:Exclude<CareerPhase,'retired'>;age:number;team:string;year:number}[]=[];
    if(phase==='university'||phase==='professional') careerPath.push({phase:'highschool',age:15,team:distinctBackground(schoolPool,usedSchoolNames,'高校ラグビー部'),year:1});
    if(phase==='professional') careerPath.push({phase:'university',age:18,team:distinctBackground(universityPool,usedUniversityNames,'大学ラグビー部'),year:1});
    careerPath.push({phase:rosterPhase,age:s.age,team,year:s.stageYear});
    continuing.push({id:`${rosterPhase}-${s.stageYear}-${i+1}-${name.replace(/\s/g,'')}`,name,pos,number:i+1,age:s.age,phase:rosterPhase,team,stats,
      height:Math.round(h+gauss(0,3)),weight:Math.round(w+gauss(0,4)),overall:rosterOverall(pos,stats),seasons:[],
      currentSeason:makeRosterSeason(s.age,rosterPhase,s.stageYear,team),careerPath});
  }
  s.rosterPlayers=continuing.slice(0,23).map((p,i)=>({...p,number:i+1}));
}
function recordRosterMatch(s: CareerState, my: number, their: number): void {
  for(const p of s.rosterPlayers??[]) {
    if(p.isUser){p.stats={...s.player.stats};p.overall=careerOverall(s);continue;}
    const appeared=rand()<(p.overall>=60?.78:p.overall>=48?.62:.38);
    if(!appeared)continue;
    p.currentSeason.appearances++;if(my>their)p.currentSeason.wins++;else if(my<their)p.currentSeason.losses++;else p.currentSeason.draws++;
    if(rand()<(['WTB','FB','CTB','N8'].includes(p.pos)?.18:['SH','SO'].includes(p.pos)?.09:.025))p.currentSeason.tries++;
    p.currentSeason.tackles+=int(3,13);if(p.currentSeason.appearances===1)p.currentSeason.starts++;
    // チームメイトは試合による経験値・能力成長を得ない。出場記録だけを更新する。
     p.overall=rosterOverall(p.pos,p.stats);
  }
}
export function newCareer(name: string, pos: Pos, prefIndex = 26, schoolName?: string, talentType: CareerTalentType = '凡人'): CareerState {
  const p = POSITIONS.includes(pos) ? pos : 'CTB';
  const base: Record<Pos, number> = { PR: 39, HO: 40, LO: 40, FL: 41, N8: 42, SH: 40, SO: 41, CTB: 42, WTB: 42, FB: 41 };
  const stats = {} as Stats;
  for (const k of STAT_KEYS) stats[k] = clamp(base[p] + gauss(0, 5), 22, 58);
  const selectedTalent: CareerTalentType = CAREER_TALENTS.some((x) => x.id === talentType) ? talentType : '凡人';
  if (selectedTalent === '秀才' || selectedTalent === '天才') {
    const bonus = selectedTalent === '秀才' ? 10 : 15;
    for (const k of STAT_KEYS) stats[k] += bonus;
  } else if (selectedTalent === '一芸') {
    const lowKey = pick([...STAT_KEYS]);
    const highKey = pick(STAT_KEYS.filter((k) => k !== lowKey));
    const low = int(15, 20);
    stats[lowKey] = low;
    stats[highKey] = low * 3;
  }
  const [h, w] = BODY[p];
  const growthTalent = selectedTalent === '天才' ? clamp(gauss(1.3, 0.15), 1.1, 1.6)
    : selectedTalent === '秀才' ? clamp(gauss(1.15, 0.15), 1.0, 1.45)
    : selectedTalent === '一芸' ? clamp(gauss(1.08, 0.18), 0.8, 1.45)
    : clamp(gauss(1, 0.22), 0.65, 1.5);
  const player: CareerPlayer = {
    name: name.trim().slice(0, 24) || 'ラグビー選手',
    pos: p, stats, talent: growthTalent, talentType: selectedTalent,
    height: Math.round(h + gauss(0, 3)), weight: Math.round(w + gauss(0, 4)),
    peak: 0,
  };
  const s: CareerState = {
    v: 1 as const, phase: 'highschool' as CareerPhase, age: 15, month: 4, stageYear: 1,
    elapsedMonths: 0, prefIndex: clamp(Math.round(prefIndex), 0, PREFS.length - 1), experiencePoints: 0, qualified: false, universityTournamentFinalist: false, training: 'tec' as StatKey, player, highSchool: schoolName || schoolsOf(clamp(Math.round(prefIndex), 0, PREFS.length - 1))[1].name,
    university: '', universityTier: '', professionalTeam: '', professionalLeague: 'リーグワンD3', retirementAge: 36,
    seasons: [] as CareerSeason[], currentSeason: {} as CareerSeason,
    matchHistory: [] as CareerMatch[], highSchoolAppearances: 0, highSchoolTries: 0, highSchoolRatingTotal: 0, highSchoolRatingCount: 0, nationalCandidate: false, worldTournamentWins: 0, japanNationalTeamSelected: false, japanNationalTeamCaps: 0, japanNationalTeamWins: 0, professionalStarterGuaranteed: false,
    fatigue: 0, injuryMonths: 0, morale: 60, trainingPlan: 'バランス' as CareerTrainingPlan, proContractYears: 2, proSalary: 0, transferHistory: [], rivals: [], generatedNameVersion: 2, nationalSquad: [], awards: [],
    universityGroup: '関東大学対抗戦A' as CareerState['universityGroup'], universityQualified: false, universityTournamentAlive: false, proDivision: 3 as 1 | 2 | 3, proMatchIndex: 0, proSchedule: [],
    history: ['15歳で高校ラグビー生活がスタート。3年間の成長と活躍を目指す。'],
  };
  player.peak = careerOverall(s);
  s.currentSeason = newSeason(s);
  s.rosterPlayers = createCareerRoster(s); s.playerArchive = [];
  s.rivals = createCareerRivals(s);
  saveCareer(s);
  return s;
}
export function setCareerTraining(s: CareerState, k: StatKey): void {
  if (STAT_KEYS.includes(k)) s.training = k;
}
export function setCareerTrainingPlan(s: CareerState, plan: CareerTrainingPlan): void {
  if (['バランス','筋力','技術','持久力'].includes(plan)) s.trainingPlan = plan;
}
export function careerLegacyScore(s: CareerState): number {
  const includeCurrent = s.phase !== 'retired';
  const played = s.seasons.reduce((n, r) => n + r.appearances, 0) + (includeCurrent ? s.currentSeason.appearances : 0);
  const tries = s.seasons.reduce((n, r) => n + r.tries, 0) + (includeCurrent ? s.currentSeason.tries : 0);
  const wins = s.seasons.reduce((n, r) => n + r.wins, 0) + (includeCurrent ? s.currentSeason.wins : 0);
  const international = s.japanNationalTeamCaps * 8 + s.japanNationalTeamWins * 4;
  const trophies = s.awards.length * 25 + s.worldTournamentWins * 12;
  return Math.round(played * 1.5 + tries * 5 + wins * 1.2 + international + trophies + careerOverall(s) * 2 + Math.round(s.player.peak));
}
const LEGACY_KEY = 'rugby-club-sim:career:hall-of-fame:v1';
export function careerHallOfFame(): { name: string; score: number; age: number; appearances: number; tries: number; team: string }[] {
  try { const raw = localStorage.getItem(LEGACY_KEY); return raw ? JSON.parse(raw) as { name: string; score: number; age: number; appearances: number; tries: number; team: string }[] : []; } catch { return []; }
}
function saveCareerLegacy(s: CareerState): void {
  const score = careerLegacyScore(s); s.legacyScore = score;
  try {
    const rows = careerHallOfFame().filter((x) => x.name !== s.player.name);
    rows.push({ name: s.player.name, score, age: s.age, appearances: s.seasons.reduce((n,r)=>n+r.appearances,0), tries: s.seasons.reduce((n,r)=>n+r.tries,0), team: s.professionalTeam || s.highSchool });
    localStorage.setItem(LEGACY_KEY, JSON.stringify(rows.sort((a,b)=>b.score-a.score).slice(0,10)));
  } catch { /* local storage may be unavailable */ }
}
const RIVAL_COUNTRIES = ['日本','NZ','SouthAfrica','England','France','Ireland','Australia','Fiji','Argentina'];
function addPhaseRivals(s: CareerState): void {
  const existing = new Set(s.rivals.map((r) => r.name + '|' + r.team));
  for (const rival of createCareerRivals(s)) {
    const key = rival.name + '|' + rival.team;
    if (!existing.has(key)) { s.rivals.push(rival); existing.add(key); }
  }
  // 全国の高校・大学・クラブから代表候補を比較できるよう、候補者データを十分な数保持する。
  if (s.rivals.length > 1200) s.rivals = s.rivals.slice(-1200);
}
const NATIONAL_COUNTRY_RANK: Record<string, number> = { SouthAfrica: 98, NZ: 97, Ireland: 94, France: 93, England: 92, Australia: 92, Scotland: 91, Argentina: 89, Japan: 87, Fiji: 86, Wales: 85, Italy: 84, Georgia: 81, USA: 79, Portugal: 78, Samoa: 77, Tonga: 76, Uruguay: 75, Chile: 74, Spain: 73, Canada: 72, Romania: 71 };
const COUNTRY_LABEL: Record<string, string> = { SouthAfrica: '南アフリカ', NZ: 'ニュージーランド', Ireland: 'アイルランド', France: 'フランス', England: 'イングランド', Australia: 'オーストラリア', Scotland: 'スコットランド', Argentina: 'アルゼンチン', Japan: '日本', Fiji: 'フィジー', Wales: 'ウェールズ', Italy: 'イタリア', Georgia: 'ジョージア', USA: 'アメリカ', Portugal: 'ポルトガル', Samoa: 'サモア', Tonga: 'トンガ', Uruguay: 'ウルグアイ', Chile: 'チリ', Spain: 'スペイン', Canada: 'カナダ', Romania: 'ルーマニア' };
const TOP_SCHOOLS = allSchools().filter((school) => school.power >= 5).map((school) => school.name);
const UNI_STRENGTH: Record<string, number> = { '帝京大学': 98, '明治大学': 97, '早稲田大学': 97, '京都産業大学': 94, '天理大学': 93, '東海大学': 93, '筑波大学': 91, '関西学院大学': 90, '同志社大学': 89, '慶應義塾大学': 89, '東洋大学': 88, '立命館大学': 87, '大東文化大学': 86, '日本大学': 85, '関東学院大学': 84, '近畿大学': 84, '流通経済大学': 83, '福岡工業大学': 82, '青山学院大学': 82, '法政大学': 82, '日本体育大学': 82, '立教大学': 80, '武蔵大学': 74, '明治学院大学': 75, '成蹊大学': 73, '東京大学': 70, '一橋大学': 69, '成城大学': 68, '上智大学': 71, '学習院大学': 69, '山梨学院大学': 81, '中央大学': 80, '専修大学': 79, '國學院大學': 78, '拓殖大学': 76, '朝鮮大学校': 75, '白鷗大学': 72, '新潟食料農業大学': 71, '大阪体育大学': 79, '大阪大学': 72, '大阪公立大学': 73, '龍谷大学': 76, '京都大学': 70, '大阪工業大学': 71, '大阪経済大学': 72, '花園大学': 69, '甲南大学': 74, '追手門学院大学': 73, '大阪産業大学': 74, '大阪国際大学': 70, '神戸大学': 71, '関西外国語大学': 69, '大阪教育大学': 70 };
export function careerTeamStrengthProfile(phase: CareerPhase, team: string): { center: number; min: number; max: number } {
  if (phase === 'highschool') {
    const realSchool = allSchools().find((school) => school.name === team || school.name.includes(team) || team.includes(school.name.replace(/高等学校|高等部/g, '')));
    const schoolPower = realSchool?.power ?? (TOP_SCHOOLS.includes(team) ? 5 : 2);
    // 実績上位校は全国大会で戦える選手層、地方校は育成層を中心に編成。
    const center = schoolPower <= 2 ? 42 : schoolPower === 3 ? 49 : schoolPower === 4 ? 57 : 67;
    return { center, min: schoolPower <= 2 ? 25 : 30, max: schoolPower <= 2 ? 57 : schoolPower === 3 ? 66 : schoolPower === 4 ? 77 : 91 };
  }
  if (phase === 'university') {
    const strength = UNI_STRENGTH[team] ?? 72;
    // 大学リーグの実績差を選手層の総合値に反映。
    const center = Math.round(48 + (strength - 65) * 0.62);
    return { center, min: Math.max(32, center - 19), max: clamp(center + 21, 62, 100) };
  }
  const league = leagueForClub(team);
  const eliteLeagues = ['リーグワン', 'イングランド・プレミアシップ', 'フランス・トップ14', 'ユナイテッド・ラグビー・チャンピオンシップ', 'スーパーラグビー・パシフィック'];
  const tier = eliteLeagues.includes(league) ? 5 : league.includes('D2') || ['メジャーリーグラグビー', 'カリーカップ'].includes(league) ? 3 : 2;
  // 国内トップ／D2／下位カテゴリと海外主要リーグの層を明確化。
  const center = tier === 5 ? 91 : tier === 3 ? 79 : 70;
  return { center, min: tier === 5 ? 62 : tier === 3 ? 50 : 43, max: tier === 5 ? 112 : tier === 3 ? 99 : 88 };
}
function stablePlayerKey(value: string): string { let h = 2166136261; for (const ch of value) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0).toString(36); }
function createRivalIdentity(name: string, team: string, pos: Pos, age: number, overall: number, phase: CareerPhase, country: string, league: string): Pick<CareerRival, 'id'|'stats'|'height'|'weight'|'careerPath'> {
  const stats = {} as Stats;
  for (const key of STAT_KEYS) stats[key] = Math.max(0, Math.round(overall + gauss(0, 5)));
  const [heightBase, weightBase] = BODY[pos];
  const careerPath: { phase: Exclude<CareerPhase, 'retired'>; age: number; team: string; year: number }[] = [];
  if (phase === 'university' || phase === 'professional') careerPath.push({ phase: 'highschool', age: 15, team: allSchools()[stablePlayerKey(name).length % Math.max(1, allSchools().length)]?.name ?? '高校ラグビー部', year: 1 });
  if (phase === 'professional') careerPath.push({ phase: 'university', age: 18, team: [...new Set(Object.values(UNIVERSITY_GROUPS).flat())][stablePlayerKey(team + name).length % Math.max(1, Object.values(UNIVERSITY_GROUPS).flat().length)] ?? '大学ラグビー部', year: 1 });
  careerPath.push({ phase: phase === 'retired' ? 'professional' : phase, age, team, year: Math.max(1, age - (phase === 'highschool' ? 14 : phase === 'university' ? 17 : 20)) });
  return { id: `player-${stablePlayerKey(name + '|' + country)}`, stats, height: Math.round(heightBase + gauss(0, 3)), weight: Math.round(weightBase + gauss(0, 4)), careerPath };
}
function createCareerRivals(s: CareerState): CareerRival[] {
  const high = s.phase === 'highschool', uni = s.phase === 'university';
  const playerOverall = careerOverall(s);
  const candidates: CareerRival[] = [];
  const usedNames = new Set<string>([s.player.name, ...s.rivals.map((r) => r.name), ...s.matchHistory.flatMap((m) => (m.scoreEvents ?? []).map((e) => e.scorer))]);
  const schools = allSchools().map((school) => school.name);
  const universities = [...new Set(Object.values(UNIVERSITY_GROUPS).flatMap((x) => [...x]))];
  const proClubs = [...new Set(Object.values(PRO_LEAGUES).flatMap((x) => x.teams))];
  const domesticTeams = high ? schools : uni ? universities : proClubs;
  const countPerTeam = high ? 2 : 1;
  let n = 0;
  for (const team of domesticTeams) {
    for (let j = 0; j < countPerTeam; j++) {
      const teamIndex = Math.floor(n / countPerTeam);
      const pos = POSITIONS[(teamIndex * countPerTeam + j * 3) % POSITIONS.length];
      const name = generateUniquePlayerName(usedNames, '日本', rand);
      const profile = careerTeamStrengthProfile(s.phase, team);
      const growthAdjustment = Math.max(-8, Math.min(8, playerOverall - (high ? 44 : uni ? 62 : 78))) * 0.18;
      const age = high ? 15 + (n % 3) : uni ? 18 + (n % 4) : 21 + (n % 14);
      const ageAdjustment = high ? (age - 15) * 2.5 : uni ? (age - 18) * 1.8 : age <= 22 ? -3 : age <= 25 ? 0 : age <= 29 ? 2 : age <= 32 ? 0 : -4;
      const overall = Math.round(clamp(profile.center + int(-7, 7) + growthAdjustment + ageAdjustment, profile.min, profile.max));
      const playerName = `${name}${j ? 'Jr.' : ''}`;
      const league = high ? '高校ラグビー' : uni ? '大学リーグ' : leagueForClub(team);
      candidates.push({ ...createRivalIdentity(playerName, team, pos, age, overall, s.phase, '日本', league), name: playerName, pos, age, overall, phase: s.phase, team, country: '日本', league, appearances: 0, tries: 0, retired: false });
      n++;
    }
  }
  if (!high) {
    const countries = Object.keys(NATIONAL_COUNTRY_RANK).filter((x) => x !== 'Japan');
    const overseas = [...new Set(OVERSEAS_LEAGUE_NAMES)];
    for (let i = 0; i < 72; i++) {
      const country = countries[i % countries.length];
      const league = overseas[i % overseas.length];
      const team = pick(teamsForLeague(league));
      const rank = NATIONAL_COUNTRY_RANK[country] ?? 72;
      const pos = POSITIONS[(i * 3 + 2) % POSITIONS.length];
      const overall = clamp((uni ? 112 : 142) + (rank - 85) * 1.35 + int(-5, 16), uni ? 92 : 115, uni ? 185 : 200);
      const name = generateUniquePlayerName(usedNames, country, rand);
      const age = uni ? 18 + i % 4 : 22 + i % 12;
      const countryLabel = COUNTRY_LABEL[country] ?? country;
      candidates.push({ ...createRivalIdentity(name, team, pos, age, overall, s.phase, countryLabel, league), name, pos, age, overall, phase: s.phase, team, country: countryLabel, league, appearances: 0, tries: 0, retired: false });
    }
  }
  return candidates;
}
export function resolveCareerTransfer(s: CareerState, offerIndex: number): void {
  const offer = s.pendingTransfer?.offers[offerIndex]; if (!offer) return;
  const previous = s.professionalTeam;
  s.professionalTeam = offer.team; s.proDivision = offer.division; s.professionalLeague = offer.league || leagueForClub(offer.team); s.proSalary = offer.salary; s.proContractYears = int(2, 3);
  s.transferHistory.unshift(`${s.age}歳：${previous}から${offer.team}へ${offer.overseas ? '海外移籍' : '移籍'}。年俸${offer.salary}万円、契約${s.proContractYears}年。`);
  s.history.unshift(s.transferHistory[0]);
  s.pendingTransfer = undefined; s.proMatchIndex = 0; s.proSchedule = buildProSchedule(s); s.currentSeason.team = s.professionalTeam; s.currentSeason.league = s.professionalLeague; s.morale = clamp(s.morale + 8, 0, 100);
  saveCareer(s);
}
function awardMatchExperience(s: CareerState, my: number, their: number, appeared: boolean, tries: number, rating: number): number {
  // 未出場選手には試合経験点を付与しない。
  if (!appeared) return 0;
  const base = my > their ? 35 : my === their ? 25 : 18;
  const earned = base + 10 + tries * 15 + Math.max(0, Math.round((rating - 6) * 4));
  s.experiencePoints += earned;
  // 経験点は累積記録だけでなく、試合後の実能力成長にも反映する。
  // 能力値自体には上限を設けず、出場経験による伸びは緩やかに設定。
  const focused = s.training;
  for (const key of STAT_KEYS) {
    const growth = earned * (key === focused ? 0.0035 : 0.0006) * s.player.talent * careerGrowthMultiplier(s);
    s.player.stats[key] = Math.max(0, s.player.stats[key] + growth);
  }
  s.player.peak = Math.max(s.player.peak, careerOverall(s));
  return earned;
}
function opponentFor(s: CareerState, kind: CareerFixture['kind'] | 'highschool' | 'world', round = 0): string {
  if (kind === 'world-cup') return s.worldCup?.poolOpponents[round % Math.max(1, s.worldCup.poolOpponents.length)] ?? 'ニュージーランド';
  if (kind === 'world') return WORLD_OPPONENTS[round % WORLD_OPPONENTS.length];
  if (kind === 'japan-test') return JAPAN_TEST_OPPONENTS[round % JAPAN_TEST_OPPONENTS.length];
  if (kind === 'highschool') return pick(schoolsOf(s.prefIndex).map((school) => school.name).filter((name) => name !== s.highSchool)) ?? '対戦校';
  if (kind === 'university-league') {
    const played = s.currentSeason.leaguePlayed ?? 0;
    if (s.universityGroup === '関西大学Bリーグ') {
      const b1 = ['大阪体育大学','甲南大学','大阪産業大学','大阪教育大学','神戸大学','関西外国語大学'];
      const b2 = ['龍谷大学','追手門学院大学','大阪経済大学','大阪国際大学','京都大学','大阪大学'];
      const ownPool = b1.includes(s.university) ? b1 : b2;
      const otherPool = b1.includes(s.university) ? b2 : b1;
      const ownIndex = Math.max(0, ownPool.indexOf(s.university));
      if (played < 5) {
        const roundRobin = ownPool.filter((x) => x !== s.university);
        return roundRobin[played % roundRobin.length] ?? roundRobin[0] ?? '大学選抜';
      }
      return otherPool[(ownIndex + played - 5) % otherPool.length] ?? otherPool[0] ?? '大学選抜';
    }
    const list = UNIVERSITY_GROUPS[s.universityGroup].filter((x) => x !== s.university);
    const ownIndex = Math.max(0, UNIVERSITY_GROUPS[s.universityGroup].indexOf(s.university));
    return list[played % Math.max(1, list.length)] ?? list[0] ?? '大学選抜';
  }
  if (kind === 'university-spring' || kind === 'university-championship' || kind === 'university-playoff') {
    const groups = kind === 'university-playoff' && s.universityPlayoff ? UNIVERSITY_GROUPS[s.universityPlayoff.targetGroup] : UNIVERSITY_GROUPS[s.universityGroup];
    return pick(groups.filter((x) => x !== s.university));
  }
  return pick(PRO_TEAMS[s.proDivision].filter((x) => x !== s.professionalTeam));
}
/**
 * 出場機会は能力だけでなく、学年・過去の実績・チーム内競争で決まる。
 * 確率は「その試合に出場する確率」であり、先発/途中出場の区別は今後の拡張対象。
 */
const CAREER_POSITION_SLOTS: Record<Pos, { starters: number; substitutes: number }> = {
  PR: { starters: 2, substitutes: 1 }, HO: { starters: 1, substitutes: 1 },
  LO: { starters: 2, substitutes: 1 }, FL: { starters: 2, substitutes: 1 },
  N8: { starters: 1, substitutes: 1 }, SH: { starters: 1, substitutes: 1 },
  SO: { starters: 1, substitutes: 1 }, CTB: { starters: 2, substitutes: 1 },
  WTB: { starters: 2, substitutes: 1 }, FB: { starters: 1, substitutes: 1 },
};

/** 同じチーム・同じポジション内の総合力順位で先発／途中出場を決定する。 */
export function careerRoleByPositionalRank(s: CareerState, playerOverall = careerOverall(s)): CareerRole {
  const slots = CAREER_POSITION_SLOTS[s.player.pos];
  const team = currentTeam(s);
  const peers = s.rivals
    .filter((r) => !r.retired && r.phase === s.phase && r.team === team && r.pos === s.player.pos && r.name !== s.player.name)
    .map((r) => r.overall);
  const profile = careerTeamStrengthProfile(s.phase, team);
  const squadSize = slots.starters + slots.substitutes + 2;
  const fallbackRatings = [7, 2, -3, -8, -13].slice(0, squadSize).map((offset) =>
    Math.round(clamp(profile.center + offset, profile.min, profile.max)));
  const ratings = [...peers];
  while (ratings.length < squadSize) ratings.push(fallbackRatings[ratings.length] ?? Math.round(profile.center - 10 - ratings.length));
  const rank = 1 + ratings.filter((rating) => rating > playerOverall).length;
  if (rank <= slots.starters) return '先発';
  if (rank <= slots.starters + slots.substitutes) return '途中出場';
  return rank <= slots.starters + slots.substitutes + 2 ? '控え' : 'メンバー外';
}

export function careerAppearanceProbability(s: CareerState): number {
  if (s.phase === 'professional' && s.stageYear === 1 && s.professionalStarterGuaranteed) return 1;
  const year = Math.max(1, Math.min(4, s.stageYear));
  let chance: number;
  if (s.phase === 'highschool') {
    chance = [0, 0.22, 0.39, 0.58][Math.min(3, year)] ?? 0.58;
  } else if (s.phase === 'university') {
    chance = [0, 0.25, 0.36, 0.49, 0.61][year] ?? 0.61;
    const hsAverage = s.highSchoolRatingCount ? s.highSchoolRatingTotal / s.highSchoolRatingCount : 0;
    const highSchoolStar = s.player.stats && careerOverall(s) >= 55 &&
      s.highSchoolAppearances >= 7 && (s.highSchoolTries >= 3 || hsAverage >= 6.8);
    if (year === 1 && highSchoolStar) chance += 0.32;
    if (year === 2 && highSchoolStar) {
      const firstUniversitySeason = s.seasons.find((x) => x.phase === 'university' && x.year === 1);
      if (firstUniversitySeason && (firstUniversitySeason.appearances < 5 ||
          firstUniversitySeason.appearances / Math.max(1, firstUniversitySeason.played) < 0.35)) {
        chance -= 0.20;
      }
    }
    const previousUniversitySeason = [...s.seasons].reverse().find((x) => x.phase === 'university');
    if (year >= 2 && previousUniversitySeason && previousUniversitySeason.year === year - 1 &&
        previousUniversitySeason.appearances >= 8) chance += 0.06;
  } else if (s.phase === 'professional') {
    chance = s.stageYear === 1
      ? (s.professionalStarterGuaranteed ? 0.97 : 0.34)
      : s.stageYear === 2 ? 0.47
      : s.stageYear === 3 ? 0.59
      : 0.68;
  } else {
    return 0;
  }
  const expected = s.phase === 'highschool' ? 43 : s.phase === 'university' ? 59 : 66;
  const abilityAdjustment = clamp((careerOverall(s) - expected) / 100, -0.16, 0.18);
  const talentAdjustment = clamp((s.player.talent - 1) * 0.12, -0.06, 0.07);
  const positionalRivals = s.rivals.filter((r) => !r.retired && r.pos === s.player.pos && r.phase === s.phase);
  const strongerRivals = positionalRivals.filter((r) => r.overall > careerOverall(s)).length;
  const rivalAdjustment = clamp(-strongerRivals * 0.035, -0.12, 0);
  return clamp(chance + abilityAdjustment + talentAdjustment + rivalAdjustment, 0.08, s.phase === 'professional' && s.stageYear === 1 && s.professionalStarterGuaranteed ? 0.99 : 0.92);
}
const CAREER_STARTER_SLOTS: Record<Pos, number> = {
  PR: 2, HO: 1, LO: 2, FL: 2, N8: 1, SH: 1, SO: 1, CTB: 2, WTB: 2, FB: 1,
};

/** 代表選出済み選手は所属クラブの順位ではなく、代表23名内のポジション順位で起用する。 */
export function nationalMatchRole(s: CareerState, kind: CareerFixture['kind'] | 'highschool' | 'world'): CareerRole | undefined {
  if (kind !== 'japan-test' && kind !== 'world-cup') return undefined;
  if (s.phase === 'highschool' || !s.japanNationalTeamSelected) return undefined;
  const selected = s.nationalSquad?.find((p) => p.name === s.player.name);
  if (!selected) return undefined;
  const peers = s.nationalSquad!.filter((p) => p.pos === s.player.pos).sort((a, b) => b.overall - a.overall);
  const rank = peers.findIndex((p) => p.name === s.player.name) + 1;
  if (rank <= 0) return undefined;
  if (rank <= (CAREER_STARTER_SLOTS[s.player.pos] ?? 1)) return '先発';
  // 代表23名に選ばれた選手は、クラブでの序列に関係なく代表戦では途中出場枠に入れる。
  return '途中出場';
}

function rugbyScoreBreakdown(target: number): (3 | 5 | 7)[] {
  const memo = new Map<number, (3 | 5 | 7)[] | null>();
  const solve = (n: number): (3 | 5 | 7)[] | null => {
    if (n === 0) return [];
    if (n < 0) return null;
    if (memo.has(n)) return memo.get(n)!;
    for (const points of [7, 5, 3] as const) {
      const rest = solve(n - points);
      if (rest) { const result = [points, ...rest]; memo.set(n, result); return result; }
    }
    memo.set(n, null); return null;
  };
  for (let score = Math.max(0, Math.round(target)); score >= 0; score--) {
    const result = solve(score);
    if (result) return result;
  }
  return [];
}
function buildCareerScoreEvents(s: CareerState, my: number, their: number, appeared: boolean, opponent: string): { my: number; their: number; playerTries: number; events: CareerScoreEvent[] } {
  const ownPool = [...new Set([
    ...(appeared ? [s.player.name] : []),
    ...s.rivals.filter(r => !r.retired && r.phase === s.phase && r.team === (s.phase === 'highschool' ? s.highSchool : s.phase === 'university' ? s.university : s.professionalTeam)).map(r => r.name),
  ])];
  if (!ownPool.length) ownPool.push('チームメイト');
  const events: CareerScoreEvent[] = [];
  const appendSide = (score: number, side: CareerScoreEvent['side'], pool: string[]) => {
    for (const points of rugbyScoreBreakdown(score)) {
      const isTry = points === 5 || points === 7;
      const scorer = pick(pool);
      events.push({
        minute: int(1, 80), side, points, scorer,
        method: points === 3 ? 'ペナルティゴール' : points === 7 ? 'トライ（コンバージョン成功）' : 'トライ（コンバージョン失敗）',
      });
    }
  };
  const ownScore = rugbyScoreBreakdown(my).reduce((sum, p) => sum + p, 0);
  const opponentScore = rugbyScoreBreakdown(their).reduce((sum, p) => sum + p, 0);
  appendSide(ownScore, '自チーム', ownPool);
  appendSide(opponentScore, '相手', [`${opponent}の選手`]);
  events.sort((a, b) => a.minute - b.minute || (a.side === '自チーム' ? -1 : 1));
  return { my: ownScore, their: opponentScore, playerTries: events.filter(e => e.side === '自チーム' && e.scorer === s.player.name && (e.points === 5 || e.points === 7)).length, events };
}

function estimatedOpponentStrength(s: CareerState, opponent: string | undefined, kind: CareerFixture['kind'] | 'highschool' | 'world', fallback: number): number {
  if (!opponent) return fallback;
  if (kind === 'japan-test' || kind === 'world-cup') return fallback;
  if (s.phase === 'highschool' || kind === 'highschool' || kind === 'world') {
    const school = allSchools().find((item) => item.name === opponent || item.name.includes(opponent) || opponent.includes(item.name.replace(/高等学校|高等部/g, '')));
    if (school) return careerTeamStrengthProfile('highschool', school.name).center;
  }
  if (s.phase === 'university') {
    const university = Object.values(UNIVERSITY_GROUPS).flat().find((name) => name === opponent || opponent.includes(name) || name.includes(opponent));
    if (university) return careerTeamStrengthProfile('university', university).center;
  }
  if (s.phase === 'professional') {
    const club = Object.values(PRO_LEAGUES).flatMap((league) => league.teams).find((name) => name === opponent || opponent.includes(name) || name.includes(opponent));
    if (club) return careerTeamStrengthProfile('professional', club).center;
  }
  return fallback;
}

function simulateMatch(s: CareerState, label = `${s.month}月リーグ戦`, opponent?: string, date?: string, kind: CareerFixture['kind'] | 'highschool' | 'world' = 'university-league', difficulty?: number, live?: CareerLiveMatch): { my: number; their: number; win: boolean; exp: number; match: CareerMatch } {
  const o = careerOverall(s), expected = s.phase === 'highschool' ? 43 : s.phase === 'university' ? 59 : 66;
  let role: CareerRole = live?.role ?? 'メンバー外';
  const representativeRole = !live ? nationalMatchRole(s, kind) : undefined;
  if (!live && representativeRole) role = representativeRole;
  else if (!live) {
    // 試合前のポジション順位表示と試合後の記録を一致させる。
    // 出場確率による別判定を挟むと、先発表示なのに試合後は未出場になるため、
    // 同ポジション内の総合力順位からこの試合の起用を一意に決める。
    role = careerRoleByPositionalRank(s, o);
  }
  const appeared = role === '先発' || role === '途中出場';
  const fatiguePenalty = Math.max(0, s.fatigue - 20) * 0.08 + s.injuryMonths * 1.8;
  const roster = s.rosterPlayers ?? [];
  const teammates = roster.filter((p) => !p.isUser);
  // 試合に出る23名の総合値をそのままチーム力にする。所属カテゴリー補正の二重加算は行わない。
  const teamOverall = teammates.length
    ? (teammates.reduce((sum, p) => sum + p.overall, o) / (teammates.length + 1))
    : o;
  const strength = teamOverall - fatiguePenalty;
  // 代表戦の相手は自チームより約3高い。国内戦は日程に設定された相手強度を使用する。
  const international = kind === 'japan-test' || kind === 'world-cup';
  const opponentStrength = international ? teamOverall + 3 : estimatedOpponentStrength(s, opponent, kind, difficulty ?? expected);
  const strengthGap = strength - opponentStrength;
  // 強度差を得点差へ反映し、乱数は試合展開の小さな揺れに限定する。
  // 両チームに独立した大きな乱数を与えると、総合値差が結果に反映されなくなる。
  const matchPace = gauss(0, 2.5);
  const rawMy = live ? live.scoreFor : Math.max(0, Math.round(24 + matchPace + strengthGap * 0.72 + gauss(0, 2)));
  const rawTheir = live ? live.scoreAgainst : Math.max(0, Math.round(24 + matchPace - strengthGap * 0.72 + gauss(0, 2)));
  const scoreReport = buildCareerScoreEvents(s, rawMy, rawTheir, appeared, opponent || opponentFor(s, kind));
  const my = scoreReport.my;
  const their = scoreReport.their;
  const season = s.currentSeason; season.played++;
  if (kind === 'university-league' || kind === 'professional-league') {
    season.leaguePlayed++; if (my > their) season.leagueWins++; else if (my < their) season.leagueLosses++; else season.leagueDraws++;
  }
  season.pointsFor += my; season.pointsAgainst += their;
  if (my > their) season.wins++; else if (my < their) season.losses++; else season.draws++;
  const tries = live ? (appeared ? live.tries : 0) : scoreReport.playerTries;
  const carries = live ? (appeared ? live.carries : 0) : appeared ? int(5, 18) + Math.round(s.player.stats.spd / 20) : 0;
  const tackles = live ? (appeared ? live.tackles : 0) : appeared ? int(4, 15) + Math.round(s.player.stats.sta / 20) : 0;
  const lineBreaks = live ? (appeared ? live.lineBreaks : 0) : appeared && rand() < 0.35 ? int(1, 2) : 0;
  const kicks = live ? (appeared ? live.kicks : 0) : appeared && ['SH','SO','FB'].includes(s.player.pos) ? int(1, 6) : 0;
  const errors = live ? (appeared ? live.errors : 0) : appeared ? int(0, 3) : 0;
  const rating = appeared ? Math.round(clamp(5 + tries * 1.4 + lineBreaks * 0.7 + (my > their ? 0.5 : my < their ? -0.25 : 0) + gauss(0, 0.8), 3, 10) * 10) / 10 : 0;
  const exp = awardMatchExperience(s, my, their, appeared, tries, rating), scenes: string[] = live ? [...live.scenes] : [];
  if (!live && !appeared) scenes.push('出場機会はなかったが、ベンチからチームを支えた。');
  else if (!live && appeared) {
    if (tries) scenes.push(`${s.player.name}がゴールラインを突破し、トライを決めた！`);
    if (lineBreaks) scenes.push('鋭いランでディフェンスラインを突破。ビッグゲインを生み出した。');
    if (tackles >= 12) scenes.push('粘り強いタックルを連発し、相手の攻撃を止めた。');
    if (kicks >= 3) scenes.push('正確なキックで陣地を大きく回復した。');
    if (!scenes.length) scenes.push('献身的なサポートと堅実なプレーでチームに貢献した。');
  }
  const result = my > their ? '勝利' : my === their ? '引分' : '敗戦';
  scenes.push(my > their ? 'チームは勝利。試合後の評価が上がった。' : my === their ? '接戦の末に引き分け。最後まで集中を切らさなかった。' : '悔しい敗戦。課題を持ち帰り、次戦に向けて修正する。');
  recordRosterMatch(s, my, their);
  const match: CareerMatch = { date: date || `2025年${s.month}月`, competition: (kind === 'japan-test' || kind === 'world-cup') && !label.includes('日本代表') ? `日本代表 ${label}` : label, opponent: opponent || opponentFor(s, kind), my, their, result, appeared, role, tries, carries, tackles, lineBreaks, kicks, errors, rating, experience: exp, scenes, scoreEvents: live ? scoreReport.events : scoreReport.events };
  if (role === '先発') season.starts = (season.starts ?? 0) + 1;
  else if (role === '途中出場') season.substituteApps = (season.substituteApps ?? 0) + 1;
  else if (role === '控え') season.bench = (season.bench ?? 0) + 1;
  else season.notSelected = (season.notSelected ?? 0) + 1;
  if (role === '控え') scenes.unshift('ベンチ入りしたが出場機会はなかった。');
  else if (role === 'メンバー外') scenes.unshift('今回はメンバー外。ポジション順位を上げて次の機会を狙う。');
  else if (role === '途中出場') scenes.unshift('途中出場でピッチへ。限られた時間でアピールを狙う。');
  else scenes.unshift('先発メンバーとして試合開始から出場。');
  if ((kind === 'japan-test' || kind === 'world-cup') && appeared) {
    s.japanNationalTeamCaps++;
    if (my > their) s.japanNationalTeamWins++;
    match.scenes.unshift(`日本代表として${match.opponent}戦に出場。国際試合出場${s.japanNationalTeamCaps}試合目。`);
  } else if (kind === 'japan-test' || kind === 'world-cup') match.scenes.unshift('日本代表に帯同したが、今回は出場機会がなかった。');
  s.lastMatch = match; s.matchHistory.unshift(match); s.matchHistory = s.matchHistory.slice(0, 80);
  if (appeared) season.appearances++; season.tries += tries;
  if (appeared && rating >= 7.5 && !s.currentSeason.awards?.includes('週間ベストプレーヤー')) { s.currentSeason.awards ??= []; s.currentSeason.awards.push('週間ベストプレーヤー'); }
  if (s.phase === 'highschool' && appeared) { s.highSchoolAppearances++; s.highSchoolTries += tries; s.highSchoolRatingTotal += rating; s.highSchoolRatingCount++; }
  season.notes.push(`${match.date} ${label} vs ${match.opponent} ${my}-${their}（${result}／個人評価 ${appeared ? rating.toFixed(1) : '未出場'}／経験点+${exp}）`);
  s.history.unshift(`${match.date} ${label} ${my}-${their}、${result}。個人評価${appeared ? rating.toFixed(1) : '未出場'}、経験点+${exp}。`);
  return { my, their, win: my > their, exp, match };
}
function finishCareerTournament(s: CareerState): void {
  const t = s.pendingTournament; if (!t) return;
  let result = '', bonus = 0;
  if (t.kind === 'world') {
    result = t.wins >= 3 ? '世界大会優勝' : t.wins === 2 ? '世界大会準優勝' : t.wins === 1 ? '世界大会3位' : '世界大会4位';
    bonus = t.wins * 15 + (t.wins === 3 ? 40 : 0); s.worldTournamentWins = t.wins;
  } else {
    const title = t.wins === t.totalRounds, runnerUp = t.kind === 'pref' && t.wins === t.totalRounds - 1;
    result = title ? '優勝' : runnerUp ? '準優勝' : `${t.rounds}回戦敗退`;
    bonus = title ? 40 : runnerUp ? 20 : t.wins * 5;
  }
  s.experiencePoints += bonus;
  s.currentSeason.notes.push(`${t.name}：${result}（大会ボーナス経験点+${bonus}）`);
  s.history.unshift(`${t.name}：${result}。大会ボーナス経験点+${bonus}。`);
  if (t.kind === 'pref') s.qualified = t.wins >= t.totalRounds - 1;
  if (t.kind === 'nat') s.qualified = false;
  s.pendingTournament = undefined; s.tournamentCompletedMonth = s.month;
}
function roundName(round: number, total: number): string {
  if (round === total) return '決勝';
  if (round === total - 1) return '準決勝';
  if (round === total - 2) return '準々決勝';
  return `${round}回戦`;
}
export function beginCareerLiveMatch(s: CareerState, source: 'tournament' | 'fixture', fixture: CareerFixture): void {
  if (s.liveMatch) return;
  // 出場可否は抽選せず、所属チームの同ポジション内総合値順位で決定する。
  const role: CareerRole = nationalMatchRole(s, fixture.kind) ?? careerRoleByPositionalRank(s);
  s.liveMatch = {
    source, fixture, elapsed: 0, possession: '自チーム', fieldPosition: 50, scoreFor: 0, scoreAgainst: 0, role,
    tries: 0, carries: 0, tackles: 0, lineBreaks: 0, kicks: 0, errors: 0, scenes: [],
    lastEvent: `キックオフ！${s.player.name}のチームが試合を始める。`, actions: 0,
  };
  // Matches are resolved by simulation; no interactive match-play mode is used.
  finishCareerLiveMatch(s);
  saveCareer(s);
}
function finishCareerLiveMatch(s: CareerState): void {
  const live = s.liveMatch; if (!live) return;
  const f = live.fixture;
  const kind = f.kind;
  const m = simulateMatch(s, f.label, f.opponent, f.date, kind, f.difficulty, live);
  s.liveMatch = undefined;
  if (live.source === 'tournament') {
    const t = s.pendingTournament;
    if (t) {
      t.rounds++;
      if (m.win) { t.wins++; s.experiencePoints += 5; s.currentSeason.notes.push(`${t.name}・勝利ボーナス経験点+5`); }
      if ((t.kind !== 'world' && !m.win) || t.rounds >= t.totalRounds) finishCareerTournament(s);
    }
  } else {
    if (kind === 'professional-league') s.proMatchIndex++;
    if (kind === 'world-cup' && s.worldCup) {
      if (!s.worldCup.qualified && !s.worldCup.completed) {
        s.worldCup.poolPlayed++;
        if (m.win) s.worldCup.poolWins++;
        if (s.worldCup.poolPlayed >= 3) {
          const table = [{ team: '日本', wins: s.worldCup.poolWins, tie: rand() }, ...s.worldCup.poolOpponents.map((team, i) => ({ team, wins: s.worldCup!.poolRivalWins[i] ?? 0, tie: rand() }))].sort((a, b) => b.wins - a.wins || b.tie - a.tie);
          s.worldCup.qualified = table.findIndex((row) => row.team === '日本') < 2;
          s.pendingFixtures = [];
          if (s.worldCup.qualified) s.pendingFixtures.push({ date: '10月・ラウンド16', label: 'ラグビーワールドカップ ラウンド16', opponent: pick(WORLD_CUP_TEAMS.filter((x) => x !== '日本' && !s.worldCup!.poolOpponents.includes(x))), difficulty: 79, kind: 'world-cup' });
          else s.worldCup.completed = true;
        }
      } else {
        s.worldCup.knockoutStage++;
        if (!m.win || s.worldCup.knockoutStage >= 4) { s.worldCup.completed = true; s.pendingFixtures = []; }
        else {
          const stages = [
            { date: '10月・準々決勝', label: 'ラグビーワールドカップ 準々決勝', difficulty: 82 },
            { date: '10月・準決勝', label: 'ラグビーワールドカップ 準決勝', difficulty: 86 },
            { date: '10月・決勝', label: 'ラグビーワールドカップ 決勝', difficulty: 90 },
          ];
          const next = stages[s.worldCup.knockoutStage - 1];
          if (next) s.pendingFixtures = [{ ...next, opponent: pick(WORLD_CUP_TEAMS.filter((x) => x !== '日本')), kind: 'world-cup' }];
        }
      }
    }
    if (kind === 'university-playoff' && s.universityPlayoff) {
      if (m.win) s.universityPlayoff.wins++; else s.universityPlayoff.losses++;
      if (f.label.includes('第2戦')) {
        const playoff = s.universityPlayoff;
        if (playoff.wins > playoff.losses) {
          s.universityGroup = playoff.targetGroup;
          s.history.unshift(`大学リーグ入替戦に勝利。翌年度から${s.universityGroup}として戦います。`);
        } else s.history.unshift(`大学リーグ入替戦に敗退。翌年度も${s.universityGroup}で戦います。`);
        s.universityPlayoff = undefined;
      }
    }
    if (kind === 'university-league' && s.currentSeason.leaguePlayed >= 7) {
      const isAGroup = ['関東大学対抗戦A','関東大学リーグ戦1部','関西大学Aリーグ'].includes(s.universityGroup);
      s.universityQualified = isAGroup && (s.currentSeason.leagueWins >= 5 || (s.currentSeason.leagueWins === 4 && s.universityTier === '最上位'));
      s.universityTournamentAlive = s.universityQualified;
      const promotionTarget: Partial<Record<CareerState['universityGroup'], CareerState['universityGroup']>> = {
        '関東大学対抗戦B': '関東大学対抗戦A',
        '関東大学リーグ戦2部': '関東大学リーグ戦1部',
        '関西大学Bリーグ': '関西大学Aリーグ',
      };
      const relegationTarget: Partial<Record<CareerState['universityGroup'], CareerState['universityGroup']>> = {
        '関東大学対抗戦A': '関東大学対抗戦B',
        '関東大学リーグ戦1部': '関東大学リーグ戦2部',
        '関西大学Aリーグ': '関西大学Bリーグ',
      };
      const targetGroup = promotionTarget[s.universityGroup] && s.currentSeason.leagueWins >= 5
        ? promotionTarget[s.universityGroup]
        : relegationTarget[s.universityGroup] && s.currentSeason.leagueWins <= 1
          ? relegationTarget[s.universityGroup] : undefined;
      if (targetGroup) {
        s.universityPlayoff = { targetGroup, wins: 0, losses: 0 };
        s.history.unshift(`${s.universityGroup}の成績により、12月の昇降格入替戦に進出。`);
      }
      if (s.universityQualified) {
        s.history.unshift(`${s.universityGroup} ${s.currentSeason.leagueWins}勝で全国大学選手権出場圏内。`);
        // 大会日程は monthlyFixtures() で2025年度の公式日程に合わせて進行する。
      }
    }
    if (kind === 'university-championship' && !m.win) { s.universityTournamentAlive = false; s.pendingFixtures = []; }
    if (kind === 'university-playoff' && !m.win && f.label.includes('第2戦')) s.pendingFixtures = [];
    if (kind === 'professional-playoff' && !m.win) s.pendingFixtures = [];
    if (!s.pendingFixtures?.length) s.tournamentCompletedMonth = s.month;
  }
  saveCareer(s);
}
export function playCareerMatchAction(s: CareerState, action: CareerMatchAction): CareerState {
  const g = s.liveMatch; if (!g) return s;
  const st = s.player.stats;
  const appeared = g.role === '先発' || g.role === '途中出場';
  const skill = (pow: number, spd: number, tec: number, men: number) => (st.pow * pow + st.spd * spd + st.tec * tec + st.men * men) / (pow + spd + tec + men);
  const chance = (base: number, ability: number) => clamp(base + (ability - 50) / 180 - g.actions * 0.004, 0.18, 0.9);
  let event = '';
  if (g.possession === '自チーム') {
    if (action === 'goal' && g.fieldPosition >= 55) {
      g.kicks++;
      if (rand() < chance(0.56, skill(0.1, 0.1, 0.5, 0.3))) {
        g.scoreFor += 3; event = 'PG成功！キックで3点を追加。'; g.scenes.push(event); g.fieldPosition = 50; g.possession = '相手';
      } else { event = 'PG失敗。相手ボールで再開。'; g.errors++; g.scenes.push(event); g.possession = '相手'; }
    } else {
      let success = false, gain = 0;
      if (action === 'carry') {
        success = rand() < chance(0.58, skill(0.35, 0.4, 0.1, 0.15)); gain = int(4, 12);
        g.carries++; if (success && appeared) { if (rand() < 0.2) g.lineBreaks++; }
        event = success ? `ボールキャリー成功！${gain}m前進。` : 'タックルを受けて前進できない。';
      } else if (action === 'pass') {
        success = rand() < chance(0.72, skill(0.05, 0.2, 0.5, 0.25)); gain = int(3, 10);
        event = success ? `パスがつながり、攻撃継続。+${gain}m。` : 'パスミス！相手にボールを奪われた。'; if (!success) g.errors++;
      } else if (action === 'kick') {
        success = rand() < chance(0.68, skill(0.05, 0.05, 0.65, 0.25)); gain = int(12, 25); g.kicks++;
        event = success ? `タッチキックで陣地を獲得。+${gain}m。` : 'キックが乱れ、相手ボールに。'; if (!success) g.errors++;
      } else if (action === 'scrum') {
        success = rand() < chance(0.7, skill(0.6, 0.05, 0.2, 0.15)); gain = int(2, 8);
        event = success ? `スクラムで押し込み、安定した球出し。+${gain}m。` : 'スクラムで反則。相手ボール。';
      } else if (action === 'lineout') {
        success = rand() < chance(0.73, skill(0.2, 0.05, 0.45, 0.3)); gain = int(3, 9);
        event = success ? `ラインアウトを確保してモールを形成。+${gain}m。` : 'ラインアウトでノックオン。相手ボール。'; if (!success) g.errors++;
      } else {
        event = '攻撃の選択が合わず、相手にボールが渡った。'; g.errors++;
      }
      if (success) {
        g.fieldPosition = Math.min(100, g.fieldPosition + gain);
        if (appeared && (action === 'carry' || action === 'pass') && g.fieldPosition >= 88 && rand() < chance(0.28, skill(0.15, 0.5, 0.2, 0.15))) {
          g.scoreFor += 7; g.tries++; event = 'トライ！ディフェンスを突破してインゴールへ！コンバージョンも成功し7点！'; g.scenes.push(event); g.fieldPosition = 50; g.possession = '相手';
        }
      } else g.possession = '相手';
    }
  } else {
    const ability = action === 'drift' ? skill(0.05, 0.4, 0.15, 0.4) : action === 'jackal' ? skill(0.35, 0.05, 0.35, 0.25) : skill(0.35, 0.25, 0.1, 0.3);
    const base = action === 'jackal' ? 0.38 : action === 'rush' ? 0.64 : 0.7;
    const stopped = rand() < chance(base, ability);
    if (appeared) g.tackles++;
    if (stopped) {
      event = action === 'jackal' ? 'ジャッカル成功！ターンオーバー！' : action === 'drift' ? '外側へ追い込み、相手の攻撃を止めた。' : '前に出るディフェンスで相手を後退させた！';
      g.fieldPosition = Math.min(95, g.fieldPosition + int(3, 10));
      if (action === 'jackal' || rand() < 0.35) g.possession = '自チーム';
    } else {
      const gain = int(5, 14); g.fieldPosition = Math.max(0, g.fieldPosition - gain);
      event = `相手の攻撃を止めきれず、${gain}m前進を許した。`;
      if (g.fieldPosition <= 10 && rand() < 0.38) {
        g.scoreAgainst += 7; event = '相手にトライを許した。コンバージョンも決まり7失点。'; g.scenes.push(event); g.fieldPosition = 50; g.possession = '自チーム';
      } else if (rand() < 0.42) g.possession = '自チーム';
    }
  }
  g.elapsed = Math.min(80, g.elapsed + 5); g.actions++; g.lastEvent = event;
  if (g.elapsed >= 80) { g.scenes.push(`ノーサイド！最終スコア ${g.scoreFor}-${g.scoreAgainst}。`); finishCareerLiveMatch(s); }
  saveCareer(s); return s;
}

function playCareerTournamentMatch(s: CareerState, interactive = false): void {
  const t = s.pendingTournament; if (!t) return;
  const round = t.rounds + 1;
  const label = t.kind === 'world' ? `高校日本代表候補・世界大会 第${round}戦` : `${t.name}・${roundName(round, t.totalRounds)}`;
  const opponent = t.kind === 'world' ? WORLD_OPPONENTS[t.rounds] : t.kind === 'nat' ? pick(allSchools().map((school) => school.name).filter((name) => name !== s.highSchool)) : pick(schoolsOf(s.prefIndex).map((school) => school.name).filter((name) => name !== s.highSchool));
  if (interactive) { beginCareerLiveMatch(s, 'tournament', { date: `${s.month}月・${round}試合目`, label, opponent, difficulty: t.kind === 'world' ? 70 : 48 + round * 2, kind: t.kind === 'world' ? 'world' : 'highschool' }); return; }
  const m = simulateMatch(s, label, opponent, `${s.month}月・${round}試合目`, t.kind === 'world' ? 'world' : 'highschool');
  t.rounds++;
  if (m.win) { t.wins++; s.experiencePoints += 5; s.currentSeason.notes.push(`${t.name}・勝利ボーナス経験点+5`); }
  if ((t.kind !== 'world' && !m.win) || t.rounds >= t.totalRounds) finishCareerTournament(s);
}
function monthlyFixtures(s: CareerState): CareerFixture[] {
  const proPosition = (): number => {
    const table = [{ team: s.professionalTeam, wins: s.currentSeason.leagueWins }, ...(s.proStandings ?? [])]
      .sort((a, b) => b.wins - a.wins || a.team.localeCompare(b.team, 'ja'));
    return table.findIndex((row) => row.team === s.professionalTeam) + 1;
  };
  if (s.phase === 'university') {
    if (s.month === 12 && s.universityPlayoff && s.currentSeason.leaguePlayed >= 7) {
      const target = s.universityPlayoff.targetGroup;
      const opponents = UNIVERSITY_GROUPS[target].filter((x) => x !== s.university);
      return [
        { date: '12月・入替戦第1戦', label: `${s.universityGroup}／${target} 入替戦 第1戦`, opponent: opponents[0] ?? target, difficulty: 63, kind: 'university-playoff' },
        { date: '12月・入替戦第2戦', label: `${s.universityGroup}／${target} 入替戦 第2戦`, opponent: opponents[1] ?? opponents[0] ?? target, difficulty: 65, kind: 'university-playoff' },
      ];
    }
    if (s.month === 5) return [{ date: '5月・春季交流戦', label: '大学春季交流戦', opponent: opponentFor(s, 'university-spring'), difficulty: 57, kind: 'university-spring' }];
    if (s.month === 6) return [
      ...[1,2].map((n) => ({ date: `6月・春季交流戦${n}`, label: `大学春季交流戦${n}`, opponent: opponentFor(s, 'university-spring'), difficulty: 58 + n, kind: 'university-spring' as const })),
      ...(s.japanNationalTeamSelected ? JAPAN_TEST_OPPONENTS.map((opponent, i) => ({ date: `6月・日本代表戦${i + 1}`, label: `日本代表テストマッチ 第${i + 1}戦`, opponent, difficulty: 70 + i * 2, kind: 'japan-test' as const })) : []),
    ];
    if (s.month === 9 || s.month === 10 || s.month === 11) {
      const count = s.month === 9 ? 2 : s.month === 10 ? 3 : 2, start = s.currentSeason.leaguePlayed;
      return Array.from({ length: Math.min(count, 7 - start) }, (_, i) => {
        const round = start + i + 1;
        return { date: `${s.month}月・第${round}節`, label: `${s.universityGroup} 第${round}節`, opponent: opponentFor(s, 'university-league'), difficulty: 55 + round * 1.1, kind: 'university-league' as const };
      });
    }
    if (s.month === 12 && s.universityTournamentAlive) return s.currentSeason.leagueWins >= 6
      ? [{ date: '12/20・準々決勝', label: '全国大学選手権 準々決勝', opponent: opponentFor(s, 'university-championship'), difficulty: 66, kind: 'university-championship' }]
      : [
          { date: '12/14・3回戦', label: '全国大学選手権 3回戦', opponent: opponentFor(s, 'university-championship'), difficulty: 62, kind: 'university-championship' },
          { date: '12/20・準々決勝', label: '全国大学選手権 準々決勝', opponent: opponentFor(s, 'university-championship'), difficulty: 66, kind: 'university-championship' },
        ];
    if (s.month === 1 && s.universityTournamentAlive) return [
      { date: '1/2・準決勝', label: '全国大学選手権 準決勝', opponent: opponentFor(s, 'university-championship'), difficulty: 70, kind: 'university-championship' },
      { date: '1/11・決勝', label: '全国大学選手権 決勝', opponent: opponentFor(s, 'university-championship'), difficulty: 73, kind: 'university-championship' },
    ];
  }
  if (s.phase === 'professional') {
    const worldCupYear = 2023 + Math.max(0, Math.floor((s.age - 23) / 4)) * 4;
    if (s.japanNationalTeamSelected && s.month === 9 && (s.age - 23) % 4 === 0 && (!s.worldCup || (s.worldCup.completed && s.worldCup.year < worldCupYear))) {
      const pools = worldCupPools();
      const pool = pools.find((p) => p.includes('日本')) ?? pools[0];
      const opponents = pool.filter((x) => x !== '日本');
      s.worldCup = { year: worldCupYear, pool: String.fromCharCode(65 + pools.indexOf(pool)), poolOpponents: opponents, poolRivalWins: opponents.map(() => int(0, 4)), poolPlayed: 0, poolWins: 0, qualified: false, knockoutStage: 0, completed: false };
      return opponents.map((opponent, i) => ({ date: `${9 + Math.floor(i * 2 / 3)}月・プール戦`, label: `ラグビーワールドカップ プール${s.worldCup!.pool} 第${i + 1}戦`, opponent, difficulty: 76 + i * 2, kind: 'world-cup' as const }));
    }
    if (s.month === 8 && s.japanNationalTeamSelected) return JAPAN_TEST_OPPONENTS.map((opponent, i) => ({ date: `8月・日本代表戦${i + 1}`, label: `日本代表テストマッチ 第${i + 1}戦`, opponent, difficulty: 72 + i * 2, kind: 'japan-test' as const }));
    if ([12,1,2,3,4,5].includes(s.month)) return s.proSchedule.filter((f, i) => i >= s.proMatchIndex && f.date.startsWith(`${s.month}月`));
    if (s.month === 6 && s.proDivision === 1 && s.currentSeason.leaguePlayed >= 18 && proPosition() <= 6) {
      const opponent = () => pick(PRO_TEAMS[1].filter((x) => x !== s.professionalTeam));
      const fixtures: CareerFixture[] = proPosition() <= 2
        ? [
            { date: '5月・プレーオフ準決勝', label: 'リーグワンD1 プレーオフ準決勝', opponent: opponent(), difficulty: 74, kind: 'professional-playoff' },
            { date: '6月・プレーオフ決勝', label: 'リーグワンD1 プレーオフ決勝', opponent: opponent(), difficulty: 77, kind: 'professional-playoff' },
          ]
        : [
            { date: '5月・プレーオフ準々決勝', label: 'リーグワンD1 プレーオフ準々決勝', opponent: opponent(), difficulty: 70, kind: 'professional-playoff' },
            { date: '5月・プレーオフ準決勝', label: 'リーグワンD1 プレーオフ準決勝', opponent: opponent(), difficulty: 74, kind: 'professional-playoff' },
            { date: '6月・プレーオフ決勝', label: 'リーグワンD1 プレーオフ決勝', opponent: opponent(), difficulty: 77, kind: 'professional-playoff' },
          ];
      return fixtures;
    }
    if (s.month === 6 && s.proDivision === 2 && s.currentSeason.leaguePlayed >= 14 && proPosition() <= 2) {
      const opponent = pick(PRO_TEAMS[1]);
      return [
        { date: '5/23・入替戦第1戦', label: 'リーグワンD1/D2入替戦 第1戦', opponent, difficulty: 72, kind: 'professional-playoff' },
        { date: '5/30・入替戦第2戦', label: 'リーグワンD1/D2入替戦 第2戦', opponent, difficulty: 74, kind: 'professional-playoff' },
      ];
    }
    if (s.month === 6 && s.proDivision === 2 && s.currentSeason.leaguePlayed >= 14 && proPosition() >= 7) {
      const opponent = pick(PRO_TEAMS[3]);
      return [
        { date: '5/23・入替戦第1戦', label: 'リーグワンD2/D3入替戦 第1戦', opponent, difficulty: 64, kind: 'professional-playoff' },
        { date: '5/30・入替戦第2戦', label: 'リーグワンD2/D3入替戦 第2戦', opponent, difficulty: 66, kind: 'professional-playoff' },
      ];
    }
    if (s.month === 6 && s.proDivision === 3 && s.currentSeason.leaguePlayed >= 15 && proPosition() <= 2) {
      const opponent = pick(PRO_TEAMS[2]);
      return [
        { date: '5/23・入替戦第1戦', label: 'リーグワンD2/D3入替戦 第1戦', opponent, difficulty: 65, kind: 'professional-playoff' },
        { date: '5/30・入替戦第2戦', label: 'リーグワンD2/D3入替戦 第2戦', opponent, difficulty: 67, kind: 'professional-playoff' },
      ];
    }
  }
  return [];
}
function playNextFixture(s: CareerState, interactive = false): void {
  const fixture = s.pendingFixtures?.shift(); if (!fixture) return;
  if (interactive) { beginCareerLiveMatch(s, 'fixture', fixture); return; }
  const m = simulateMatch(s, fixture.label, fixture.opponent, fixture.date, fixture.kind, fixture.difficulty);
  if (fixture.kind === 'professional-league') s.proMatchIndex++;
  if (fixture.kind === 'world-cup' && s.worldCup) {
    s.worldCup.poolPlayed++;
    if (m.win) s.worldCup.poolWins++;
    if (s.worldCup.poolPlayed === 3) {
      const table = [{ team: '日本', wins: s.worldCup!.poolWins, tie: rand() }, ...s.worldCup!.poolOpponents.map((team, i) => ({ team, wins: s.worldCup!.poolRivalWins[i] ?? int(0,4), tie: rand() }))].sort((a,b) => b.wins - a.wins || b.tie - a.tie);
      s.worldCup.qualified = table.findIndex((row) => row.team === '日本') < 2;
      if (s.worldCup.qualified) s.pendingFixtures = [
        { date: '10月・ラウンド16', label: 'ラグビーワールドカップ ラウンド16', opponent: pick(WORLD_CUP_TEAMS.filter((x) => x !== '日本' && !s.worldCup!.poolOpponents.includes(x))), difficulty: 79, kind: 'world-cup' },
      ];
      else s.worldCup.completed = true;
    } else if (s.worldCup.poolPlayed > 3) {
      s.worldCup.knockoutStage++;
      if (!m.win || s.worldCup.knockoutStage >= 3) { s.worldCup.completed = true; s.pendingFixtures = []; }
      else if (s.worldCup.knockoutStage === 1 && (s.pendingFixtures?.length ?? 0) === 0) s.pendingFixtures = [{ date: '10月・準々決勝', label: 'ラグビーワールドカップ 準々決勝', opponent: pick(WORLD_CUP_TEAMS.filter((x) => x !== '日本')), difficulty: 82, kind: 'world-cup' }];
      else if (s.worldCup.knockoutStage === 2 && (s.pendingFixtures?.length ?? 0) === 0) s.pendingFixtures = [{ date: '10月・準決勝', label: 'ラグビーワールドカップ 準決勝', opponent: pick(WORLD_CUP_TEAMS.filter((x) => x !== '日本')), difficulty: 86, kind: 'world-cup' }];
      else if (s.worldCup.knockoutStage === 3 && (s.pendingFixtures?.length ?? 0) === 0) s.pendingFixtures = [{ date: '10月・決勝', label: 'ラグビーワールドカップ 決勝', opponent: pick(WORLD_CUP_TEAMS.filter((x) => x !== '日本')), difficulty: 90, kind: 'world-cup' }];
    }
  }
  if (fixture.kind === 'university-league' && s.currentSeason.leaguePlayed >= 7) {
    s.universityQualified = s.currentSeason.leagueWins >= 4 || s.universityTier === '最上位';
    s.universityTournamentAlive = s.universityQualified;
    if (s.universityQualified) {
      s.history.unshift(`${s.universityGroup} ${s.currentSeason.leagueWins}勝で全国大学選手権への出場権を獲得。`);
      s.pendingFixtures?.push(
        { date: '11/22・1回戦', label: '全国大学選手権 1回戦', opponent: opponentFor(s, 'university-championship'), difficulty: 60, kind: 'university-championship' },
        { date: '11/29・2回戦', label: '全国大学選手権 2回戦', opponent: opponentFor(s, 'university-championship'), difficulty: 61, kind: 'university-championship' },
      );
    }
  }
  if (fixture.kind === 'university-championship' && !m.win) { s.universityTournamentAlive = false; s.pendingFixtures = []; }
  if (fixture.kind === 'professional-playoff' && !m.win && !fixture.label.includes('入替戦')) s.pendingFixtures = [];
  if (!s.pendingFixtures?.length) s.tournamentCompletedMonth = s.month;
}
function updateRivals(s: CareerState): void {
  for (const r of s.rivals) {
    if (r.retired) continue;
    r.age++;
    const previousPhase = r.phase;
    const growth = r.age < 23 ? 1.2 : r.age < 28 ? 0.55 : r.age < 32 ? 0.1 : -0.7;
    r.overall = clamp(r.overall + gauss(growth, 2.5), 20, 200);
    r.phase = r.age < 18 ? 'highschool' : r.age < 22 ? 'university' : r.age <= 37 ? 'professional' : 'retired';
    if (r.phase === 'professional' && r.country && r.country !== '日本' && !r.league) r.league = pick(OVERSEAS_LEAGUE_NAMES);
    if (r.phase !== previousPhase && r.phase === 'university') r.team = pick(Object.values(UNIVERSITY_GROUPS).flatMap((x) => [...x]));
    else if (r.phase !== previousPhase && r.phase === 'professional') { if (r.country && r.country !== '日本') { r.league = r.league || pick(OVERSEAS_LEAGUE_NAMES); r.team = pick(teamsForLeague(r.league)); } else r.team = pick(PRO_TEAMS[careerOverall(s) >= 75 ? 1 : careerOverall(s) >= 60 ? 2 : 3]); }
    if (r.phase === 'retired') r.retired = true;
    if (r.pos === s.player.pos && !r.retired && r.overall > careerOverall(s)) s.currentSeason.notes.push(`ポジション争い：${r.name}（総合値${Math.round(r.overall)}）が競争相手として台頭。`);
  }
}
function finishSeason(s: CareerState): void {
  const r = s.currentSeason;
  r.awards ??= [];
  if (r.appearances >= 8 && r.tries >= 5) r.awards.push('シーズン主力選手');
  if (r.appearances >= 12 && r.tries >= 8) r.awards.push('シーズンベストXV候補');
  for (const award of r.awards) if (!s.awards.includes(award)) s.awards.push(award);
  if (r.awards.length) r.notes.push(`シーズン表彰：${r.awards.join('、')}`);
  s.seasons.push(clone(r));
  finishRosterSeason(s);
  updateRivals(s);
  const total = r.wins + r.losses + r.draws;
  s.history.unshift(`${r.age}歳・${r.team} ${r.year}年目：${r.wins}勝${r.losses}敗${r.draws}分、公式リーグ戦${r.leaguePlayed}試合（${r.leagueWins}勝${r.leagueLosses}敗${r.leagueDraws}分）、先発${r.starts}・途中出場${r.substituteApps}・控え${r.bench}・メンバー外${r.notSelected}、出場${r.appearances}試合、${r.tries}トライ。`);
  if (total > 0 && r.wins / total >= 0.65) { for (const k of STAT_KEYS) s.player.stats[k] += 0.05; s.history.unshift('好成績による自信で、全能力がわずかに成長した。'); }
  if (s.phase === 'professional' && s.age < s.retirementAge) {
    const domestic = pick(PRO_TEAMS[s.proDivision].filter((x) => x !== s.professionalTeam));
    const nextDivision = careerOverall(s) >= 72 ? 1 : careerOverall(s) >= 57 ? 2 : 3;
    const newDomestic = pick(PRO_TEAMS[nextDivision].filter((x) => x !== s.professionalTeam));
    const baseSalary = (division: number) => Math.round((division === 1 ? 1800 : division === 2 ? 900 : 500) + careerOverall(s) * 18 + r.tries * 12);
    s.pendingTransfer = { age: s.age, offers: [
      { team: s.professionalTeam, division: s.proDivision, salary: baseSalary(s.proDivision), overseas: false },
      { team: newDomestic || domestic, division: nextDivision, salary: baseSalary(nextDivision) + 150, overseas: false },
      (() => { const league = pick(OVERSEAS_LEAGUE_NAMES); const team = pick(teamsForLeague(league)); const division = PRO_LEAGUES[league].tier; return { team, division, salary: baseSalary(division) + 250, overseas: true, league }; })(),
    ] };
  }
}
function advanceCalendar(s: CareerState): void {
  const seasonEnd = s.phase === 'professional' ? s.month === 6 : s.month === 3;
  if (seasonEnd) {
    finishSeason(s);
    if (s.phase === 'highschool' && s.stageYear >= 3) assignUniversity(s);
    else if (s.phase === 'university' && s.stageYear >= 4) assignProfessional(s);
    else if (s.phase === 'professional' && s.age >= s.retirementAge) {
      s.phase = 'retired';
      const games = s.seasons.reduce((n, r) => n + r.appearances, 0), tries = s.seasons.reduce((n, r) => n + r.tries, 0);
      s.legacyScore = careerLegacyScore(s);
      const legacy = s.japanNationalTeamCaps >= 20 ? '日本代表の中心選手として歴史に名を刻んだ。' : tries >= 40 ? '得点力に優れた名トライゲッターとして記憶された。' : games >= 120 ? '長年にわたりチームを支えた鉄人として称えられた。' : s.awards.length >= 3 ? '数々の表彰を受けた実力者としてキャリアを終えた。' : '競技人生で培った経験を次の世代へ伝えていく。';
      s.finalSummary = `${s.player.name}は${s.age}歳で現役を引退。通算出場${games}試合、${tries}トライ。日本代表${s.japanNationalTeamCaps}キャップ、最高総合値${Math.round(s.player.peak)}、レガシースコア${s.legacyScore}。${legacy}獲得経験点${s.experiencePoints}。`;
      s.history.unshift(s.finalSummary); saveCareerLegacy(s);
    } else {
      s.stageYear++; s.age++; s.month = s.phase === 'professional' ? 7 : 4; s.currentSeason = newSeason(s);
      transitionRoster(s);
      if (s.phase === 'professional') { s.proMatchIndex = 0; s.proSchedule = buildProSchedule(s); s.proContractYears = Math.max(0, s.proContractYears - 1); }
    }
  } else s.month = s.month === 12 ? 1 : s.month + 1;
  s.pendingFixtures = []; s.tournamentCompletedMonth = undefined;
  if (s.phase !== 'retired') s.currentSeason.age = s.age;
}
export function careerGrowthMultiplier(s: CareerState): number {
  return s.player.talentType === '天才' ? 1.35 : s.player.talentType === '秀才' ? 1.12 : 1;
}

function applyCareerDevelopment(s: CareerState): void {
  const baseStage = s.phase === 'highschool' ? 0.58 : s.phase === 'university' ? 0.42 : 0.28;
  const ageFactor = s.age < 22 ? 1 : s.age < 27 ? 0.72 : s.age < 31 ? 0.42 : s.age < 34 ? 0.18 : 0.05;
  const planFactor: Record<CareerTrainingPlan, number> = { 'バランス': 1, '筋力': 0.9, '技術': 1.05, '持久力': 0.88 };
  for (const k of STAT_KEYS) {
    const focus = k === s.training ? (s.trainingPlan === 'バランス' ? 1.35 : s.trainingPlan === '筋力' && ['pow','sta'].includes(k) ? 1.8 : s.trainingPlan === '技術' && ['tec','men'].includes(k) ? 1.8 : s.trainingPlan === '持久力' && ['sta','spd'].includes(k) ? 1.8 : 1.08) : 0.1;
    const inc = s.player.talent * careerGrowthMultiplier(s) * baseStage * Math.max(0.04, ageFactor) * planFactor[s.trainingPlan] * focus * Math.max(0.08, 1 - s.player.stats[k] / 220) * (0.85 + rand() * 0.3);
    s.player.stats[k] = Math.max(0, s.player.stats[k] + inc);
    if (s.age >= 31 && rand() < (s.age >= 35 ? 0.12 : 0.045)) s.player.stats[k] = Math.max(0, s.player.stats[k] - (s.age >= 35 ? 0.8 : 0.35));
  }
  s.player.peak = Math.max(s.player.peak, careerOverall(s)); s.elapsedMonths++;
}
export function nationalCandidatePool(s: CareerState): { name: string; pos: Pos; overall: number; team: string; year?: string; country?: string }[] {
  const phase = s.phase;
  const eligible = s.rivals.filter((r) => !r.retired && r.country === '日本' && (phase === 'highschool' ? r.phase === 'highschool' : phase === 'university' ? r.phase === 'university' : r.phase === 'professional'));
  const ownTeam = phase === 'highschool' ? s.highSchool : phase === 'university' ? s.university : s.professionalTeam;
  const ownOverall = careerOverall(s);
  const ownMinimum = phase === 'highschool' ? 58 : phase === 'university' ? 75 : 88;
  const pool = eligible.map((r) => ({ name: r.name, pos: r.pos, overall: Math.round(r.overall), team: r.team, year: phase === 'highschool' ? `${Math.max(1, Math.min(3, r.age - 14))}年` : phase === 'university' ? `${Math.max(1, Math.min(4, r.age - 17))}年` : undefined, country: r.country }));
  if (ownOverall >= ownMinimum) pool.push({ name: s.player.name, pos: s.player.pos, overall: ownOverall, team: ownTeam, year: phase === 'highschool' ? `${s.stageYear}年` : phase === 'university' ? `${s.stageYear}年` : undefined, country: '日本' });
  const positionSlots: [Pos, number][] = [['PR',3],['HO',2],['LO',3],['FL',3],['N8',2],['SH',2],['SO',2],['CTB',2],['WTB',3],['FB',1]];
  const selected: typeof pool = [];
  for (const [pos, slots] of positionSlots) {
    const candidates = pool.filter((p) => p.pos === pos).sort((a,b) => b.overall-a.overall);
    const phaseFloor = phase === 'highschool' ? 48 : phase === 'university' ? 62 : 72;
    selected.push(...candidates.filter((p) => p.overall >= phaseFloor).slice(0, slots));
    if (selected.filter((p) => p.pos === pos).length < slots) {
      const chosen = new Set(selected.filter((p) => p.pos === pos).map((p) => p.name + '|' + p.team));
      selected.push(...candidates.filter((p) => !chosen.has(p.name + '|' + p.team)).slice(0, slots - selected.filter((p) => p.pos === pos).length));
    }
  }
  return selected.sort((a,b) => b.overall-a.overall).slice(0, 23);
}
function refreshNationalSelection(s: CareerState): void {
  if (s.phase === 'retired') return;
  if (s.phase === 'highschool') {
    // 高校日本代表候補は1年次から学年ごとの能力とポジション適性で選考。
    const pool = nationalCandidatePool(s);
    const own = pool.some((p) => p.name === s.player.name);
    s.nationalSquad = pool.map((p) => ({ ...p }));
    const wasSelected = s.nationalCandidate;
    s.nationalCandidate = own && s.highSchoolAppearances >= 2;
    if (s.nationalCandidate !== wasSelected) s.history.unshift(s.nationalCandidate ? `高校日本代表候補に選出（${s.stageYear}年生）。全国の候補をポジション別・総合力順で再選考。` : '高校日本代表候補から外れた。全国の選手の成長を踏まえ、ポジション別に再選考。');
  } else if (s.phase === 'university' || s.phase === 'professional') {
    const pool = nationalCandidatePool(s);
    const own = pool.some((p) => p.name === s.player.name);
    if (own !== s.japanNationalTeamSelected) {
      s.japanNationalTeamSelected = own;
      s.history.unshift(own ? `日本代表に選出。全国の候補からポジション別・総合力順で選考（${s.phase === 'university' ? `${s.stageYear}年生` : s.professionalTeam}）。` : '日本代表から落選。全国の選手の成長とポジション別競争を反映して再選考。');
    }
    s.nationalSquad = pool.map((p) => ({ ...p }));
  }
}
export function advanceCareerMonth(s: CareerState, _interactive = false): CareerState {
  if (s.phase === 'retired' || s.liveMatch) return s;
  // UIから次へ進めた場合、提示中の契約オファーは現所属で更新してから進行する。
  refreshNationalSelection(s);
  if (s.pendingTransfer) { s.pendingTransfer = undefined; s.proContractYears = Math.max(2, s.proContractYears); s.history.unshift(`${s.age}歳：契約オファーを見送り、現所属で契約を更新。年俸${s.proSalary}万円でプレーを続ける。`); }
  if (s.pendingTournament) { playCareerTournamentMatch(s, false); saveCareer(s); return s; }
  if (s.pendingFixtures?.length) { playNextFixture(s, false); saveCareer(s); return s; }
  if (s.tournamentCompletedMonth === s.month) {
    applyCareerDevelopment(s);
    advanceCalendar(s); saveCareer(s); return s;
  }
  if (s.phase === 'highschool') {
    let event: { kind: 'summer' | 'pref' | 'nat' | 'newbie' | 'world'; name: string; rounds: number } | null = null;
    if (s.month === 7) event = { kind: 'summer', name: `${PREFS[s.prefIndex].name}夏季県大会`, rounds: 4 };
    else if (s.month === 11) event = { kind: 'pref', name: `${PREFS[s.prefIndex].name}花園予選`, rounds: 4 };
    else if (s.month === 12 && s.qualified) event = { kind: 'nat', name: '全国大会（花園）', rounds: 5 };
    else if (s.month === 2 && s.nationalCandidate) {
      s.nationalCandidate = true; event = { kind: 'world', name: '高校日本代表候補・世界大会', rounds: 3 };
      s.history.unshift('高校大会での活躍が評価され、2月に高校日本代表候補へ選出された！');
    } else if (s.month === 2) event = { kind: 'newbie', name: `${PREFS[s.prefIndex].name}新人大会`, rounds: 3 };
    if (event) { s.pendingTournament = { name: event.name, kind: event.kind, totalRounds: event.rounds, rounds: 0, wins: 0 }; playCareerTournamentMatch(s, false); saveCareer(s); return s; }
  }
  if (s.phase === 'university' || s.phase === 'professional') {
    const fixtures = monthlyFixtures(s);
    if (fixtures.length) { s.pendingFixtures = fixtures; playNextFixture(s, false); saveCareer(s); return s; }
  }
  applyCareerDevelopment(s);
  advanceCalendar(s); saveCareer(s); return s;
}
export function saveCareer(s: CareerState): void {
  try {
    const userRecord = s.rosterPlayers?.find((p) => p.isUser);
    if (userRecord) { userRecord.name = s.player.name; userRecord.pos = s.player.pos; userRecord.stats = { ...s.player.stats }; userRecord.overall = careerOverall(s); userRecord.age = s.age; userRecord.phase = s.phase; userRecord.team = currentTeam(s); }
    const raw = JSON.stringify(s); localStorage.setItem(slotKey(activeCareerSlot), raw); localStorage.setItem(KEY, raw);
  } catch { /* local storage may be unavailable */ }
}
export function loadCareer(slot: 1 | 2 = activeCareerSlot): CareerState | null {
  try {
    const raw = localStorage.getItem(slotKey(slot)) ?? (slot === 1 ? localStorage.getItem(KEY) : null);
    if (!raw) return null;
    const s = JSON.parse(raw) as CareerState;
    if (s?.v !== 1 || !s.player?.stats || !Array.isArray(s.seasons)) return null;
    // 既存のキャリアセーブを新しい大会・個人成績データへ安全に移行する。
    if (typeof s.experiencePoints !== 'number' || !Number.isFinite(s.experiencePoints)) s.experiencePoints = 0;
    if (typeof s.prefIndex !== 'number') s.prefIndex = 26;
    s.prefIndex = Math.max(0, Math.min(PREFS.length - 1, Math.round(s.prefIndex)));
    if (!Array.isArray(s.history)) s.history = [];
    const realSchoolNames = new Set(allSchools().map((school) => school.name));
    if (typeof s.highSchool !== 'string' || !realSchoolNames.has(s.highSchool)) {
      const options = schoolsOf(s.prefIndex);
      const o = careerOverall(s);
      const index = o >= 65 ? options.length - 1 : o >= 50 ? Math.floor(options.length / 2) : 0;
      s.highSchool = options[Math.max(0, Math.min(options.length - 1, index))]?.name ?? options[0]?.name ?? '高校ラグビー部';
      s.history.unshift(`旧セーブの高校名を実在校データへ移行しました：${s.highSchool}`);
    }
    if (s.phase === 'highschool' && s.rivals?.some((r) => r.phase === 'highschool' && !realSchoolNames.has(r.team))) {
      s.rivals = s.rivals.filter((r) => r.phase !== 'highschool');
      s.rivals.push(...createCareerRivals(s).filter((r) => r.phase === 'highschool'));
      s.history.unshift('高校編の対戦相手を実在校データへ更新しました。');
    }
    if (typeof s.qualified !== 'boolean') s.qualified = false;
    if (typeof s.universityTournamentFinalist !== 'boolean') s.universityTournamentFinalist = false;
    if (!Array.isArray(s.pendingFixtures)) s.pendingFixtures = [];
    // Interactive play mode was removed; discard any stale in-progress match screen from older saves.
    if (s.liveMatch) s.liveMatch = undefined;
    if (!Array.isArray(s.matchHistory)) s.matchHistory = [];
    if (!Array.isArray(s.playerArchive)) s.playerArchive = [];
    if (!Array.isArray(s.rosterPlayers) || s.rosterPlayers.length !== 23) s.rosterPlayers = createCareerRoster(s);
    if (typeof s.highSchoolAppearances !== 'number') s.highSchoolAppearances = 0;
    if (typeof s.highSchoolTries !== 'number') s.highSchoolTries = 0;
    if (typeof s.highSchoolRatingTotal !== 'number') s.highSchoolRatingTotal = 0;
    if (typeof s.highSchoolRatingCount !== 'number') s.highSchoolRatingCount = 0;
    if (typeof s.nationalCandidate !== 'boolean') s.nationalCandidate = false;
    if (typeof s.worldTournamentWins !== 'number') s.worldTournamentWins = 0;
    if (s.worldCup && (!Array.isArray(s.worldCup.poolOpponents) || typeof s.worldCup.poolPlayed !== 'number')) s.worldCup = undefined;
    if (s.worldCup && s.worldCup.poolOpponents.length > 3) { s.worldCup.poolOpponents = s.worldCup.poolOpponents.slice(0, 3); s.worldCup.poolRivalWins = s.worldCup.poolRivalWins.slice(0, 3); s.worldCup.poolPlayed = Math.min(3, s.worldCup.poolPlayed); }
    if (s.worldCup && !Array.isArray(s.worldCup.poolRivalWins)) s.worldCup.poolRivalWins = s.worldCup.poolOpponents.map(() => 2);
    if (!s.player.talentType || !CAREER_TALENTS.some((x) => x.id === s.player.talentType)) s.player.talentType = '凡人';
    if (typeof s.japanNationalTeamSelected !== 'boolean') s.japanNationalTeamSelected = false;
    if (typeof s.japanNationalTeamCaps !== 'number') s.japanNationalTeamCaps = 0;
    if (typeof s.japanNationalTeamWins !== 'number') s.japanNationalTeamWins = 0;
    if (typeof s.professionalStarterGuaranteed !== 'boolean') s.professionalStarterGuaranteed = false;
    if (typeof s.fatigue !== 'number') s.fatigue = 0;
    if (typeof s.injuryMonths !== 'number') s.injuryMonths = 0;
    if (typeof s.morale !== 'number') s.morale = 60;
    if (!['バランス','筋力','技術','持久力'].includes(s.trainingPlan)) s.trainingPlan = 'バランス';
    if (typeof s.proContractYears !== 'number') s.proContractYears = 2;
    if (typeof s.proSalary !== 'number') s.proSalary = 0;
    if (!Array.isArray(s.transferHistory)) s.transferHistory = [];
    if (!Array.isArray(s.rivals)) s.rivals = createCareerRivals(s);
    if (s.phase !== 'highschool' && !s.rivals.some((r) => r.country && r.country !== '日本')) addPhaseRivals(s);
    if (s.generatedNameVersion !== 2) {
      const usedNames = new Set<string>([s.player.name]);
      const renameMap = new Map<string, string>();
      for (const rival of s.rivals) {
        const oldName = rival.name;
        const newName = generateUniquePlayerName(usedNames, rival.country ?? '日本', rand);
        rival.name = newName;
        if (!renameMap.has(oldName)) renameMap.set(oldName, newName);
      }
      for (const squadMember of s.nationalSquad ?? []) {
        const replacement = renameMap.get(squadMember.name);
        if (replacement) squadMember.name = replacement;
      }
      for (const match of s.matchHistory) {
        for (const event of match.scoreEvents ?? []) {
          const replacement = renameMap.get(event.scorer);
          if (replacement) event.scorer = replacement;
        }
        match.scenes = match.scenes.map((scene) => {
          let updated = scene;
          for (const [oldName, newName] of renameMap) if (oldName) updated = updated.split(oldName).join(newName);
          return updated;
        });
      }
      s.generatedNameVersion = 2;
      s.history.unshift('架空選手の氏名を重複のないランダムなフルネームに更新しました。');
    }
    const uniqueRivalNames = new Set<string>([s.player.name]);
    for (const rival of s.rivals) {
      if (uniqueRivalNames.has(rival.name) || (rival.country === '日本' && !SURNAMES.includes(rival.name.split(' ')[0] as never))) {
        rival.name = generateUniquePlayerName(uniqueRivalNames, rival.country ?? '日本', rand);
      } else uniqueRivalNames.add(rival.name);
    }
    if (!Array.isArray(s.awards)) s.awards = [];
    // 能力値は旧セーブを含めて上限なしで保持する。欠損値のみ安全に補正。
    for (const k of STAT_KEYS) s.player.stats[k] = Math.max(0, Number(s.player.stats[k]) || 0);
    s.player.peak = Math.max(Number(s.player.peak) || 0, careerOverall(s));
    for (const r of [...s.seasons, s.currentSeason]) { if (!r) continue; if (typeof r.starts !== 'number') r.starts = r.appearances || 0; if (typeof r.substituteApps !== 'number') r.substituteApps = 0; if (typeof r.bench !== 'number') r.bench = 0; if (typeof r.notSelected !== 'number') r.notSelected = Math.max(0, (r.played || 0) - (r.appearances || 0)); if (!Array.isArray(r.awards)) r.awards = []; }
    for (const m of s.matchHistory) if (!m.role) m.role = m.appeared ? '先発' : 'メンバー外';
    if (!s.universityGroup || !UNIVERSITY_GROUPS[s.universityGroup]) s.universityGroup = groupForUniversity(s.university || '');
    const allUniversityNames = new Set(Object.values(UNIVERSITY_GROUPS).flat());
    if (s.university && !allUniversityNames.has(s.university)) {
      s.university = pick(UNIVERSITY_GROUPS[s.universityGroup]);
      s.universityGroup = groupForUniversity(s.university);
      s.history.unshift(`旧セーブの大学名を実在大学データへ移行しました：${s.university}`);
    } else if (s.university && !UNIVERSITY_GROUPS[s.universityGroup].includes(s.university) && !s.universityPlayoff) {
      s.universityGroup = groupForUniversity(s.university);
    }
    if (s.phase === 'university' && s.rivals?.some((r) => r.phase === 'university' && !allUniversityNames.has(r.team))) {
      s.rivals = s.rivals.filter((r) => r.phase !== 'university');
      addPhaseRivals(s);
      s.history.unshift('大学編の対戦相手を2025年度の実在リーグ所属校へ更新しました。');
    }
    if (typeof s.universityQualified !== 'boolean') s.universityQualified = false;
    if (typeof s.universityTournamentAlive !== 'boolean') s.universityTournamentAlive = false;
    if (![1,2,3].includes(s.proDivision)) s.proDivision = 3;
    if (typeof s.proMatchIndex !== 'number') s.proMatchIndex = 0;
    if (!Array.isArray(s.proSchedule)) s.proSchedule = [];
    for (const r of [...s.seasons, s.currentSeason]) {
      if (!r) continue;
      if (typeof r.leaguePlayed !== 'number') r.leaguePlayed = 0;
      if (r.phase === 'professional' && !r.league) r.league = 'リーグワン';
      if (typeof r.leagueWins !== 'number') r.leagueWins = 0;
      if (typeof r.leagueLosses !== 'number') r.leagueLosses = 0;
      if (typeof r.leagueDraws !== 'number') r.leagueDraws = 0;
    }
    if (s.phase === 'professional') {
      if (!s.professionalLeague) s.professionalLeague = PRO_TEAMS[s.proDivision].includes(s.professionalTeam) ? (s.proDivision === 1 ? 'リーグワン' : s.proDivision === 2 ? 'リーグワンD2' : 'リーグワンD3') : leagueForClub(s.professionalTeam);
      if (!teamsForLeague(s.professionalLeague).includes(s.professionalTeam)) s.professionalTeam = pick(teamsForLeague(s.professionalLeague));
      if (!s.proSchedule.length) s.proSchedule = buildProSchedule(s);
      if (!s.proStandings) s.proStandings = teamsForLeague(s.professionalLeague).filter((team) => team !== s.professionalTeam).map((team) => ({ team, wins: int(3, 11) }));
    }
    return s;
  } catch { return null; }
}
export function hasCareerSave(slot: 1 | 2 = activeCareerSlot): boolean { return loadCareer(slot) !== null; }
export function clearCareer(slot: 1 | 2 = activeCareerSlot): void { try { localStorage.removeItem(slotKey(slot)); if (slot === 1) localStorage.removeItem(KEY); } catch { /* ignore */ } }
export function careerSaveSummary(slot: 1 | 2): { exists: boolean; name?: string; age?: number; team?: string; pos?: Pos; overall?: number; years?: number } {
  const s = loadCareer(slot); return s ? { exists: true, name: s.player.name, age: s.age, team: currentTeam(s), pos: s.player.pos, overall: careerOverall(s), years: s.seasons.length + 1 } : { exists: false };
}
export const CAREER_POSITIONS: { id: Pos; label: string }[] = POSITIONS.map((id) => ({ id, label: POS_LABEL[id] }));
export const CAREER_STAT_LABEL: Record<StatKey, string> = STAT_LABEL;
export const CAREER_STAT_KEYS: readonly StatKey[] = STAT_KEYS;
