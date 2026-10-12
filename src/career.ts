import { UNIVS } from './data';
import { rand, int, pick, gauss, clamp } from './rng';
import { POS_LABEL, STAT_KEYS, STAT_LABEL, overallAt, rankOf } from './game';
import type { Pos, StatKey, Stats } from './game';

export type CareerPhase = 'highschool' | 'university' | 'professional' | 'retired';
export interface CareerSeason {
  age: number;
  phase: Exclude<CareerPhase, 'retired'>;
  year: number;
  team: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  pointsFor: number;
  pointsAgainst: number;
  appearances: number;
  tries: number;
  notes: string[];
}
export interface CareerPlayer {
  name: string;
  pos: Pos;
  stats: Stats;
  talent: number;
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
  experiencePoints: number;
  qualified: boolean;
  universityTournamentFinalist: boolean;
  pendingTournament?: { name: string; kind: 'summer' | 'pref' | 'nat' | 'newbie'; totalRounds: number; rounds: number; wins: number };
  tournamentCompletedMonth?: number;
  training: StatKey;
  player: CareerPlayer;
  highSchool: string;
  university: string;
  universityTier: string;
  professionalTeam: string;
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
const PRO_TEAMS = [
  '東日本製鋼ラグビー部', '関東電機ラグビー部', '東京ベイ・ラグビークラブ',
  '関西精工ラグビー部', '神戸ブルーウェーブRFC', '九州サンライズRFC',
  '中部自動車ラグビー部', '北日本銀行ラグビー部',
];
const PHASE_LABEL: Record<CareerPhase, string> = {
  highschool: '高校生', university: '大学生', professional: '社会人', retired: '引退',
};
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
export function careerOverall(s: CareerState): number { return Math.round(overallAt({ pos: s.player.pos, stats: s.player.stats } as never)); }
function newSeason(s: CareerState): CareerSeason {
  return { age: s.age, phase: s.phase === 'retired' ? 'professional' : s.phase, year: s.stageYear, team: currentTeam(s), played: 0, wins: 0, losses: 0, draws: 0, pointsFor: 0, pointsAgainst: 0, appearances: 0, tries: 0, notes: [] };
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
function assignUniversity(s: CareerState): void {
  const o = careerOverall(s);
  const group = o >= 75 ? UNIVS.top : o >= 65 ? UNIVS.high : UNIVS.mid;
  s.university = pick(group);
  s.universityTier = universityTierFor(o);
  s.history.unshift(`高校卒業。総合値${o}・${rankOf(o)}ランクの評価で、${s.university}へ進学。`);
  s.phase = 'university';
  s.stageYear = 1;
  s.age = 18;
  s.month = 4;
  s.currentSeason = newSeason(s);
}
function assignProfessional(s: CareerState): void {
  const wins = s.seasons.filter((x) => x.phase === 'university').reduce((n, x) => n + x.wins, 0);
  const o = careerOverall(s);
  const elite = o >= 78 || wins >= 18;
  const strong = o >= 65 || wins >= 12;
  const pool = elite ? PRO_TEAMS.slice(0, 3) : strong ? PRO_TEAMS.slice(0, 6) : PRO_TEAMS;
  s.professionalTeam = pick(pool);
  s.retirementAge = int(35, 38);
  s.history.unshift(`大学卒業。大学リーグでの勝利${wins}勝・総合値${o}を評価され、${s.professionalTeam}に加入。`);
  s.phase = 'professional';
  s.stageYear = 1;
  s.age = 22;
  s.month = 4;
  s.currentSeason = newSeason(s);
}
export function newCareer(name: string, pos: Pos): CareerState {
  const p = POSITIONS.includes(pos) ? pos : 'CTB';
  const base: Record<Pos, number> = { PR: 39, HO: 40, LO: 40, FL: 41, N8: 42, SH: 40, SO: 41, CTB: 42, WTB: 42, FB: 41 };
  const stats = {} as Stats;
  for (const k of STAT_KEYS) stats[k] = clamp(base[p] + gauss(0, 5), 22, 58);
  const [h, w] = BODY[p];
  const player: CareerPlayer = {
    name: name.trim().slice(0, 24) || 'ラグビー選手',
    pos: p, stats, talent: clamp(gauss(1, 0.22), 0.65, 1.5),
    height: Math.round(h + gauss(0, 3)), weight: Math.round(w + gauss(0, 4)),
    peak: 0,
  };
  const s = {
    v: 1 as const, phase: 'highschool' as CareerPhase, age: 15, month: 4, stageYear: 1,
    elapsedMonths: 0, experiencePoints: 0, qualified: false, universityTournamentFinalist: false, training: 'tec' as StatKey, player, highSchool: '青葉高校ラグビー部',
    university: '', universityTier: '', professionalTeam: '', retirementAge: 36,
    seasons: [] as CareerSeason[], currentSeason: {} as CareerSeason,
    history: ['15歳で高校ラグビー生活がスタート。3年間の成長と活躍を目指す。'],
  };
  player.peak = careerOverall(s);
  s.currentSeason = newSeason(s);
  saveCareer(s);
  return s;
}
export function setCareerTraining(s: CareerState, k: StatKey): void {
  if (STAT_KEYS.includes(k)) s.training = k;
}
function awardMatchExperience(s: CareerState, my: number, their: number, appearance: boolean, scoredTry: boolean): number {
  const base = my > their ? 35 : my === their ? 20 : 10;
  const earned = base + (appearance ? 10 : 0) + (scoredTry ? 15 : 0);
  s.experiencePoints += earned;
  return earned;
}
function simulateMatch(s: CareerState, label = `${s.month}月リーグ戦`): { my: number; their: number; win: boolean; exp: number } {
  const o = careerOverall(s);
  const expected = s.phase === 'highschool' ? 43 : s.phase === 'university' ? 59 : 66;
  const appearanceChance = clamp(0.5 + (o - expected) / 65 + (s.player.talent - 1) * 0.2, 0.12, 0.98);
  const appearance = rand() < appearanceChance;
  const teamBonus = s.phase === 'university' ? (s.universityTier === '最上位' ? 5 : s.universityTier === '上位' ? 3 : 0) : s.phase === 'professional' ? 4 : 0;
  const strength = o + teamBonus + gauss(0, 8);
  const opponent = expected + gauss(0, 10);
  const my = Math.max(0, Math.round(22 + (strength - opponent) * 0.55 + gauss(0, 8)));
  const their = Math.max(0, Math.round(22 + (opponent - strength) * 0.55 + gauss(0, 8)));
  const season = s.currentSeason;
  season.played++;
  season.pointsFor += my;
  season.pointsAgainst += their;
  if (my > their) season.wins++;
  else if (my < their) season.losses++;
  else season.draws++;
  const scoredTry = appearance && rand() < clamp(0.08 + s.player.stats.spd / 500 + s.player.stats.tec / 700, 0.08, 0.38);
  if (appearance) season.appearances++;
  if (scoredTry) season.tries++;
  const exp = awardMatchExperience(s, my, their, appearance, scoredTry);
  season.notes.push(`${label} ${my}-${their}（${appearance ? '出場' : '出場機会なし'}${scoredTry ? '・トライ' : ''}／経験点+${exp}）`);
  s.history.unshift(`${label} ${my}-${their}。経験点+${exp}。`);
  return { my, their, win: my > their, exp };
}
function finishCareerTournament(s: CareerState): void {
  const t = s.pendingTournament;
  if (!t) return;
  const title = t.wins === t.totalRounds;
  const runnerUp = t.kind === 'pref' && t.wins === t.totalRounds - 1;
  const result = title ? '優勝' : runnerUp ? '準優勝' : `${t.rounds}回戦敗退`;
  const bonus = title ? 40 : runnerUp ? 20 : t.wins * 5;
  s.experiencePoints += bonus;
  s.currentSeason.notes.push(`${t.name}：${result}（大会ボーナス経験点+${bonus}）`);
  s.history.unshift(`${t.name}：${result}。大会ボーナス経験点+${bonus}。`);
  if (t.kind === 'pref') s.qualified = t.wins >= t.totalRounds - 1;
  if (t.kind === 'nat') s.qualified = false;
  s.pendingTournament = undefined;
  s.tournamentCompletedMonth = s.month;
}
function playCareerTournamentMatch(s: CareerState): void {
  const t = s.pendingTournament;
  if (!t) return;
  const round = t.rounds + 1;
  const m = simulateMatch(s, `${t.name}・${round}回戦`);
  t.rounds++;
  if (m.win) {
    t.wins++;
    s.experiencePoints += 5;
    s.currentSeason.notes.push(`${t.name}・${round}回戦勝利ボーナス経験点+5`);
  }
  if (!m.win || t.rounds >= t.totalRounds) finishCareerTournament(s);
}
function finishSeason(s: CareerState): void {
  const r = s.currentSeason;
  s.seasons.push(clone(r));
  const total = r.wins + r.losses + r.draws;
  s.history.unshift(`${r.age}歳・${r.team} ${r.year}年目：${r.wins}勝${r.losses}敗${r.draws}分、出場${r.appearances}試合、${r.tries}トライ。`);
  if (total > 0 && r.wins / total >= 0.65) {
    for (const k of STAT_KEYS) s.player.stats[k] = clamp(s.player.stats[k] + 0.25, 0, 99);
    s.history.unshift('好成績による自信で、全能力が少し成長した。');
  }
}
export function advanceCareerMonth(s: CareerState): CareerState {
  if (s.phase === 'retired') return s;
  // 大会は監督モードと同じく1試合ずつ進行。大会終了後の月送りも別操作。
  if (s.pendingTournament) {
    playCareerTournamentMatch(s);
    saveCareer(s);
    return s;
  }
  const alreadyPlayedThisMonth = s.tournamentCompletedMonth === s.month;
  if (!alreadyPlayedThisMonth) {
    if (s.phase === 'highschool') {
      const event = s.month === 7 ? { kind: 'summer' as const, name: '夏季県大会', rounds: 4 }
        : s.month === 11 ? { kind: 'pref' as const, name: '花園予選（県大会）', rounds: 4 }
        : s.month === 12 && s.qualified ? { kind: 'nat' as const, name: '全国大会（花園）', rounds: 5 }
        : s.month === 2 ? { kind: 'newbie' as const, name: '新人大会', rounds: 3 } : null;
      if (event) {
        s.pendingTournament = { name: event.name, kind: event.kind, totalRounds: event.rounds, rounds: 0, wins: 0 };
        playCareerTournamentMatch(s);
        saveCareer(s);
        return s;
      }
    } else if (s.phase === 'university' && s.month >= 9 && s.month <= 12) {
      simulateMatch(s, `${s.month}月大学リーグ戦`);
      s.tournamentCompletedMonth = s.month;
      saveCareer(s);
      return s;
    } else if (s.phase === 'university' && s.month === 1) {
      s.universityTournamentFinalist = false;
      const m = simulateMatch(s, '大学冬季トーナメント準決勝');
      s.universityTournamentFinalist = m.win;
      const bonus = m.win ? 15 : 0;
      s.experiencePoints += bonus;
      s.currentSeason.notes.push(`冬季トーナメント準決勝ボーナス経験点+${bonus}`);
      s.tournamentCompletedMonth = s.month;
      saveCareer(s);
      return s;
    } else if (s.phase === 'university' && s.month === 2 && s.universityTournamentFinalist) {
      const m = simulateMatch(s, '大学冬季トーナメント決勝');
      const bonus = m.win ? 40 : 20;
      s.experiencePoints += bonus;
      s.currentSeason.notes.push(`冬季トーナメント決勝ボーナス経験点+${bonus}`);
      s.history.unshift(`大学冬季トーナメント決勝：${m.win ? '優勝' : '準優勝'}。ボーナス経験点+${bonus}。`);
      s.universityTournamentFinalist = false;
      s.tournamentCompletedMonth = s.month;
      saveCareer(s);
      return s;
    } else if (s.phase === 'professional' && [7, 11, 2].includes(s.month)) {
      simulateMatch(s, `${s.month}月社会人リーグ戦`);
      s.tournamentCompletedMonth = s.month;
      saveCareer(s);
      return s;
    }
  }
  const stageFactor = s.phase === 'highschool' ? 1.15 : s.phase === 'university' ? 0.95 : 0.55;
  for (const k of STAT_KEYS) {
    const focus = k === s.training ? 1.15 : 0.12;
    const inc = s.player.talent * stageFactor * focus * (1 - s.player.stats[k] / 125) * (0.85 + rand() * 0.3);
    s.player.stats[k] = clamp(s.player.stats[k] + inc, 0, 99);
  }
  s.player.peak = Math.max(s.player.peak, careerOverall(s));
  s.elapsedMonths++;
  s.tournamentCompletedMonth = undefined;
  if (s.month === 3) {
    finishSeason(s);
    if (s.phase === 'highschool' && s.stageYear >= 3) {
      assignUniversity(s);
    } else if (s.phase === 'university' && s.stageYear >= 4) {
      assignProfessional(s);
    } else if (s.phase === 'professional' && s.age >= s.retirementAge) {
      s.phase = 'retired';
      const games = s.seasons.reduce((n, r) => n + r.appearances, 0);
      const tries = s.seasons.reduce((n, r) => n + r.tries, 0);
      s.finalSummary = `${s.player.name}は${s.age}歳で現役を引退。通算出場${games}試合、${tries}トライ。最高総合値${Math.round(s.player.peak)}。獲得経験点${s.experiencePoints}。`;
      s.history.unshift(s.finalSummary);
    } else {
      s.stageYear++;
      s.age++;
      s.month = 4;
      s.currentSeason = newSeason(s);
    }
  } else {
    s.month = s.month === 12 ? 1 : s.month + 1;
  }
  if (s.phase !== 'retired') s.currentSeason.age = s.age;
  saveCareer(s);
  return s;
}
export function saveCareer(s: CareerState): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* local storage may be unavailable */ }
}
export function loadCareer(): CareerState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as CareerState;
    return s?.v === 1 && s.player?.stats && Array.isArray(s.seasons) ? s : null;
  } catch { return null; }
}
export function hasCareerSave(): boolean { return loadCareer() !== null; }
export function clearCareer(): void { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
export const CAREER_POSITIONS: { id: Pos; label: string }[] = POSITIONS.map((id) => ({ id, label: POS_LABEL[id] }));
export const CAREER_STAT_LABEL: Record<StatKey, string> = STAT_LABEL;
export const CAREER_STAT_KEYS: readonly StatKey[] = STAT_KEYS;
