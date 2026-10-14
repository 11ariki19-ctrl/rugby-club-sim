import { PREFS, SUFFIX, schoolsOf } from './data';
import { rand, int, pick, gauss, clamp } from './rng';
import { POS_LABEL, STAT_KEYS, STAT_LABEL, overallAt, rankOf } from './game';
import type { Pos, StatKey, Stats } from './game';

export type CareerPhase = 'highschool' | 'university' | 'professional' | 'retired';
export type CareerTalentType = '凡人' | '秀才' | '天才' | '一芸';
export type CareerRole = '先発' | '途中出場' | '控え' | 'メンバー外';
export type CareerTrainingPlan = 'バランス' | '筋力' | '技術' | '持久力' | '回復';
export interface CareerRival { name: string; pos: Pos; age: number; overall: number; phase: CareerPhase; team: string; country?: string; league?: string; appearances: number; tries: number; retired: boolean; }
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
export interface CareerMatch {
  date: string; competition: string; opponent: string; my: number; their: number;
  result: '勝利' | '引分' | '敗戦'; appeared: boolean; role?: CareerRole; tries: number; carries: number;
  tackles: number; lineBreaks: number; kicks: number; errors: number; rating: number;
  experience: number; scenes: string[];
}
export interface CareerFixture {
  date: string; label: string; opponent: string; difficulty: number;
  kind: 'university-league' | 'university-spring' | 'university-championship' | 'professional-league' | 'professional-playoff' | 'japan-test' | 'world-cup' | 'highschool' | 'world';
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
  japanNationalTeamSelected: boolean; japanNationalTeamCaps: number; japanNationalTeamWins: number;
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
  legacyScore?: number;
  awards: string[];
  universityGroup: '関東大学対抗戦A' | '関東大学リーグ戦1部' | '関西大学Aリーグ';
  universityQualified: boolean; universityTournamentAlive: boolean;
  proDivision: 1 | 2 | 3; proMatchIndex: number; proSchedule: CareerFixture[];
  tournamentCompletedMonth?: number;
  training: StatKey;
  player: CareerPlayer;
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
const WORLD_CUP_TEAMS = ['日本','ニュージーランド','南アフリカ','アイルランド','フランス','イングランド','オーストラリア','アルゼンチン','スコットランド','ウェールズ','フィジー','イタリア','サモア','トンガ','ジョージア','ルーマニア','ナミビア','ウルグアイ','チリ','ポルトガル'];
const JAPAN_TEST_OPPONENTS = ['ニュージーランド','オーストラリア','イングランド'];
const PHASE_LABEL: Record<CareerPhase, string> = {
  highschool: '高校生', university: '大学生', professional: '社会人', retired: '引退',
};
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
export function careerOverall(s: CareerState): number { return Math.round(overallAt({ pos: s.player.pos, stats: s.player.stats } as never)); }
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
const UNIVERSITY_GROUPS = {
  '関東大学対抗戦A': ['明治大学','筑波大学','早稲田大学','帝京大学','慶應義塾大学','日本体育大学','青山学院大学','立教大学'],
  '関東大学リーグ戦1部': ['東海大学','東洋大学','関東学院大学','流通経済大学','立正大学','法政大学','大東文化大学','日本大学'],
  '関西大学Aリーグ': ['関西学院大学','立命館大学','近畿大学','同志社大学','摂南大学','京都産業大学','関西大学','天理大学'],
} as const;
function groupForUniversity(name: string): CareerState['universityGroup'] {
  for (const [group, teams] of Object.entries(UNIVERSITY_GROUPS)) if ((teams as readonly string[]).includes(name)) return group as CareerState['universityGroup'];
  return '関東大学対抗戦A';
}
function assignUniversity(s: CareerState): void {
  const o = careerOverall(s);
  const all = Object.values(UNIVERSITY_GROUPS).flatMap((x) => [...x]);
  const elite = ['帝京大学','明治大学','早稲田大学','東海大学','天理大学','京都産業大学','筑波大学','関西学院大学'];
  const upper = ['慶應義塾大学','同志社大学','立命館大学','近畿大学','東洋大学','流通経済大学','法政大学','立正大学'];
  s.university = pick(o >= 75 ? elite : o >= 65 ? upper : all);
  s.universityTier = universityTierFor(o); s.universityGroup = groupForUniversity(s.university);
  s.universityQualified = false; s.universityTournamentAlive = false;
  s.history.unshift(`高校卒業。総合値${o}・${rankOf(o)}ランクの評価で、${s.university}（${s.universityGroup}）へ進学。`);
  s.phase = 'university'; s.stageYear = 1; s.age = 18; s.month = 4; s.currentSeason = newSeason(s);
  addPhaseRivals(s);
}
function buildProSchedule(s: CareerState): CareerFixture[] {
  const league = s.professionalLeague || (s.proDivision === 1 ? 'リーグワン' : s.proDivision === 2 ? 'リーグワンD2' : 'リーグワンD3');
  const competition = PRO_LEAGUES[league] ?? PRO_LEAGUES['リーグワン'];
  const teams = teamsForLeague(league);
  const opponents = teams.filter((x) => x !== s.professionalTeam);
  const count = competition.matches;
  const rounds: string[] = [];
  for (let i = 0; i < count; i++) rounds.push(opponents[i % Math.max(1, opponents.length)]);
  for (let i = rounds.length - 1; i > 0; i--) { const j = int(0, i); [rounds[i], rounds[j]] = [rounds[j], rounds[i]]; }
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
  addPhaseRivals(s);
}
export function newCareer(name: string, pos: Pos, prefIndex = 26, schoolName?: string, talentType: CareerTalentType = '凡人'): CareerState {
  const p = POSITIONS.includes(pos) ? pos : 'CTB';
  const base: Record<Pos, number> = { PR: 39, HO: 40, LO: 40, FL: 41, N8: 42, SH: 40, SO: 41, CTB: 42, WTB: 42, FB: 41 };
  const stats = {} as Stats;
  for (const k of STAT_KEYS) stats[k] = clamp(base[p] + gauss(0, 5), 22, 58);
  const selectedTalent: CareerTalentType = CAREER_TALENTS.some((x) => x.id === talentType) ? talentType : '凡人';
  if (selectedTalent === '秀才' || selectedTalent === '天才') {
    const bonus = selectedTalent === '秀才' ? 10 : 15;
    for (const k of STAT_KEYS) stats[k] = clamp(stats[k] + bonus, 0, 200);
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
    fatigue: 0, injuryMonths: 0, morale: 60, trainingPlan: 'バランス' as CareerTrainingPlan, proContractYears: 2, proSalary: 0, transferHistory: [], rivals: [], awards: [],
    universityGroup: '関東大学対抗戦A' as CareerState['universityGroup'], universityQualified: false, universityTournamentAlive: false, proDivision: 3 as 1 | 2 | 3, proMatchIndex: 0, proSchedule: [],
    history: ['15歳で高校ラグビー生活がスタート。3年間の成長と活躍を目指す。'],
  };
  player.peak = careerOverall(s);
  s.currentSeason = newSeason(s);
  s.rivals = createCareerRivals(s);
  saveCareer(s);
  return s;
}
export function setCareerTraining(s: CareerState, k: StatKey): void {
  if (STAT_KEYS.includes(k)) s.training = k;
}
export function setCareerTrainingPlan(s: CareerState, plan: CareerTrainingPlan): void {
  if (['バランス','筋力','技術','持久力','回復'].includes(plan)) s.trainingPlan = plan;
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
const RIVAL_NAME_POOLS: Record<string, string[]> = {
  日本: ['高橋 悠','山本 海斗','田中 陸','中村 翔','伊藤 大和','小林 蒼','加藤 蓮','吉田 湊','佐藤 大地','渡辺 颯'],
  NZ: ['Ardie Savea','Beauden Barrett','Will Jordan','Caleb Clarke','Rieko Ioane','Damian McKenzie','Tamaiti Williams','Cam Roigard'],
  SouthAfrica: ['Siya Kolisi','Cheslin Kolbe','Damian de Allende','Eben Etzebeth','Kurt-Lee Arendse','Manie Libbok'],
  England: ['Maro Itoje','Marcus Smith','Tommy Freeman','Ellis Genge','Henry Arundell','Fin Smith'],
  France: ['Antoine Dupont','Damian Penaud','Louis Bielle-Biarrey','Gregory Alldritt','Matthieu Jalibert','Thomas Ramos'],
  Ireland: ['Caelan Doris','Jamison Gibson-Park','James Lowe','Bundee Aki','Dan Sheehan'],
  Australia: ['Harry Wilson','Joseph-Aukuso Suaalii','Len Ikitau','Tom Wright','Fraser McReight'],
  Fiji: ['Semi Radradra','Waisea Nayacalevu','Josua Tuisova','Levani Botia'],
  Argentina: ['Pablo Matera','Juan Cruz Mallia','Emiliano Boffelli','Santiago Carreras'],
};
const RIVAL_COUNTRIES = ['日本','NZ','SouthAfrica','England','France','Ireland','Australia','Fiji','Argentina'];
function addPhaseRivals(s: CareerState): void {
  const existing = new Set(s.rivals.map((r) => r.name + '|' + r.team));
  for (const rival of createCareerRivals(s)) {
    if (rival.country && rival.country !== '日本' && !existing.has(rival.name + '|' + rival.team)) s.rivals.push(rival);
  }
  if (s.rivals.length > 24) s.rivals = s.rivals.slice(-24);
}
function createCareerRivals(s: CareerState): CareerRival[] {
  const names = RIVAL_NAME_POOLS.日本;
  const high = s.phase === 'highschool';
  const uni = s.phase === 'university';
  const overall = careerOverall(s);
  const candidates: CareerRival[] = names.slice(0, 6).map((name, i) => ({
    name, pos: i < 4 ? (i < 3 ? s.player.pos : POSITIONS[(POSITIONS.indexOf(s.player.pos) + i) % POSITIONS.length]) : POSITIONS[(i + 2) % POSITIONS.length],
    age: s.age + (i % 3) - 1, overall: clamp(overall + (high ? 8 : uni ? 20 : 35) + int(-8, 15) + i * 2, 25, 200),
    phase: s.phase, team: high ? `${['東','西','北','南','中央','県選抜'][i]}地区ライバル校` : uni ? pick(Object.values(UNIVERSITY_GROUPS).flatMap((x) => [...x])) : pick(PRO_TEAMS[1]), country: '日本', league: uni ? '大学リーグ' : high ? '高校ラグビー' : '国内プロ', appearances: 0, tries: 0, retired: false,
  }));
  if (!high) {
    const foreignCount = uni ? 2 : 5;
    const foreignKeys = RIVAL_COUNTRIES.filter((x) => x !== '日本');
    for (let i = 0; i < foreignCount; i++) {
      const country = pick(foreignKeys);
      const name = pick(RIVAL_NAME_POOLS[country]);
      const overseasLeague = pick(OVERSEAS_LEAGUE_NAMES);
      const club = pick(teamsForLeague(overseasLeague));
      candidates.push({
        name, pos: pick(POSITIONS), age: s.age + int(-2, 3),
        overall: clamp(overall + (uni ? 24 : 42) + int(-10, 18), 35, 200),
        phase: s.phase, team: club, country, league: overseasLeague,
        appearances: 0, tries: 0, retired: false,
      });
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
  const base = my > their ? 35 : my === their ? 20 : 10;
  const earned = base + (appeared ? 10 : 0) + tries * 15 + Math.max(0, Math.round((rating - 6) * 3));
  s.experiencePoints += earned; return earned;
}
function opponentFor(s: CareerState, kind: CareerFixture['kind'] | 'highschool' | 'world', round = 0): string {
  if (kind === 'world-cup') return s.worldCup?.poolOpponents[round % Math.max(1, s.worldCup.poolOpponents.length)] ?? 'ニュージーランド';
  if (kind === 'world') return WORLD_OPPONENTS[round % WORLD_OPPONENTS.length];
  if (kind === 'japan-test') return JAPAN_TEST_OPPONENTS[round % JAPAN_TEST_OPPONENTS.length];
  if (kind === 'highschool') return `${PREFS[s.prefIndex].short}${pick(SUFFIX)}高校`;
  if (kind === 'university-league' || kind === 'university-spring' || kind === 'university-championship') {
    const list = UNIVERSITY_GROUPS[s.universityGroup] as readonly string[]; return pick(list.filter((x) => x !== s.university));
  }
  return pick(PRO_TEAMS[s.proDivision].filter((x) => x !== s.professionalTeam));
}
/**
 * 出場機会は能力だけでなく、学年・過去の実績・チーム内競争で決まる。
 * 確率は「その試合に出場する確率」であり、先発/途中出場の区別は今後の拡張対象。
 */
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
  const fatigueAdjustment = -clamp(s.fatigue / 500, 0, 0.18);
  return clamp(chance + abilityAdjustment + talentAdjustment + rivalAdjustment + fatigueAdjustment, 0.08, s.phase === 'professional' && s.stageYear === 1 && s.professionalStarterGuaranteed ? 0.99 : 0.92);
}
function simulateMatch(s: CareerState, label = `${s.month}月リーグ戦`, opponent?: string, date?: string, kind: CareerFixture['kind'] | 'highschool' | 'world' = 'university-league', difficulty?: number, live?: CareerLiveMatch): { my: number; their: number; win: boolean; exp: number; match: CareerMatch } {
  const o = careerOverall(s), expected = s.phase === 'highschool' ? 43 : s.phase === 'university' ? 59 : 66;
  const selectionChance = careerAppearanceProbability(s);
  let role: CareerRole = live?.role ?? 'メンバー外';
  if (!live && s.phase === 'professional' && s.stageYear === 1 && s.professionalStarterGuaranteed) role = '先発';
  else if (!live && rand() < selectionChance) {
    const starterChance = clamp(0.32 + (o - expected) / 100 + (s.morale - 60) / 300 - s.fatigue / 350, 0.12, 0.95);
    role = rand() < starterChance ? '先発' : '途中出場';
  } else if (!live) role = rand() < 0.58 ? '控え' : 'メンバー外';
  const appeared = role === '先発' || role === '途中出場';
  const teamBonus = s.phase === 'university' ? (s.universityTier === '最上位' ? 5 : s.universityTier === '上位' ? 3 : 0) : s.phase === 'professional' ? 4 : 0;
  const strength = o + teamBonus + gauss(0, 8), opponentStrength = difficulty ?? expected + gauss(0, 10);
  const my = live ? live.scoreFor : Math.max(0, Math.round(22 + (strength - opponentStrength) * 0.55 + gauss(0, 8)));
  const their = live ? live.scoreAgainst : Math.max(0, Math.round(22 + (opponentStrength - strength) * 0.55 + gauss(0, 8)));
  const season = s.currentSeason; season.played++;
  if (kind === 'university-league' || kind === 'professional-league') {
    season.leaguePlayed++; if (my > their) season.leagueWins++; else if (my < their) season.leagueLosses++; else season.leagueDraws++;
  }
  season.pointsFor += my; season.pointsAgainst += their;
  if (my > their) season.wins++; else if (my < their) season.losses++; else season.draws++;
  const positionTryRate: Record<Pos, number> = {
    PR: 0.055, HO: 0.095, LO: 0.070, FL: 0.105, N8: 0.125,
    SH: 0.060, SO: 0.085, CTB: 0.115, WTB: 0.245, FB: 0.145,
  };
  // 2024-25年の主要プロ大会の傾向を参考に、ポジション別の相対比率を反映したゲーム用モデル。
  const tryChance = clamp(positionTryRate[s.player.pos] * (0.72 + s.player.stats.spd / 180 + s.player.stats.tec / 260) * (0.9 + s.player.stats.men / 500), 0.02, 0.52);
  const tries = live ? (appeared ? live.tries : 0) : appeared && rand() < tryChance ? 1 : 0;
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
  const match: CareerMatch = { date: date || `2025年${s.month}月`, competition: (kind === 'japan-test' || kind === 'world-cup') && !label.includes('日本代表') ? `日本代表 ${label}` : label, opponent: opponent || opponentFor(s, kind), my, their, result, appeared, role, tries, carries, tackles, lineBreaks, kicks, errors, rating, experience: exp, scenes };
  if (role === '先発') season.starts = (season.starts ?? 0) + 1;
  else if (role === '途中出場') season.substituteApps = (season.substituteApps ?? 0) + 1;
  else if (role === '控え') season.bench = (season.bench ?? 0) + 1;
  else season.notSelected = (season.notSelected ?? 0) + 1;
  if (appeared) {
    const fatigueGain = (role === '先発' ? 24 : 13) + (s.trainingPlan === '持久力' ? -4 : 0);
    s.fatigue = clamp(s.fatigue + fatigueGain, 0, 100);
  }
  if (role === '控え') scenes.unshift('ベンチ入りしたが出場機会はなかった。');
  else if (role === 'メンバー外') scenes.unshift(s.injuryMonths > 0 ? `負傷療養中（残り約${s.injuryMonths}か月）のためメンバー外。` : '今回はメンバー外。練習で次の機会を狙う。');
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
  let role: CareerRole = 'メンバー外';
  if (s.phase === 'professional' && s.stageYear === 1 && s.professionalStarterGuaranteed) role = '先発';
  else if (rand() < careerAppearanceProbability(s)) role = rand() < clamp(0.32 + (careerOverall(s) - (s.phase === 'highschool' ? 43 : s.phase === 'university' ? 59 : 66)) / 100 + (s.morale - 60) / 300 - s.fatigue / 350, 0.12, 0.95) ? '先発' : '途中出場';
  else role = rand() < 0.58 ? '控え' : 'メンバー外';
  s.liveMatch = {
    source, fixture, elapsed: 0, possession: '自チーム', fieldPosition: 50, scoreFor: 0, scoreAgainst: 0, role,
    tries: 0, carries: 0, tackles: 0, lineBreaks: 0, kicks: 0, errors: 0, scenes: [],
    lastEvent: `キックオフ！${s.player.name}のチームが試合を始める。`, actions: 0,
  };
  // 先発・途中出場でなければ操作プレー画面を開かず、結果だけを自動確定する。
  if (role !== '先発' && role !== '途中出場') finishCareerLiveMatch(s);
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
    if (kind === 'university-league' && s.currentSeason.leaguePlayed >= 7) {
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
    if (kind === 'university-championship' && !m.win) { s.universityTournamentAlive = false; s.pendingFixtures = []; }
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
  const chance = (base: number, ability: number) => clamp(base + (ability - 50) / 180 - g.actions * 0.004 - s.fatigue / 650, 0.18, 0.9);
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
  const opponent = t.kind === 'world' ? WORLD_OPPONENTS[t.rounds] : t.kind === 'nat' ? `${pick(PREFS.filter((_, i) => i !== s.prefIndex)).short}${pick(SUFFIX)}高校` : `${PREFS[s.prefIndex].short}${pick(SUFFIX)}高校`;
  if (interactive) { beginCareerLiveMatch(s, 'tournament', { date: `${s.month}月・${round}試合目`, label, opponent, difficulty: t.kind === 'world' ? 70 : 48 + round * 2, kind: t.kind === 'world' ? 'world' : 'highschool' }); return; }
  const m = simulateMatch(s, label, opponent, `${s.month}月・${round}試合目`, t.kind === 'world' ? 'world' : 'highschool');
  t.rounds++;
  if (m.win) { t.wins++; s.experiencePoints += 5; s.currentSeason.notes.push(`${t.name}・勝利ボーナス経験点+5`); }
  if ((t.kind !== 'world' && !m.win) || t.rounds >= t.totalRounds) finishCareerTournament(s);
}
function monthlyFixtures(s: CareerState): CareerFixture[] {
  if (s.phase === 'university') {
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
    if (s.month === 12 && s.universityTournamentAlive) return [
      { date: '12/14・3回戦', label: '全国大学選手権 3回戦', opponent: opponentFor(s, 'university-championship'), difficulty: 62, kind: 'university-championship' },
      { date: '12/20・準々決勝', label: '全国大学選手権 準々決勝', opponent: opponentFor(s, 'university-championship'), difficulty: 66, kind: 'university-championship' },
    ];
    if (s.month === 1 && s.universityTournamentAlive) return [
      { date: '1/2・準決勝', label: '全国大学選手権 準決勝', opponent: opponentFor(s, 'university-championship'), difficulty: 70, kind: 'university-championship' },
      { date: '1/11・決勝', label: '全国大学選手権 決勝', opponent: opponentFor(s, 'university-championship'), difficulty: 73, kind: 'university-championship' },
    ];
  }
  if (s.phase === 'professional') {
    if (s.japanNationalTeamSelected && s.month === 9 && (s.age - 23) % 4 === 0 && (!s.worldCup || s.worldCup.completed)) {
      const shuffled = [...WORLD_CUP_TEAMS];
      for (let i = shuffled.length - 1; i > 0; i--) { const j = int(0, i); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
      const pools = [shuffled.slice(0,5), shuffled.slice(5,10), shuffled.slice(10,15), shuffled.slice(15,20)];
      const pool = pools.find((p) => p.includes('日本')) ?? pools[0];
      const opponents = pool.filter((x) => x !== '日本');
      s.worldCup = { year: 2023 + Math.max(0, Math.floor((s.age - 23) / 4)) * 4, pool: String.fromCharCode(65 + pools.indexOf(pool)), poolOpponents: opponents, poolRivalWins: opponents.map(() => int(0, 4)), poolPlayed: 0, poolWins: 0, qualified: false, knockoutStage: 0, completed: false };
      return opponents.map((opponent, i) => ({ date: `${9 + Math.floor(i * 2 / 3)}月・プール戦`, label: `ラグビーワールドカップ プール${s.worldCup!.pool} 第${i + 1}戦`, opponent, difficulty: 76 + i * 2, kind: 'world-cup' as const }));
    }
    if (s.month === 8 && s.japanNationalTeamSelected) return JAPAN_TEST_OPPONENTS.map((opponent, i) => ({ date: `8月・日本代表戦${i + 1}`, label: `日本代表テストマッチ 第${i + 1}戦`, opponent, difficulty: 72 + i * 2, kind: 'japan-test' as const }));
    if ([12,1,2,3,4,5].includes(s.month)) return s.proSchedule.filter((f, i) => i >= s.proMatchIndex && f.date.startsWith(`${s.month}月`));
    if (s.month === 6 && s.proDivision === 1 && s.currentSeason.leagueWins >= 11) return [
      { date: '5/23・プレーオフ', label: 'リーグワンD1 プレーオフ準々決勝', opponent: pick(PRO_TEAMS[1].filter((x) => x !== s.professionalTeam)), difficulty: 70, kind: 'professional-playoff' },
      { date: '5/30・プレーオフ', label: 'リーグワンD1 プレーオフ準決勝', opponent: pick(PRO_TEAMS[1].filter((x) => x !== s.professionalTeam)), difficulty: 74, kind: 'professional-playoff' },
      { date: '6/7・プレーオフ', label: 'リーグワンD1 プレーオフ決勝', opponent: pick(PRO_TEAMS[1].filter((x) => x !== s.professionalTeam)), difficulty: 77, kind: 'professional-playoff' },
    ];
    if (s.month === 6 && s.proDivision === 2 && s.currentSeason.leagueWins >= 10) return [
      { date: '5月下旬・入替戦', label: 'リーグワンD1/D2入替戦', opponent: pick(PRO_TEAMS[1]), difficulty: 72, kind: 'professional-playoff' },
    ];
    if (s.month === 6 && s.proDivision === 3 && s.currentSeason.leagueWins >= 10) return [
      { date: '5月下旬・入替戦', label: 'リーグワンD2/D3入替戦', opponent: pick(PRO_TEAMS[2]), difficulty: 65, kind: 'professional-playoff' },
    ];
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
    if (s.worldCup.poolPlayed === 4) {
      const table = [{ team: '日本', wins: s.worldCup.poolWins, tie: rand() }, ...s.worldCup.poolOpponents.map((team, i) => ({ team, wins: s.worldCup.poolRivalWins[i] ?? int(0,4), tie: rand() }))].sort((a,b) => b.wins - a.wins || b.tie - a.tie);
      s.worldCup.qualified = table.findIndex((row) => row.team === '日本') < 2;
      if (s.worldCup.qualified) s.pendingFixtures = [
        { date: '10月・準々決勝', label: 'ラグビーワールドカップ 準々決勝', opponent: pick(WORLD_CUP_TEAMS.filter((x) => x !== '日本' && !s.worldCup!.poolOpponents.includes(x))), difficulty: 82, kind: 'world-cup' },
        { date: '10月・準決勝', label: 'ラグビーワールドカップ 準決勝', opponent: pick(WORLD_CUP_TEAMS.filter((x) => x !== '日本')), difficulty: 86, kind: 'world-cup' },
        { date: '10月・決勝', label: 'ラグビーワールドカップ 決勝', opponent: pick(WORLD_CUP_TEAMS.filter((x) => x !== '日本')), difficulty: 90, kind: 'world-cup' },
      ];
      else s.worldCup.completed = true;
    } else if (s.worldCup.poolPlayed > 4) {
      s.worldCup.knockoutStage++;
      if (!m.win || s.worldCup.knockoutStage >= 3) { s.worldCup.completed = true; s.pendingFixtures = []; }
      else if (s.worldCup.knockoutStage === 1 && s.pendingFixtures.length === 0) s.pendingFixtures = [{ date: '10月・準決勝', label: 'ラグビーワールドカップ 準決勝', opponent: pick(WORLD_CUP_TEAMS.filter((x) => x !== '日本')), difficulty: 86, kind: 'world-cup' }];
      else if (s.worldCup.knockoutStage === 2 && s.pendingFixtures.length === 0) s.pendingFixtures = [{ date: '10月・決勝', label: 'ラグビーワールドカップ 決勝', opponent: pick(WORLD_CUP_TEAMS.filter((x) => x !== '日本')), difficulty: 90, kind: 'world-cup' }];
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
  if (fixture.kind === 'professional-playoff' && !m.win) s.pendingFixtures = [];
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
  updateRivals(s);
  const total = r.wins + r.losses + r.draws;
  s.history.unshift(`${r.age}歳・${r.team} ${r.year}年目：${r.wins}勝${r.losses}敗${r.draws}分、公式リーグ戦${r.leaguePlayed}試合（${r.leagueWins}勝${r.leagueLosses}敗${r.leagueDraws}分）、先発${r.starts}・途中出場${r.substituteApps}・控え${r.bench}・メンバー外${r.notSelected}、出場${r.appearances}試合、${r.tries}トライ。`);
  if (total > 0 && r.wins / total >= 0.65) { for (const k of STAT_KEYS) s.player.stats[k] = clamp(s.player.stats[k] + 0.25, 0, 200); s.history.unshift('好成績による自信で、全能力が少し成長した。'); }
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
function evaluateHighSchoolCandidate(s: CareerState): boolean {
  const avg = s.highSchoolRatingCount ? s.highSchoolRatingTotal / s.highSchoolRatingCount : 0;
  return careerOverall(s) >= 52 && s.highSchoolAppearances >= 4 && (s.highSchoolTries >= 2 || avg >= 6.5);
}
function advanceCalendar(s: CareerState): void {
  s.fatigue = clamp(s.fatigue - (s.trainingPlan === '回復' ? 30 : s.trainingPlan === '持久力' ? 22 : 16), 0, 100);
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
      if (s.phase === 'professional') { s.proMatchIndex = 0; s.proSchedule = buildProSchedule(s); s.proContractYears = Math.max(0, s.proContractYears - 1); }
    }
  } else s.month = s.month === 12 ? 1 : s.month + 1;
  s.pendingFixtures = []; s.tournamentCompletedMonth = undefined;
  if (s.phase !== 'retired') s.currentSeason.age = s.age;
}
export function careerGrowthMultiplier(s: CareerState): number {
  return s.player.talentType === '天才' ? 2 : 1;
}

function applyCareerDevelopment(s: CareerState): void {
  const baseStage = s.phase === 'highschool' ? 1.15 * 1.45 : s.phase === 'university' ? 0.95 * 1.30 : 0.55;
  const ageFactor = s.age < 22 ? 1 : s.age < 27 ? 0.72 : s.age < 31 ? 0.42 : s.age < 34 ? 0.18 : 0.05;
  const planFactor: Record<CareerTrainingPlan, number> = { 'バランス': 1, '筋力': 0.9, '技術': 1.05, '持久力': 0.88, '回復': 0.68 };
  for (const k of STAT_KEYS) {
    const focus = k === s.training ? (s.trainingPlan === 'バランス' ? 1.35 : s.trainingPlan === '筋力' && ['pow','sta'].includes(k) ? 1.8 : s.trainingPlan === '技術' && ['tec','men'].includes(k) ? 1.8 : s.trainingPlan === '持久力' && ['sta','spd'].includes(k) ? 1.8 : 1.08) : 0.1;
    const inc = s.player.talent * careerGrowthMultiplier(s) * baseStage * Math.max(0.04, ageFactor) * planFactor[s.trainingPlan] * focus * Math.max(0.08, 1 - s.player.stats[k] / 220) * (0.85 + rand() * 0.3);
    s.player.stats[k] = clamp(s.player.stats[k] + inc, 0, 200);
    if (s.age >= 31 && rand() < (s.age >= 35 ? 0.12 : 0.045)) s.player.stats[k] = clamp(s.player.stats[k] - (s.age >= 35 ? 0.18 : 0.08), 0, 200);
  }
  if (s.trainingPlan === '筋力') s.fatigue = clamp(s.fatigue + 5, 0, 100);
  else if (s.trainingPlan === '持久力') s.fatigue = clamp(s.fatigue + 2, 0, 100);
  else if (s.trainingPlan === '回復') s.fatigue = clamp(s.fatigue - 12, 0, 100);
  if (s.fatigue > 85) s.morale = clamp(s.morale - 2, 0, 100);
  else if (s.fatigue < 35) s.morale = clamp(s.morale + 1, 0, 100);
  s.player.peak = Math.max(s.player.peak, careerOverall(s)); s.elapsedMonths++;
}
export function advanceCareerMonth(s: CareerState, interactive = false): CareerState {
  if (s.phase === 'retired' || s.liveMatch) return s;
  // UIから次へ進めた場合、提示中の契約オファーは現所属で更新してから進行する。
  if (s.pendingTransfer) { s.pendingTransfer = undefined; s.proContractYears = Math.max(2, s.proContractYears); s.history.unshift(`${s.age}歳：契約オファーを見送り、現所属で契約を更新。年俸${s.proSalary}万円でプレーを続ける。`); }
  if (s.phase === 'university' && s.month === 5) {
    const form = [...s.seasons].reverse().find((r) => r.phase === 'university');
    const eligible = careerOverall(s) >= 62 && (s.stageYear >= 2 || careerOverall(s) >= 68) && (!form || form.appearances >= 4);
    if (s.japanNationalTeamSelected && (careerOverall(s) < 58 || (form && form.appearances < 3))) { s.japanNationalTeamSelected = false; s.history.unshift('代表合宿での競争に敗れ、日本代表から落選。リーグで結果を残せば再招集の可能性がある。'); }
    else if (!s.japanNationalTeamSelected && eligible) { s.japanNationalTeamSelected = true; s.history.unshift(`大学での能力と実績が評価され、${s.stageYear}年生で日本代表に${s.japanNationalTeamCaps ? '再選出' : '選出'}！6月のテストマッチに出場する。`); }
  }
  if (s.phase === 'professional' && s.month === 7) {
    const form = [...s.seasons].reverse().find((r) => r.phase === 'professional');
    const eligible = careerOverall(s) >= 67 && s.seasons.some((r) => r.phase === 'university' && r.appearances >= 8) && (!form || form.appearances >= 5);
    if (s.japanNationalTeamSelected && (careerOverall(s) < 60 || (form && form.appearances < 3))) { s.japanNationalTeamSelected = false; s.history.unshift('代表選考で落選。クラブでの活躍を積み重ねて再招集を目指す。'); }
    else if (!s.japanNationalTeamSelected && eligible) { s.japanNationalTeamSelected = true; s.history.unshift(`クラブでの実績が評価され、日本代表に${s.japanNationalTeamCaps ? '再選出' : '選出'}！8月のテストマッチに出場する。`); }
  }
  if (s.pendingTournament) { playCareerTournamentMatch(s, interactive); saveCareer(s); return s; }
  if (s.pendingFixtures?.length) { playNextFixture(s, interactive); saveCareer(s); return s; }
  if (s.tournamentCompletedMonth === s.month) {
    applyCareerDevelopment(s);
    advanceCalendar(s); saveCareer(s); return s;
  }
  if (s.phase === 'highschool') {
    let event: { kind: 'summer' | 'pref' | 'nat' | 'newbie' | 'world'; name: string; rounds: number } | null = null;
    if (s.month === 7) event = { kind: 'summer', name: `${PREFS[s.prefIndex].name}夏季県大会`, rounds: 4 };
    else if (s.month === 11) event = { kind: 'pref', name: `${PREFS[s.prefIndex].name}花園予選`, rounds: 4 };
    else if (s.month === 12 && s.qualified) event = { kind: 'nat', name: '全国大会（花園）', rounds: 5 };
    else if (s.month === 2 && s.stageYear === 3 && evaluateHighSchoolCandidate(s)) {
      s.nationalCandidate = true; event = { kind: 'world', name: '高校日本代表候補・世界大会', rounds: 3 };
      s.history.unshift('高校大会での活躍が評価され、2月に高校日本代表候補へ選出された！');
    } else if (s.month === 2) event = { kind: 'newbie', name: `${PREFS[s.prefIndex].name}新人大会`, rounds: 3 };
    if (event) { s.pendingTournament = { name: event.name, kind: event.kind, totalRounds: event.rounds, rounds: 0, wins: 0 }; playCareerTournamentMatch(s, interactive); saveCareer(s); return s; }
  }
  if (s.phase === 'university' || s.phase === 'professional') {
    const fixtures = monthlyFixtures(s);
    if (fixtures.length) { s.pendingFixtures = fixtures; playNextFixture(s, interactive); saveCareer(s); return s; }
  }
  applyCareerDevelopment(s);
  advanceCalendar(s); saveCareer(s); return s;
}
export function saveCareer(s: CareerState): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* local storage may be unavailable */ }
}
export function loadCareer(): CareerState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as CareerState;
    if (s?.v !== 1 || !s.player?.stats || !Array.isArray(s.seasons)) return null;
    // 既存のキャリアセーブを新しい大会・個人成績データへ安全に移行する。
    if (typeof s.experiencePoints !== 'number' || !Number.isFinite(s.experiencePoints)) s.experiencePoints = 0;
    if (typeof s.prefIndex !== 'number') s.prefIndex = 26;
    if (typeof s.qualified !== 'boolean') s.qualified = false;
    if (typeof s.universityTournamentFinalist !== 'boolean') s.universityTournamentFinalist = false;
    if (!Array.isArray(s.pendingFixtures)) s.pendingFixtures = [];
    if (s.liveMatch && (!s.liveMatch.fixture || typeof s.liveMatch.elapsed !== 'number')) s.liveMatch = undefined;
    if (!Array.isArray(s.matchHistory)) s.matchHistory = [];
    if (typeof s.highSchoolAppearances !== 'number') s.highSchoolAppearances = 0;
    if (typeof s.highSchoolTries !== 'number') s.highSchoolTries = 0;
    if (typeof s.highSchoolRatingTotal !== 'number') s.highSchoolRatingTotal = 0;
    if (typeof s.highSchoolRatingCount !== 'number') s.highSchoolRatingCount = 0;
    if (typeof s.nationalCandidate !== 'boolean') s.nationalCandidate = false;
    if (typeof s.worldTournamentWins !== 'number') s.worldTournamentWins = 0;
    if (s.worldCup && (!Array.isArray(s.worldCup.poolOpponents) || typeof s.worldCup.poolPlayed !== 'number')) s.worldCup = undefined;
    if (s.worldCup && !Array.isArray(s.worldCup.poolRivalWins)) s.worldCup.poolRivalWins = s.worldCup.poolOpponents.map(() => 2);
    if (!s.player.talentType || !CAREER_TALENTS.some((x) => x.id === s.player.talentType)) s.player.talentType = '凡人';
    if (typeof s.japanNationalTeamSelected !== 'boolean') s.japanNationalTeamSelected = false;
    if (typeof s.japanNationalTeamCaps !== 'number') s.japanNationalTeamCaps = 0;
    if (typeof s.japanNationalTeamWins !== 'number') s.japanNationalTeamWins = 0;
    if (typeof s.professionalStarterGuaranteed !== 'boolean') s.professionalStarterGuaranteed = false;
    if (typeof s.fatigue !== 'number') s.fatigue = 0;
    if (typeof s.injuryMonths !== 'number') s.injuryMonths = 0;
    if (typeof s.morale !== 'number') s.morale = 60;
    if (!['バランス','筋力','技術','持久力','回復'].includes(s.trainingPlan)) s.trainingPlan = 'バランス';
    if (typeof s.proContractYears !== 'number') s.proContractYears = 2;
    if (typeof s.proSalary !== 'number') s.proSalary = 0;
    if (!Array.isArray(s.transferHistory)) s.transferHistory = [];
    if (!Array.isArray(s.rivals)) s.rivals = createCareerRivals(s);
    if (s.phase !== 'highschool' && !s.rivals.some((r) => r.country && r.country !== '日本')) addPhaseRivals(s);
    if (!Array.isArray(s.awards)) s.awards = [];
    for (const r of [...s.seasons, s.currentSeason]) { if (!r) continue; if (typeof r.starts !== 'number') r.starts = r.appearances || 0; if (typeof r.substituteApps !== 'number') r.substituteApps = 0; if (typeof r.bench !== 'number') r.bench = 0; if (typeof r.notSelected !== 'number') r.notSelected = Math.max(0, (r.played || 0) - (r.appearances || 0)); if (!Array.isArray(r.awards)) r.awards = []; }
    for (const m of s.matchHistory) if (!m.role) m.role = m.appeared ? '先発' : 'メンバー外';
    if (!s.universityGroup) s.universityGroup = groupForUniversity(s.university || '');
    if (s.university && !(UNIVERSITY_GROUPS[s.universityGroup] as readonly string[]).includes(s.university)) {
      s.university = pick(UNIVERSITY_GROUPS[s.universityGroup] as unknown as string[]);
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
    }
    return s;
  } catch { return null; }
}
export function hasCareerSave(): boolean { return loadCareer() !== null; }
export function clearCareer(): void { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
export const CAREER_POSITIONS: { id: Pos; label: string }[] = POSITIONS.map((id) => ({ id, label: POS_LABEL[id] }));
export const CAREER_STAT_LABEL: Record<StatKey, string> = STAT_LABEL;
export const CAREER_STAT_KEYS: readonly StatKey[] = STAT_KEYS;
