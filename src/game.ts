import { PREFS, SURNAMES, GIVEN, MIDDLE, SUFFIX, UNIVS, schoolsOf } from './data';
import { rand, int, pick, gauss, clamp } from './rng';
import { generateUniqueJapaneseName } from './names';

export type Pos = 'PR' | 'HO' | 'LO' | 'FL' | 'N8' | 'SH' | 'SO' | 'CTB' | 'WTB' | 'FB';

export const POS_LABEL: Record<Pos, string> = {
  PR: 'プロップ', HO: 'フッカー', LO: 'ロック', FL: 'フランカー', N8: 'ナンバーエイト',
  SH: 'スクラムハーフ', SO: 'スタンドオフ', CTB: 'センター', WTB: 'ウイング', FB: 'フルバック',
};

/** 先発15人の枠 */
export const SLOTS: Pos[] = ['PR', 'HO', 'PR', 'LO', 'LO', 'FL', 'FL', 'N8', 'SH', 'SO', 'CTB', 'CTB', 'WTB', 'WTB', 'FB'];

export const STAT_KEYS = ['pow', 'spd', 'sta', 'tec', 'men'] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;
export const STAT_LABEL: Record<StatKey, string> = {
  pow: 'パワー', spd: 'スピード', sta: 'スタミナ', tec: 'テクニック', men: 'メンタル',
};

/** ポジションごとの能力の重み [pow, spd, sta, tec, men] */
const W: Record<Pos, number[]> = {
  PR: [0.4, 0.05, 0.2, 0.15, 0.2],
  HO: [0.3, 0.1, 0.2, 0.2, 0.2],
  LO: [0.35, 0.1, 0.2, 0.15, 0.2],
  FL: [0.25, 0.15, 0.3, 0.15, 0.15],
  N8: [0.3, 0.2, 0.2, 0.15, 0.15],
  SH: [0.1, 0.2, 0.2, 0.3, 0.2],
  SO: [0.1, 0.15, 0.15, 0.35, 0.25],
  CTB: [0.2, 0.25, 0.15, 0.25, 0.15],
  WTB: [0.1, 0.45, 0.15, 0.2, 0.1],
  FB: [0.1, 0.25, 0.15, 0.3, 0.2],
};

/** 身長(cm)・体重(kg)の目安 */
const BODY: Record<Pos, [number, number]> = {
  PR: [172, 92], HO: [172, 86], LO: [183, 90], FL: [177, 82], N8: [180, 88],
  SH: [167, 66], SO: [170, 68], CTB: [173, 76], WTB: [172, 68], FB: [172, 70],
};

export interface Player {
  id: number;
  name: string;
  pos: Pos;
  status: 'committed' | 'active' | 'graduated';
  grade: number;
  stats: Stats;
  talent: number;
  stars: number;
  height: number;
  weight: number;
  origin: string;
  gradYear: number;
  career?: string;
  peak: number;
}

export type TourKind = 'summer' | 'pref' | 'nat' | 'newbie';

export type Tactic = 'balanced' | 'power' | 'wide' | 'kicking' | 'defense';
export const TACTICS: { id: Tactic; label: string; desc: string }[] = [
  { id: 'balanced', label: 'バランス重視', desc: '安定した基本戦術。相手を選ばない' },
  { id: 'power', label: 'FW・接点勝負', desc: 'パワーを活かす。パワー型のチーム向け' },
  { id: 'wide', label: '展開ラグビー', desc: 'スピードを活かす。走力のあるチーム向け' },
  { id: 'kicking', label: 'キック・判断重視', desc: 'テクニックを活かす。技術型のチーム向け' },
  { id: 'defense', label: '堅守・カウンター', desc: '失点を抑える。格上相手にも有効' },
];

export interface PendingTour {
  year: number;
  kind: TourKind;
  name: string;
  totalRounds: number;
  rounds: Round[];
}

export interface Round {
  label: string;
  opp: string;
  my: number;
  their: number;
  win: boolean;
}

export interface TourRecord {
  year: number;
  name: string;
  kind: TourKind;
  rounds: Round[];
  result: string;
  title: boolean;
}

export interface GradEntry {
  id: number;
  name: string;
  pos: Pos;
  ov: number;
  career: string;
}

export interface GradRecord {
  year: number;
  list: GradEntry[];
}

export interface ScoutEntry {
  year: number;
  month: number;
  name: string;
  pos: Pos;
  ov: number;
  stars: number;
  accepted: boolean;
  mode: string;
}

export interface GameState {
  v: 1;
  prefIdx: number;
  schoolName: string;
  power: number;
  year: number;
  month: number;
  reputation: number;
  players: Player[];
  nextId: number;
  scoutedThisMonth: boolean;
  qualified: boolean;
  tours: TourRecord[];
  grads: GradRecord[];
  scoutLog: ScoutEntry[];
  news: string[];
  /** SLOTSの順番で指定する先発15人。旧セーブでは未設定でも自動選出する */
  lineup?: number[];
  tactic?: Tactic;
  /** 大会を1試合ずつ進めるための途中状態 */
  pendingTour?: PendingTour;
  /** 大会終了後、月送りを待っている月（旧セーブ互換のため任意） */
  tourCompletedMonth?: number;
}

export const MAX_COMMIT = 14;

/* ---------- 能力値まわり ---------- */

export function overallAt(p: Player, pos: Pos = p.pos): number {
  const w = W[pos];
  const s = p.stats;
  return s.pow * w[0] + s.spd * w[1] + s.sta * w[2] + s.tec * w[3] + s.men * w[4];
}

export function overall(p: Player): number {
  return Math.round(overallAt(p));
}

export function rankOf(o: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'E' {
  if (o >= 75) return 'S';
  if (o >= 65) return 'A';
  if (o >= 55) return 'B';
  if (o >= 45) return 'C';
  if (o >= 35) return 'D';
  return 'E';
}

export function starsOf(talent: number): number {
  return clamp(Math.round(((talent - 0.6) / 0.9) * 4 + 1), 1, 5);
}

export function shownStars(p: Player): number {
  return p.status === 'committed' ? p.stars : starsOf(p.talent);
}

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function posPicker(): () => Pos {
  let bag: Pos[] = [];
  return () => {
    if (bag.length === 0) bag = shuffle([...SLOTS]);
    return bag.pop() as Pos;
  };
}

function midSchool(short: string): string {
  return `${short}${pick(MIDDLE)}中学`;
}

interface MakeOpts {
  pos: Pos;
  status: Player['status'];
  grade: number;
  target: number;
  talent: number;
  origin: string;
  gradYear: number;
  fuzz?: boolean;
}

function makePlayer(s: GameState, o: MakeOpts): Player {
  const w = W[o.pos];
  const bias = (w.reduce((a, x) => a + x * x, 0) - 0.2) * 60;
  const v = (i: number) => clamp(o.target + (w[i] - 0.2) * 60 - bias + gauss(0, 4), 5, 99);
  const stats: Stats = { pow: v(0), spd: v(1), sta: v(2), tec: v(3), men: v(4) };
  const [h, wt] = BODY[o.pos];
  let stars = starsOf(o.talent);
  if (o.fuzz && rand() < 0.25) stars = clamp(stars + (rand() < 0.5 ? -1 : 1), 1, 5);
  const p: Player = {
    id: s.nextId++,
    name: generateUniqueJapaneseName(new Set([...s.players.map((player) => player.name), ...s.grads.map((grad) => grad.name), ...s.scoutLog.map((entry) => entry.name)]), rand),
    pos: o.pos,
    status: o.status,
    grade: o.grade,
    stats,
    talent: o.talent,
    stars,
    height: Math.round(h + gauss(0, 3)),
    weight: Math.round(wt + gauss(0, 5)),
    origin: o.origin,
    gradYear: o.gradYear,
    peak: 0,
  };
  p.peak = overallAt(p);
  return p;
}

/* ---------- 新規ゲーム ---------- */

export function newGame(prefIdx: number, type: number): GameState {
  const sc = schoolsOf(prefIdx)[type];
  const s: GameState = {
    v: 1,
    prefIdx,
    schoolName: sc.name,
    power: sc.power,
    year: 1,
    month: 4,
    reputation: 20 + sc.power * 8,
    players: [],
    nextId: 1,
    scoutedThisMonth: false,
    qualified: false,
    tours: [],
    grads: [],
    scoutLog: [],
    news: [`${sc.name}ラグビー部の監督に就任した。`],
  };
  const pk = posPicker();
  const short = PREFS[prefIdx].short;
  for (let g = 1; g <= 3; g++) {
    for (let i = 0; i < 9; i++) {
      s.players.push(
        makePlayer(s, {
          pos: pk(),
          status: 'active',
          grade: g,
          target: gauss(30 + sc.power * 5 + (g - 1) * 4, 6),
          talent: clamp(gauss(1, 0.2), 0.6, 1.5),
          origin: midSchool(short),
          gradYear: 1 + (3 - g),
        }),
      );
    }
  }
  s.lineup = pickStarters(s.players).map((x) => x.player?.id ?? 0);
  s.tactic = 'balanced';
  return s;
}

/* ---------- チーム力 ---------- */

export interface StarterSlot {
  slot: Pos;
  player: Player | null;
  value: number;
}

export function pickStarters(players: Player[], maxGrade = 3, preferredIds?: number[]): StarterSlot[] {
  const pool = players.filter((p) => p.status === 'active' && p.grade <= maxGrade);
  const used = new Set<number>();
  const out: StarterSlot[] = [];
  for (let idx = 0; idx < SLOTS.length; idx++) {
    const slot = SLOTS[idx];
    const preferred = preferredIds?.[idx];
    let best: Player | null = preferred == null ? null : pool.find((p) => p.id === preferred && !used.has(p.id)) ?? null;
    let bv = best ? overallAt(best, slot) * (best.pos === slot ? 1 : 0.85) : -1;
    if (!best) for (const p of pool) {
      if (used.has(p.id)) continue;
      const v = overallAt(p, slot) * (p.pos === slot ? 1 : 0.85);
      if (v > bv) {
        bv = v;
        best = p;
      }
    }
    if (best) used.add(best.id);
    out.push({ slot, player: best, value: best ? bv : 20 });
  }
  return out;
}

export function teamStrength(s: GameState, maxGrade = 3): number {
  const st = pickStarters(s.players, maxGrade, s.lineup);
  return st.reduce((a, x) => a + x.value, 0) / st.length;
}

export function ensureMatchSetup(s: GameState): void {
  if (!s.tactic || !TACTICS.some((t) => t.id === s.tactic)) s.tactic = 'balanced';
  const active = s.players.filter((p) => p.status === 'active').map((p) => p.id);
  const valid = Array.isArray(s.lineup) && s.lineup.length === SLOTS.length &&
    s.lineup.every((id) => active.includes(id)) && new Set(s.lineup).size === SLOTS.length;
  if (!valid) s.lineup = pickStarters(s.players).map((x) => x.player?.id ?? 0);
}

export function setLineupSlot(s: GameState, slotIndex: number, playerId: number): boolean {
  ensureMatchSetup(s);
  if (slotIndex < 0 || slotIndex >= SLOTS.length) return false;
  const p = s.players.find((x) => x.id === playerId && x.status === 'active');
  if (!p || (s.lineup as number[]).some((id, i) => i !== slotIndex && id === playerId)) return false;
  const next = [...(s.lineup as number[])];
  next[slotIndex] = playerId;
  s.lineup = next;
  return true;
}

/* ---------- スカウト ---------- */

export interface ScoutMode {
  id: string;
  label: string;
  desc: string;
  mean: number;
  sd: number;
  base: number;
  tBonus: number;
}

export const SCOUT_MODES: ScoutMode[] = [
  { id: 'local', label: '地元の中学を回る', desc: '入部してくれやすいが、素質は平均的', mean: 38, sd: 8, base: 0.75, tBonus: 0 },
  { id: 'strong', label: '強豪中学を訪ねる', desc: '有望な選手が多いが、断られることも', mean: 48, sd: 9, base: 0.5, tBonus: 0.05 },
  { id: 'national', label: '全国のトップ選手を狙う', desc: '逸材に出会えるが、まず断られる', mean: 58, sd: 10, base: 0.3, tBonus: 0.12 },
];

export interface ScoutResult {
  player: Player;
  accepted: boolean;
}

export function committedCount(s: GameState): number {
  return s.players.filter((p) => p.status === 'committed').length;
}

export function acceptChance(s: GameState, m: ScoutMode): number {
  return clamp(m.base + (s.reputation - 50) / 200 + (s.power - 3) * 0.03, 0.05, 0.95);
}

export function scout(s: GameState, modeId: string): ScoutResult[] | null {
  const m = SCOUT_MODES.find((x) => x.id === modeId);
  if (!m || s.scoutedThisMonth || committedCount(s) >= MAX_COMMIT) return null;
  const pk = posPicker();
  const chance = acceptChance(s, m);
  const res: ScoutResult[] = [];
  for (let i = 0; i < 2; i++) {
    const q = clamp(gauss(m.mean, m.sd), 20, 85);
    const origin = m.id === 'national' ? midSchool(pick(PREFS).short) : midSchool(PREFS[s.prefIdx].short);
    const p = makePlayer(s, {
      pos: pk(),
      status: 'committed',
      grade: 0,
      target: clamp(q * 0.85, 15, 75),
      talent: clamp(gauss(1 + m.tBonus, 0.25), 0.6, 1.5),
      origin,
      gradYear: 0,
      fuzz: true,
    });
    const accepted = rand() < chance && committedCount(s) < MAX_COMMIT;
    if (accepted) s.players.push(p);
    else s.nextId--; // 断られた選手のIDは使わない
    s.scoutLog.unshift({ year: s.year, month: s.month, name: p.name, pos: p.pos, ov: overall(p), stars: p.stars, accepted, mode: m.label });
    res.push({ player: p, accepted });
  }
  s.scoutLog = s.scoutLog.slice(0, 16);
  s.scoutedThisMonth = true;
  return res;
}

/* ---------- 大会 ---------- */

const TOURS: Record<TourKind, { name: string; rounds: number }> = {
  summer: { name: '夏季県大会', rounds: 4 },
  pref: { name: '花園予選（県大会）', rounds: 4 },
  nat: { name: '全国大会（花園）', rounds: 5 },
  newbie: { name: '新人大会', rounds: 3 },
};

const ORDER = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
const EVENTS: [number, string][] = [
  [7, '夏季県大会'],
  [11, '花園予選（県大会）'],
  [12, '全国大会（花園・予選突破時のみ）'],
  [2, '新人大会'],
];

export function nextEvent(month: number): { label: string; inMonths: number } {
  const cur = ORDER.indexOf(month);
  let best: { label: string; inMonths: number } | null = null;
  for (const [m, label] of EVENTS) {
    let d = ORDER.indexOf(m) - cur;
    if (d < 0) d += 12;
    if (!best || d < best.inMonths) best = { label, inMonths: d };
  }
  return best as { label: string; inMonths: number };
}

function roundName(idx: number, n: number): string {
  if (idx === n - 1) return '決勝';
  if (idx === n - 2) return '準決勝';
  if (idx === n - 3) return '準々決勝';
  return `${idx + 1}回戦`;
}

export function playMatch(S: number, O: number): { my: number; their: number; win: boolean } {
  const d = S - O;
  let a = Math.max(0, Math.round(20 + d * 0.5 + gauss(0, 7)));
  let b = Math.max(0, Math.round(20 - d * 0.5 + gauss(0, 7)));
  if (a === b) {
    if (rand() < 0.5 + d / 100) a += 3;
    else b += 3;
  }
  return { my: a, their: b, win: a > b };
}

function startTour(s: GameState, kind: TourKind): void {
  const cfg = TOURS[kind];
  s.pendingTour = { year: s.year, kind, name: cfg.name, totalRounds: cfg.rounds, rounds: [] };
}

function tacticBonus(s: GameState, maxGrade: number): { attack: number; defense: number } {
  const starters = pickStarters(s.players, maxGrade, s.lineup).filter((x) => x.player);
  if (!starters.length) return { attack: 0, defense: 0 };
  const avg = (k: StatKey) => starters.reduce((sum, x) => sum + (x.player?.stats[k] ?? 0), 0) / starters.length;
  const tactic = s.tactic ?? 'balanced';
  if (tactic === 'power') return { attack: avg('pow') >= avg('spd') ? 3 : 0.5, defense: 0 };
  if (tactic === 'wide') return { attack: avg('spd') >= avg('pow') ? 3 : 0.5, defense: 0 };
  if (tactic === 'kicking') return { attack: avg('tec') >= avg('pow') ? 2.5 : 0.5, defense: 0 };
  if (tactic === 'defense') return { attack: -0.5, defense: 3 };
  return { attack: 0, defense: 0 };
}

function finishTour(s: GameState): TourRecord {
  const p = s.pendingTour as PendingTour;
  const wins = p.rounds.filter((x) => x.win).length;
  const title = wins === p.totalRounds;
  const result = title ? '優勝' : wins === p.totalRounds - 1 ? '準優勝' : `${roundName(wins, p.totalRounds)}敗退`;
  let d = 0;
  if (p.kind === 'nat') d = 3 + wins * 4 + (title ? 15 : 0);
  else if (p.kind === 'pref') d = wins * 3 + (title ? 10 : 0) - (wins === 0 ? 3 : 0);
  else d = (wins * 3 + (title ? 10 : 0) - (wins === 0 ? 3 : 0)) * 0.6;
  s.reputation = clamp(s.reputation + d, 0, 100);
  const rec: TourRecord = { year: p.year, name: p.name, kind: p.kind, rounds: p.rounds, result, title };
  s.tours.push(rec);
  if (s.tours.length > 80) s.tours.shift();
  s.pendingTour = undefined;
  s.tourCompletedMonth = s.month;
  if (p.kind === 'pref') s.qualified = result === '優勝' || result === '準優勝';
  if (p.kind === 'nat') s.qualified = false;
  return rec;
}

function playPendingMatch(s: GameState): { match: Round; matchNumber: number; matchTotal: number; tour?: TourRecord } {
  const p = s.pendingTour as PendingTour;
  const idx = p.rounds.length;
  const maxGrade = p.kind === 'newbie' ? 2 : 3;
  const S = teamStrength(s, maxGrade);
  const pf = PREFS[s.prefIdx];
  const O = p.kind === 'nat'
    ? 42 + idx * 5 + gauss(0, 3.5)
    : 24 + pf.p * 4 + idx * (p.kind === 'newbie' ? 5 : 4) + gauss(0, 3.5);
  let opp = '';
  for (let t = 0; t < 8; t++) {
    const area = p.kind === 'nat' ? pick(PREFS).short : pf.short;
    opp = `${area}${pick(SUFFIX)}高校`;
    if (opp !== s.schoolName) break;
  }
  const bonus = tacticBonus(s, maxGrade);
  const m = playMatch(S + bonus.attack, O - bonus.defense);
  const match: Round = { label: roundName(idx, p.totalRounds), opp, my: m.my, their: m.their, win: m.win };
  p.rounds.push(match);
  const done = !m.win || p.rounds.length >= p.totalRounds;
  let tour: TourRecord | undefined;
  if (done) tour = finishTour(s);
  return { match, matchNumber: idx + 1, matchTotal: p.totalRounds, tour };
}

/* ---------- 月の進行 ---------- */

const GROW = [0.55, 0.8, 0.65, 0.45];

function growPlayers(s: GameState): void {
  const season = s.month >= 6 && s.month <= 8 ? 1.25 : s.month <= 3 ? 0.8 : 1;
  for (const p of s.players) {
    if (p.status === 'graduated') continue;
    const g = GROW[p.status === 'committed' ? 0 : p.grade];
    for (const k of STAT_KEYS) {
      const inc = p.talent * g * season * (0.8 + rand() * 0.4) * (1 - p.stats[k] / 130);
      p.stats[k] = clamp(p.stats[k] + inc, 0, 99);
    }
    p.peak = Math.max(p.peak, overallAt(p));
  }
}

export function careerFor(o: number): string {
  if (o >= 85) return `${pick(UNIVS.top)}へ進学（日本代表候補）`;
  if (o >= 75) return `${pick(UNIVS.top)}へスポーツ推薦で進学`;
  if (o >= 65) return `${pick(UNIVS.high)}へ進学`;
  if (o >= 55) return `${pick(UNIVS.mid)}へ進学`;
  if (o >= 45) return pick(UNIVS.low);
  return pick(UNIVS.none);
}

function graduate(s: GameState): GradRecord {
  const list: GradEntry[] = [];
  for (const p of s.players) {
    if (p.status !== 'active') continue;
    if (p.grade >= 3) {
      p.status = 'graduated';
      p.gradYear = s.year;
      p.career = careerFor(overall(p));
      list.push({ id: p.id, name: p.name, pos: p.pos, ov: overall(p), career: p.career });
    } else {
      p.grade++;
    }
  }
  list.sort((a, b) => b.ov - a.ov);
  const rec: GradRecord = { year: s.year, list };
  s.grads.push(rec);
  return rec;
}

function enroll(s: GameState): { scouted: Player[]; walkOns: number } {
  const scouted: Player[] = [];
  for (const p of s.players) {
    if (p.status === 'committed') {
      p.status = 'active';
      p.grade = 1;
      p.gradYear = s.year + 2;
      scouted.push(p);
    }
  }
  const pk = posPicker();
  const n = int(4, 6);
  for (let i = 0; i < n; i++) {
    s.players.push(
      makePlayer(s, {
        pos: pk(),
        status: 'active',
        grade: 1,
        target: gauss(24 + s.power * 2, 5),
        talent: clamp(gauss(0.9, 0.2), 0.6, 1.3),
        origin: '一般入部',
        gradYear: s.year + 2,
      }),
    );
  }
  return { scouted, walkOns: n };
}

export interface AdvanceResult {
  monthBefore: number;
  yearBefore: number;
  lines: string[];
  tour?: TourRecord;
  grad?: GradRecord;
  scouted: Player[];
  match?: Round;
  matchNumber?: number;
  matchTotal?: number;
  pending?: boolean;
}

function pushNews(s: GameState, line: string): void {
  s.news.unshift(line);
  if (s.news.length > 30) s.news.length = 30;
}

export function advanceMonth(s: GameState): AdvanceResult {
  ensureMatchSetup(s);
  const r: AdvanceResult = { monthBefore: s.month, yearBefore: s.year, lines: [], scouted: [] };

  // 大会中は1回の操作で必ず1試合だけ進める。最終試合後も月送りは別操作。
  if (s.pendingTour) {
    const played = playPendingMatch(s);
    r.match = played.match;
    r.matchNumber = played.matchNumber;
    r.matchTotal = played.matchTotal;
    r.tour = played.tour;
    r.pending = !!s.pendingTour;
    r.lines.push(`${played.match.label}：${played.match.my}-${played.match.their}（${played.match.win ? '勝利' : '敗戦'}）`);
    if (played.tour) {
      r.lines.push(`${played.tour.name}：${played.tour.result}`);
      pushNews(s, `${s.year}年目 ${played.tour.name}：${played.tour.result}`);
      if (played.tour.kind === 'pref') r.lines.push(s.qualified ? '花園への出場権を獲得した！' : '花園への出場はならなかった。');
    }
    return r;
  }

  // 大会が終了した月は、次の操作で月送りだけを行い、大会を再開しない。
  if (s.tourCompletedMonth !== s.month) {
    let kind: TourKind | null = null;
    if (s.month === 7) kind = 'summer';
    else if (s.month === 11) kind = 'pref';
    else if (s.month === 12 && s.qualified) kind = 'nat';
    else if (s.month === 2) kind = 'newbie';

    if (kind) {
      startTour(s, kind);
      const played = playPendingMatch(s);
      r.match = played.match;
      r.matchNumber = played.matchNumber;
      r.matchTotal = played.matchTotal;
      r.tour = played.tour;
      r.pending = !!s.pendingTour;
      r.lines.push(`${played.match.label}：${played.match.my}-${played.match.their}（${played.match.win ? '勝利' : '敗戦'}）`);
      if (played.tour) {
        r.lines.push(`${played.tour.name}：${played.tour.result}`);
        pushNews(s, `${s.year}年目 ${played.tour.name}：${played.tour.result}`);
        if (played.tour.kind === 'pref') r.lines.push(s.qualified ? '花園への出場権を獲得した！' : '花園への出場はならなかった。');
      }
      return r;
    }
    if (s.month === 12) r.lines.push('今年は全国大会に出場できなかった。');
  }

  growPlayers(s);
  s.scoutedThisMonth = false;
  s.tourCompletedMonth = undefined;

  if (s.month === 3) {
    r.grad = graduate(s);
    s.year++;
    s.month = 4;
    const e = enroll(s);
    r.scouted = e.scouted;
    r.lines.push(`${r.grad.list.length}名が卒業した。`);
    r.lines.push(`新入生${e.scouted.length + e.walkOns}名（スカウト${e.scouted.length}名・一般入部${e.walkOns}名）が入部した。`);
    pushNews(s, `${s.year}年目 新入生${e.scouted.length + e.walkOns}名が入部`);
  } else {
    s.month = s.month === 12 ? 1 : s.month + 1;
  }
  return r;
}
