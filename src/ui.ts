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

/** 架空選手用のオリジナル似顔絵アバター。IDで配色が固定され、一覧でも識別しやすい。 */
function playerAvatar(p: Player, size = 76): string {
  const palettes = [['#7dbb56','#f2c7a5','#24352c'],['#4e91b8','#e5b38f','#30251f'],['#c76c58','#f0c9a8','#352a28'],['#b6a14c','#d8a77e','#1e252a'],['#7c78b8','#edc3a2','#392c2a']];
  const [jersey, skin, hair] = palettes[Math.abs(p.id * 7 + p.name.length) % palettes.length];
  const uid = `rugby-player-${p.id}-${size}`;
  return `<svg class="player-avatar" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="${esc(p.name)}の選手イラスト">
    <defs><linearGradient id="${uid}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#263d4a"/><stop offset="1" stop-color="#14222d"/></linearGradient></defs>
    <rect width="100" height="100" rx="24" fill="url(#${uid})"/>
    <circle cx="50" cy="39" r="22" fill="${skin}"/>
    <path d="M28 38 Q24 12 49 13 Q75 11 73 39 L67 31 Q54 26 44 30 L32 42Z" fill="${hair}"/>
    <path d="M21 100 Q21 64 42 61 L50 72 L59 61 Q80 65 81 100Z" fill="${jersey}"/>
    <path d="M43 63 L50 73 L57 63" fill="#f7f8f2"/>
    <circle cx="42" cy="41" r="2" fill="#27313a"/><circle cx="58" cy="41" r="2" fill="#27313a"/>
    <path d="M43 51 Q50 56 57 51" stroke="#8d5548" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M36 36 Q42 32 46 35 M54 35 Q60 32 64 36" stroke="${hair}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <text x="50" y="91" text-anchor="middle" font-size="10" font-weight="800" fill="#fff" opacity=".9">${p.pos}</text>
  </svg>`;
}

function playerRadar(p: Player): string {
  const vals = [p.stats.pow, p.stats.spd, p.stats.sta, p.stats.tec, p.stats.men];
  const labels = ['パワー','スピード','スタミナ','技術','精神'];
  const pts = vals.map((v,i) => {
    const a = -Math.PI/2 + i * Math.PI*2/5, r = 34 * Math.max(0,Math.min(100,v))/100;
    return `${50 + Math.cos(a)*r},${47 + Math.sin(a)*r}`;
  }).join(' ');
  const rings = [25,50,75,100].map(level => {
    const pts = labels.map((_,i) => { const a=-Math.PI/2+i*Math.PI*2/5,r=34*level/100;return `${50+Math.cos(a)*r},${47+Math.sin(a)*r}`;}).join(' ');
    return `<polygon points="${pts}" fill="none" stroke="#78909c" stroke-opacity=".35" stroke-width=".7"/>`;
  }).join('');
  const axes = labels.map((label,i) => {const a=-Math.PI/2+i*Math.PI*2/5;return `<line x1="50" y1="47" x2="${50+Math.cos(a)*34}" y2="${47+Math.sin(a)*34}" stroke="#78909c" stroke-opacity=".45"/><text x="${50+Math.cos(a)*43}" y="${47+Math.sin(a)*43}" text-anchor="middle" dominant-baseline="middle" font-size="6.5" fill="currentColor">${label}</text>`;}).join('');
  return `<svg class="radar-chart" viewBox="0 0 100 100" role="img" aria-label="能力レーダーチャート">${rings}${axes}<polygon points="${pts}" fill="#8bd83f" fill-opacity=".28" stroke="#8bd83f" stroke-width="1.8"/>${vals.map((v,i)=>{const a=-Math.PI/2+i*Math.PI*2/5,r=34*Math.max(0,Math.min(100,v))/100;return `<circle cx="${50+Math.cos(a)*r}" cy="${47+Math.sin(a)*r}" r="1.8" fill="#c5f48e"/>`;}).join('')}</svg>`;
}

function uniformCard(school: string): string {
  const colors = ['#8bd83f','#58a6d4','#d85b54','#d4b84d','#a7b4c0'];
  const color = colors[Math.abs(school.split('').reduce((n,c)=>n+c.charCodeAt(0),0)) % colors.length];
  return `<div class="uniform-preview"><span class="uniform-caption">HOME KIT</span><svg viewBox="0 0 120 110" role="img" aria-label="チームのホームユニフォーム"><path d="M35 14 L48 8 Q60 18 72 8 L85 14 L108 34 L94 49 L82 40 L82 96 L38 96 L38 40 L26 49 L12 34Z" fill="${color}" stroke="#e9f1f5" stroke-width="2"/><path d="M48 9 Q60 24 72 9" fill="none" stroke="#e9f1f5" stroke-width="4"/><path d="M39 54 H81 M39 67 H81 M39 80 H81" stroke="#fff" stroke-opacity=".42" stroke-width="3"/><text x="60" y="48" text-anchor="middle" font-size="19" font-weight="900" fill="#fff">15</text></svg><b>${esc(school)}</b><span>HOME / FIRST XV</span></div>`;
}


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
  return `<button class="row roster-player" data-act="player" data-id="${p.id}">
    ${playerAvatar(p,48)}<span class="nm">${esc(p.name)}<small>${p.grade ? p.grade+'年生' : '卒業生'} ・ ${POS_LABEL[p.pos]}</small></span><span class="pos">${p.pos}</span>
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
    `<header class="hd"><div class="school">${esc(s.schoolName)}</div><nav style="display:flex;gap:8px;flex-wrap:wrap"><a href="./soccer/" style="color:#d9ffe5;border:1px solid #4c8766;border-radius:9px;padding:7px 10px;text-decoration:none">⚽ サッカー版</a><a href="./baseball/" style="color:#e0ecff;border:1px solid #5a76a8;border-radius:9px;padding:7px 10px;text-decoration:none">⚾ 野球版</a></nav><div class="date">${s.year}年目 ${s.month}月</div></header>
    <section class="club-hero"><div><span class="profile-kicker">SEASON ${s.year} · MONTH ${s.month}</span><h2>クラブ・ダッシュボード</h2><p>${esc(s.schoolName)} ／ 高校ラグビー部</p></div>${uniformCard(s.schoolName)}</section>
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
    <div class="player-profile card">
    <div class="profile-hero">${playerAvatar(p,112)}<div><span class="profile-kicker">PLAYER PROFILE</span><h2>${esc(p.name)}</h2><p>${POS_LABEL[p.pos]}（${p.pos}）／ ${status}</p><p class="small">${esc(p.origin)}出身<br>${p.height}cm ・ ${p.weight}kg</p><p class="big2">${badge(o)} 総合 ${o}</p><span class="stars">${stars(shownStars(p))}</span></div></div>
    <div class="profile-kit">${uniformCard(st?.schoolName ?? 'RUGBY CLUB')}<div class="radar-wrap"><h3>能力バランス</h3>${playerRadar(p)}</div></div>
    <h3>能力詳細</h3>${bars}<p class="small">最高到達 ${Math.round(p.peak)}</p>
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
        .map((t) => {
          const steps = t.rounds.map((r, i) => `<div class="bracket-round"><span class="bracket-label">${esc(r.label || ('第'+(i+1)+'試合'))}</span><div class="bracket-team ${r.win?'won':'lost'}"><span>${esc(s.schoolName)}</span><b>${r.my}</b></div><div class="bracket-team opponent"><span>${esc(r.opp)}</span><b>${r.their}</b></div><span class="bracket-result">${r.win?'WIN':'LOSE'}</span></div>`).join('');
          return `<div class="card tournament-card"><div class="tournament-heading"><div><span class="profile-kicker">TOURNAMENT / ${t.year}年目</span><h3>${esc(t.name)}</h3></div><span class="res-t ${t.title?'gold':''}">${esc(t.result)}</span></div><div class="bracket-scroll"><div class="tournament-bracket">${steps || '<p class="note">試合記録はありません。</p>'}</div></div>${t.title?'<div class="champion-banner">🏆 CHAMPIONS — 大会制覇</div>':''}</div>`;
        })
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
    h += `<section class="match-result-animation ${r.match.win?'victory':'defeat'}"><span class="profile-kicker">FULL TIME</span><b>${esc(r.match.label)}</b><div class="result-score"><span>${esc(st?.schoolName ?? '自チーム')}</span><strong>${r.match.my} <i>—</i> ${r.match.their}</strong><span>${esc(r.match.opp)}</span></div><div class="result-verdict">${r.match.win ? '🏆 WIN — 勝利！' : 'NEXT TIME — 敗戦'}</div></section>`;
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
