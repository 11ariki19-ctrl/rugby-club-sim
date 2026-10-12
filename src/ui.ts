import { PREFS, schoolsOf } from './data';
import {
  POS_LABEL, STAT_KEYS, STAT_LABEL, MAX_COMMIT, SCOUT_MODES,
  newGame, advanceMonth, scout, overall, rankOf, shownStars, pickStarters, teamStrength,
  nextEvent, committedCount, acceptChance, SLOTS, TACTICS, ensureMatchSetup, setLineupSlot,
} from './game';
import type { GameState, Player, ScoutResult, AdvanceResult, Tactic } from './game';
import { saveGame, loadGame, clearGame, hasSave } from './store';

type Screen = 'title' | 'pref' | 'school' | 'home' | 'roster' | 'player' | 'scout' | 'dir' | 'records' | 'match';

let root: HTMLElement;
let st: GameState | null = null;
let screen: Screen = 'title';
let backTo: Screen = 'roster';
let selPref = 0;
let playerId = 0;
let modal: string | null = null;
let dirQ = '';
let dirF: 'all' | 'active' | 'grad' = 'all';
let recTab: 'tour' | 'grad' = 'tour';
let lastScout: ScoutResult[] = [];
let shown: Screen | null = null;

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ESC[c]);
const stars = (n: number): string => '★'.repeat(n) + '☆'.repeat(5 - n);
const badge = (o: number): string => `<span class="rk rk-${rankOf(o)}">${rankOf(o)}</span>`;

function nav(active: Screen): string {
  const items: [Screen, string, string][] = [
    ['home', '🏠', 'ホーム'],
    ['roster', '👥', '部員'],
    ['match', '🏉', '試合準備'],
    ['scout', '🔍', 'スカウト'],
    ['dir', '📖', '名鑑'],
    ['records', '🏆', '記録'],
  ];
  return `<nav class="nav">${items
    .map(([k, ic, lb]) => `<button class="${k === active ? 'on' : ''}" data-act="nav" data-v="${k}"><i>${ic}</i><span>${lb}</span></button>`)
    .join('')}</nav>`;
}

function shell(inner: string, active: Screen): string {
  return `<div class="app">${nav(active)}<main>${inner}</main></div>`;
}

function playerRow(p: Player): string {
  const o = overall(p);
  return `<button class="row" data-act="player" data-id="${p.id}">
    <span class="nm">${esc(p.name)}</span><span class="pos">${p.pos}</span>
    <span class="stars">${stars(shownStars(p))}</span>${badge(o)}<b class="ov">${o}</b></button>`;
}

/* ---------- 各画面 ---------- */

function titleScreen(): string {
  return `<div class="center"><div class="logo">🏉</div><h1>高校ラグビー部<br>監督物語</h1>
    <p class="sub">スカウトで選手を集め、3年で巣立つ部員を見届ける。<br>試合は自動で進む、育成シミュレーション。</p>
    <button class="btn primary big" data-act="new">はじめから</button>
    ${hasSave() ? '<button class="btn big" data-act="continue">続きから</button>' : ''}
    <p class="note">データはこのブラウザ内に自動で保存されます。</p></div>`;
}

function prefScreen(): string {
  const cells = PREFS.map(
    (p, i) => `<button class="pref" data-act="pickPref" data-v="${i}">${p.name}<span>${'★'.repeat(p.p)}${'☆'.repeat(5 - p.p)}</span></button>`,
  ).join('');
  return `<div class="page"><button class="link" data-act="toTitle">← タイトルへ</button><h2>どの都道府県で始める？</h2>
    <p class="note">★は県内の競争レベルです。多いほど大会の相手が強くなります。</p><div class="grid">${cells}</div></div>`;
}

function schoolScreen(): string {
  const cards = schoolsOf(selPref)
    .map(
      (s, i) => `<div class="card"><h3>${esc(s.name)}</h3><p>${s.desc}</p>
      <p class="small">戦力 ${'★'.repeat(s.power)}${'☆'.repeat(5 - s.power)}</p>
      <button class="btn primary" data-act="start" data-v="${i}">この高校で始める</button></div>`,
    )
    .join('');
  return `<div class="page"><button class="link" data-act="pref">← 都道府県を選びなおす</button>
    <h2>${PREFS[selPref].name}の高校</h2><p class="note">学校名は実在の学校ではなく、架空のものです。</p>${cards}</div>`;
}

function homeScreen(s: GameState): string {
  ensureMatchSetup(s);
  const ev = nextEvent(s.month);
  const when = ev.inMonths === 0 ? '今月' : `あと${ev.inMonths}か月`;
  const active = s.players.filter((p) => p.status === 'active').length;
  const natTitles = s.tours.filter((t) => t.kind === 'nat' && t.title).length;
  const prefTitles = s.tours.filter((t) => t.kind === 'pref' && t.title).length;
  const news = s.news.slice(0, 6).map((n) => `<li>${esc(n)}</li>`).join('');
  return shell(
    `<header class="hd"><div class="school">${esc(s.schoolName)}</div><div class="date">${s.year}年目 ${s.month}月</div></header>
    <section class="cards">
      <div class="card stat"><span class="k">チーム力</span><b>${teamStrength(s).toFixed(1)}</b></div>
      <div class="card stat"><span class="k">評判</span><b>${Math.round(s.reputation)}</b></div>
      <div class="card stat"><span class="k">部員</span><b>${active}名</b></div>
      <div class="card stat"><span class="k">入学内定</span><b>${committedCount(s)}名</b></div>
    </section>
    <div class="panel">次の大会：<b>${ev.label}</b>（${when}）<br><span class="small">県大会優勝 ${prefTitles}回 ／ 全国制覇 ${natTitles}回</span></div>
    <button class="btn primary big" data-act="advance">${s.pendingTour ? '次の試合へ（大会進行中）' : s.tourCompletedMonth === s.month ? '大会終了：次の月へ' : `${s.month}月を終えて、次の月へ`}</button>
    <button class="btn" data-act="nav" data-v="match">戦術・スタメンを変更</button>
    <button class="btn" data-act="nav" data-v="scout">${s.scoutedThisMonth ? '今月のスカウト：実施済み' : '今月のスカウトがまだです'}</button>
    <h3>最近のできごと</h3><ul class="news">${news}</ul>
    <div class="foot"><button class="link" data-act="toTitle">タイトルへ</button></div>`,
    'home',
  );
}

function rosterScreen(s: GameState): string {
  const starters = new Set(pickStarters(s.players).map((x) => x.player?.id));
  const part = (g: number): string => {
    const list = s.players.filter((p) => p.status === 'active' && p.grade === g).sort((a, b) => overall(b) - overall(a));
    return `<h3>${g}年生（${list.length}名）</h3>${list.map((p) => `<div class="wrap">${starters.has(p.id) ? '<i class="st">先発</i>' : ''}${playerRow(p)}</div>`).join('') || '<p class="note">いません</p>'}`;
  };
  const inc = s.players.filter((p) => p.status === 'committed').sort((a, b) => b.stars - a.stars);
  return shell(
    `<h2>部員一覧</h2>${part(3)}${part(2)}${part(1)}
    <h3>入学内定（${inc.length}名）</h3>${inc.map(playerRow).join('') || '<p class="note">まだいません。スカウトで探しましょう。</p>'}`,
    'roster',
  );
}

function matchScreen(s: GameState): string {
  ensureMatchSetup(s);
  const active = s.players.filter((p) => p.status === 'active').sort((a, b) => a.grade - b.grade || overall(b) - overall(a));
  const selected = s.lineup ?? [];
  const optsFor = (idx: number) => {
    const current = selected[idx];
    const used = new Set(selected.filter((id, i) => i !== idx));
    return active.filter((p) => !used.has(p.id) || p.id === current).map((p) =>
      `<option value="${p.id}" ${p.id === current ? 'selected' : ''}>${p.grade}年 ${esc(p.name)}（${p.pos}・${overall(p)}）</option>`
    ).join('');
  };
  const slots = SLOTS.map((pos, idx) => `<label class="bar"><span>${idx + 1}. ${pos}</span><select class="search" data-slot="${idx}">${optsFor(idx)}</select></label>`).join('');
  const tactics = TACTICS.map((t) => `<button class="btn mode ${(s.tactic ?? 'balanced') === t.id ? 'primary' : ''}" data-act="tactic" data-v="${t.id}"><b>${t.label}</b><span>${t.desc}</span></button>`).join('');
  return shell(`<h2>試合準備</h2>
    <p class="note">大会は1試合ずつ進みます。次の試合の前に戦術と先発15人を変更できます。先発は同じ選手を重複登録できません。</p>
    ${s.pendingTour ? `<div class="panel">大会進行中：<b>${s.pendingTour.name}</b><br>次は第${s.pendingTour.rounds.length + 1}試合目（全${s.pendingTour.totalRounds}試合の予定）</div>` : s.tourCompletedMonth === s.month ? '<div class="panel">今月の大会は終了しました。結果を確認して、次の月へ進めます。</div>' : '<div class="panel">次の大会に向けて準備しよう。</div>'}
    <h3>戦術</h3>${tactics}<h3>先発メンバー</h3>${slots}
    <button class="btn primary big" data-act="nav" data-v="home">設定完了</button>`, 'match');
}

function playerScreen(s: GameState): string {
  const p = s.players.find((x) => x.id === playerId);
  if (!p) return shell('<p>選手が見つかりません。</p>', 'roster');
  const o = overall(p);
  const status =
    p.status === 'committed' ? '入学内定（中学3年生）' : p.status === 'active' ? `${p.grade}年生（${p.gradYear}年目の終わりに卒業）` : `${p.gradYear}年目に卒業`;
  const bars = STAT_KEYS.map(
    (k) => `<div class="bar"><span>${STAT_LABEL[k]}</span><div class="track"><i style="width:${Math.round(p.stats[k])}%"></i></div><b>${Math.round(p.stats[k])}</b></div>`,
  ).join('');
  return shell(
    `<button class="link" data-act="back">← もどる</button>
    <div class="card"><h2>${esc(p.name)}</h2>
    <p>${POS_LABEL[p.pos]}（${p.pos}）／ ${status}</p>
    <p class="small">${esc(p.origin)}出身 ／ ${p.height}cm ${p.weight}kg</p>
    <p class="big2">${badge(o)} 総合 ${o}　<span class="stars">${stars(shownStars(p))}</span></p>${bars}
    <p class="small">最高到達 ${Math.round(p.peak)}</p>
    ${p.career ? `<p class="career">進路：${esc(p.career)}</p>` : ''}</div>`,
    backTo === 'dir' ? 'dir' : backTo === 'scout' ? 'scout' : 'roster',
  );
}

function scoutScreen(s: GameState): string {
  const full = committedCount(s) >= MAX_COMMIT;
  const modes = SCOUT_MODES.map(
    (m) => `<button class="btn mode" data-act="scoutDo" data-v="${m.id}" ${s.scoutedThisMonth || full ? 'disabled' : ''}>
      <b>${m.label}</b><span>${m.desc}（入部の見込み ${Math.round(acceptChance(s, m) * 100)}%）</span></button>`,
  ).join('');
  const res = lastScout
    .map(
      (r) => `<div class="card res ${r.accepted ? 'ok' : 'ng'}"><b>${esc(r.player.name)}</b> ${r.player.pos}　現在${badge(overall(r.player))}　素質<span class="stars">${stars(r.player.stars)}</span>
      <p>${r.accepted ? '入学を決めてくれた！' : '他校へ進むことになった。'}</p></div>`,
    )
    .join('');
  const log = s.scoutLog.map((l) => `<li>${l.year}年目${l.month}月 ${esc(l.name)}（${l.pos}）素質${stars(l.stars)} ${l.accepted ? '○内定' : '×辞退'}</li>`).join('');
  const inc = s.players.filter((p) => p.status === 'committed').sort((a, b) => b.stars - a.stars);
  return shell(
    `<h2>スカウト</h2>
    <p class="note">月に1回、中学3年生を2人探します。内定者は来年4月に入学し、3年後に卒業します。（内定 ${inc.length}/${MAX_COMMIT}名）</p>
    ${full ? '<p class="warn">内定の枠がいっぱいです。</p>' : ''}${s.scoutedThisMonth ? '<p class="note">今月のスカウトは終わりました。月を進めるとまた探せます。</p>' : ''}
    ${modes}${res}<h3>入学内定者</h3>${inc.map(playerRow).join('') || '<p class="note">まだいません。</p>'}
    <h3>スカウトの記録</h3><ul class="news">${log || '<li>まだ記録がありません</li>'}</ul>`,
    'scout',
  );
}

function dirRows(): string {
  if (!st) return '';
  const q = dirQ.trim();
  const list = st.players
    .filter((p) => p.status !== 'committed')
    .filter((p) => (dirF === 'all' ? true : dirF === 'active' ? p.status === 'active' : p.status === 'graduated'))
    .filter((p) => !q || p.name.includes(q) || p.origin.includes(q) || p.pos === q.toUpperCase())
    .sort((a, b) => b.peak - a.peak);
  return list.map(playerRow).join('') || '<p class="note">見つかりません。</p>';
}

function dirScreen(): string {
  const tab = (k: 'all' | 'active' | 'grad', l: string) => `<button class="tab ${dirF === k ? 'on' : ''}" data-act="dirF" data-v="${k}">${l}</button>`;
  return shell(
    `<h2>選手名鑑</h2><input id="q" class="search" type="search" placeholder="名前・出身中学・ポジション(SOなど)" value="${esc(dirQ)}">
    <div class="tabs">${tab('all', 'すべて')}${tab('active', '現役')}${tab('grad', '卒業生')}</div>
    <div id="dirlist">${dirRows()}</div>`,
    'dir',
  );
}

function recordsScreen(s: GameState): string {
  const tab = (k: 'tour' | 'grad', l: string) => `<button class="tab ${recTab === k ? 'on' : ''}" data-act="recTab" data-v="${k}">${l}</button>`;
  let body = '';
  if (recTab === 'tour') {
    body =
      [...s.tours]
        .reverse()
        .map(
          (t) => `<div class="card"><b>${t.year}年目 ${t.name}</b> <span class="res-t ${t.title ? 'gold' : ''}">${t.result}</span>
      <div class="small">${t.rounds.map((r) => `${r.label} ${r.win ? '○' : '×'} ${r.my}-${r.their}`).join(' ／ ')}</div></div>`,
        )
        .join('') || '<p class="note">まだ大会に出ていません。</p>';
  } else {
    body =
      [...s.grads]
        .reverse()
        .map(
          (g) => `<div class="card"><b>${g.year}年目の卒業生（${g.list.length}名）</b>
      <ul class="news">${g.list.map((x) => `<li>${esc(x.name)}（${x.pos}・${x.ov}）→ ${esc(x.career)}</li>`).join('')}</ul></div>`,
        )
        .join('') || '<p class="note">まだ卒業生はいません。最初の卒業は1年目の3月です。</p>';
  }
  return shell(`<h2>記録</h2><div class="tabs">${tab('tour', '大会結果')}${tab('grad', '卒業生の進路')}</div>${body}`, 'records');
}

function resultHtml(r: AdvanceResult): string {
  let h = `<h2>${r.yearBefore}年目 ${r.monthBefore}月の結果</h2>`;
  if (r.match) {
    h += `<p><b>${r.match.label}</b>：${esc(r.match.opp)}　<strong>${r.match.my}-${r.match.their}</strong>　${r.match.win ? '勝利！' : '敗戦'}</p>`;
    if (r.pending) h += `<p class="note">大会はまだ続きます。閉じて「試合準備」で戦術・スタメンを変更できます。</p>`;
  }
  if (r.tour) {
    h += `<p><b>${r.tour.name}</b>：<span class="res-t ${r.tour.title ? 'gold' : ''}">${r.tour.result}</span></p><table class="tbl">${r.tour.rounds
      .map((x) => `<tr><td>${x.label}</td><td>${esc(x.opp)}</td><td>${x.my}-${x.their}</td><td>${x.win ? '○' : '×'}</td></tr>`)
      .join('')}</table>`;
  }
  if (r.lines.length) h += `<ul class="news">${r.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`;
  if (r.grad && r.grad.list.length) {
    h += `<h3>卒業生の進路</h3><ul class="news">${r.grad.list.map((x) => `<li>${esc(x.name)}（${x.pos}・${x.ov}）→ ${esc(x.career)}</li>`).join('')}</ul>`;
  }
  if (!r.match && !r.tour && !r.lines.length) h += '<p class="note">特に大きなできごとはなかった。選手たちは練習を重ねている。</p>';
  return h;
}

/* ---------- 描画と操作 ---------- */

function render(): void {
  let body = '';
  const needState = screen !== 'title' && screen !== 'pref' && screen !== 'school';
  if (needState && !st) screen = 'title';
  switch (screen) {
    case 'title': body = titleScreen(); break;
    case 'pref': body = prefScreen(); break;
    case 'school': body = schoolScreen(); break;
    case 'home': body = homeScreen(st as GameState); break;
    case 'roster': body = rosterScreen(st as GameState); break;
    case 'player': body = playerScreen(st as GameState); break;
    case 'scout': body = scoutScreen(st as GameState); break;
    case 'dir': body = dirScreen(); break;
    case 'records': body = recordsScreen(st as GameState); break;
    case 'match': body = matchScreen(st as GameState); break;
  }
  const m = modal ? `<div class="modal"><div class="sheet">${modal}<button class="btn primary big" data-act="closeModal">閉じる</button></div></div>` : '';
  root.innerHTML = body + m;
  if (shown !== screen) {
    window.scrollTo(0, 0);
    shown = screen;
  }
}

function save(): void {
  if (st) saveGame(st);
}

function act(a: string, d: DOMStringMap): void {
  const v = d.v ?? '';
  switch (a) {
    case 'new': screen = 'pref'; break;
    case 'pref': screen = 'pref'; break;
    case 'continue': {
      const s = loadGame();
      if (s) { st = s; ensureMatchSetup(st); screen = 'home'; }
      break;
    }
    case 'pickPref': selPref = Number(v); screen = 'school'; break;
    case 'start':
      if (hasSave() && !confirm('保存されているデータは消えます。はじめからにしますか？')) break;
      st = newGame(selPref, Number(v));
      ensureMatchSetup(st);
      lastScout = [];
      save();
      screen = 'home';
      break;
    case 'nav': screen = v as Screen; break;
    case 'advance':
      if (st) { modal = resultHtml(advanceMonth(st)); lastScout = []; save(); }
      break;
    case 'tactic':
      if (st && TACTICS.some((t) => t.id === v)) { st.tactic = v as Tactic; save(); }
      break;
    case 'lineup':
      if (st) {
        const el = root.querySelector<HTMLSelectElement>(`select[data-slot="${d.slot}"]`);
        if (el && setLineupSlot(st, Number(d.slot), Number(el.value))) save();
      }
      break;
    case 'scoutDo':
      if (st) { const r = scout(st, v); if (r) { lastScout = r; save(); } }
      break;
    case 'player': backTo = screen; playerId = Number(d.id); screen = 'player'; break;
    case 'back': screen = backTo; break;
    case 'dirF': dirF = v as 'all' | 'active' | 'grad'; break;
    case 'recTab': recTab = v as 'tour' | 'grad'; break;
    case 'toTitle': screen = 'title'; break;
    case 'closeModal': modal = null; break;
    default: return;
  }
  render();
}

export function mount(el: HTMLElement): void {
  root = el;
  root.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (t) act(t.dataset.act ?? '', t.dataset);
  });
  root.addEventListener('change', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-slot]');
    if (t) act('lineup', t.dataset);
  });
  root.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.id === 'q') {
      dirQ = t.value;
      const list = document.getElementById('dirlist');
      if (list) list.innerHTML = dirRows();
    }
  });
  render();
}

// 保存データを消したいときのために公開（コンソール用）
(window as unknown as { clearRugbySave?: () => void }).clearRugbySave = clearGame;
