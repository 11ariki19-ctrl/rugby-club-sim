import {
  advanceCareerMonth, careerOverall, currentTeam, newCareer, setCareerTraining,
  CAREER_POSITIONS, CAREER_STAT_KEYS, CAREER_STAT_LABEL, hasCareerSave, loadCareer, saveCareer,
} from './career';
import type { CareerState, CareerPhase } from './career';
import { STAT_LABEL } from './game';
import type { Pos, StatKey } from './game';
import { PREFS, schoolsOf } from './data';

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
let root: HTMLElement | null = null;
let state: CareerState | null = null;
let creating = false;
let bound = false;
let createPrefIndex = 26;
let createSchoolIndex = 1;
const labels: Record<CareerPhase, string> = { highschool: '高校編', university: '大学編', professional: '社会人編', retired: '引退後' };
const monthLabel = (m: number) => `${m}月`;

function createScreen(): string {
  const schools = schoolsOf(createPrefIndex);
  return `<main class="page"><button class="link" data-career="title">← タイトルへ</button>
    <h2>ラグビー人生キャリア</h2>
    <p>高校入学から社会人引退まで、一人の選手を育てます。高校3年間、大学4年間、そして社会人リーグを同じ選手で進みます。</p>
    <div class="card"><label>選手名<input id="career-name" class="search" maxlength="24" placeholder="例：佐藤 蓮"></label>
    <label>ポジション<select id="career-pos" class="search">${CAREER_POSITIONS.map((p) => `<option value="${p.id}" ${p.id === 'CTB' ? 'selected' : ''}>${p.label}（${p.id}）</option>`).join('')}</select></label>
    <label>出身・所属都道府県<select id="career-pref" class="search">${PREFS.map((p, i) => `<option value="${i}" ${i === createPrefIndex ? 'selected' : ''}>${p.name}</option>`).join('')}</select></label>
    <label>高校（県予選に参加）<select id="career-school" class="search">${schools.map((s, i) => `<option value="${i}" ${i === createSchoolIndex ? 'selected' : ''}>${s.name}（戦力★${s.power}）</option>`).join('')}</select></label>
    <p class="note">高校は選択した都道府県の予選に参加します。高校大会の試合は1試合ずつ進み、活躍シーン・個人成績・評価を確認できます。</p>
    <button class="btn primary big" data-career="start">この選手でキャリア開始</button></div>
    <p class="note">監督モードのセーブデータとは別に保存されます。</p></main>`;
}
function seasonCard(s: CareerState): string {
  const r = s.currentSeason;
  return `<div class="card"><h3>今シーズンの成績</h3><p>${r.team} ／ ${r.year}年目</p>
    <div class="cards"><div class="card stat"><span class="k">公式リーグ戦</span><b>${r.leaguePlayed ?? 0}</b></div><div class="card stat"><span class="k">リーグ成績</span><b>${r.leagueWins ?? 0}-${r.leagueLosses ?? 0}-${r.leagueDraws ?? 0}</b></div>
    <div class="card stat"><span class="k">出場</span><b>${r.appearances}</b></div><div class="card stat"><span class="k">トライ</span><b>${r.tries}</b></div></div>
    ${r.notes.length ? `<ul class="news">${r.notes.slice().reverse().map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : '<p class="note">大会・リーグ戦の日程に合わせて試合を行います。</p>'}</div>`;
}
function phaseDescription(s: CareerState): string {
  if (s.phase === 'highschool') return `高校${s.stageYear}年生。${PREFS[s.prefIndex]?.name ?? ''}の県予選から進みます。大会での成績が優秀なら2月に高校日本代表候補へ選出され、世界大会に出場します。`;
  if (s.phase === 'university') return `大学${s.stageYear}年生。${s.universityGroup}に所属。9〜11月に公式リーグ戦7試合、11月〜1月に全国大学選手権（条件を満たした場合）を戦います。`;
  if (s.phase === 'professional') return `社会人${s.stageYear}年目・リーグワン ディビジョン${s.proDivision}。2025-26方式を参考に公式リーグ戦${s.proDivision === 1 ? 18 : s.proDivision === 2 ? 14 : 15}試合を戦い、現役引退予定年齢${s.retirementAge}歳までキャリアを重ねます。`;
  return s.finalSummary ?? '現役生活を終えました。';
}
function lastMatchCard(s: CareerState): string {
  const m = s.lastMatch;
  if (!m) return '<div class="card"><h3>直近の試合</h3><p class="note">試合を進めると、活躍シーン・個人成績・評価がここに表示されます。</p></div>';
  return `<div class="card"><h3>直近の試合レポート</h3><p><b>${esc(m.competition)}</b> ／ ${esc(m.date)}</p>
    <p>${esc(currentTeam(s))} vs ${esc(m.opponent)}<br><strong class="big2">${m.my} - ${m.their}</strong>　${m.result}</p>
    <p>${m.appeared ? `選手評価：<b>${m.rating.toFixed(1)} / 10</b>` : '選手評価：出場機会なし'} ／ 経験点 <b>+${m.experience}</b></p>
    <div class="cards"><div class="card stat"><span class="k">トライ</span><b>${m.tries}</b></div><div class="card stat"><span class="k">キャリー</span><b>${m.carries}</b></div>
    <div class="card stat"><span class="k">タックル</span><b>${m.tackles}</b></div><div class="card stat"><span class="k">ラインブレイク</span><b>${m.lineBreaks}</b></div>
    <div class="card stat"><span class="k">キック</span><b>${m.kicks}</b></div><div class="card stat"><span class="k">ミス</span><b>${m.errors}</b></div></div>
    <h4>活躍シーン</h4><ul class="news">${m.scenes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
}
function homeScreen(s: CareerState): string {
  const o = careerOverall(s);
  const bars = CAREER_STAT_KEYS.map((k) => `<div class="bar"><span>${STAT_LABEL[k]}</span><div class="track"><i style="width:${Math.round(s.player.stats[k])}%"></i></div><b>${Math.round(s.player.stats[k])}</b></div>`).join('');
  const training = CAREER_STAT_KEYS.map((k) => `<button class="btn mode ${s.training === k ? 'primary' : ''}" data-career="train" data-v="${k}"><b>${STAT_LABEL[k]}を鍛える</b><span>${s.training === k ? '現在選択中' : '今月の重点トレーニングに設定'}</span></button>`).join('');
  const history = s.history.slice(0, 8).map((h) => `<li>${esc(h)}</li>`).join('');
  const seasons = s.seasons.slice().reverse().slice(0, 12).map((r) => `<div class="card"><b>${r.age}歳・${esc(r.team)}</b><div class="small">${labels[r.phase]} ${r.year}年目：${r.wins}勝${r.losses}敗${r.draws}分 ／ 出場${r.appearances}試合・${r.tries}トライ</div></div>`).join('');
  const team = currentTeam(s);
  return `<main class="page"><header class="hd"><div class="school">🏉 ラグビー人生キャリア</div><div class="date">${s.age}歳・${monthLabel(s.month)} ／ ${labels[s.phase]} ${s.phase === 'retired' ? '' : s.stageYear + '年目'}</div></header>
    <div class="panel"><b>${esc(s.player.name)}</b> ／ ${s.player.pos} ／ 総合値 ${o}（${o >= 75 ? 'S' : o >= 65 ? 'A' : o >= 55 ? 'B' : o >= 45 ? 'C' : o >= 35 ? 'D' : 'E'}ランク）<br>
    <span class="small">${esc(team)} ・ ${s.player.height}cm / ${s.player.weight}kg</span><br><span>${phaseDescription(s)}</span></div>
    ${s.university ? `<div class="card"><b>進学先</b><p>${esc(s.university)}（${esc(s.universityTier)}）</p></div>` : ''}
    ${s.professionalTeam ? `<div class="card"><b>所属社会人チーム</b><p>${esc(s.professionalTeam)}（リーグワンD${s.proDivision}）</p></div>` : ''}
    ${s.nationalCandidate ? `<div class="card"><b>高校日本代表候補</b><p>選出済み ／ 世界大会勝利数：${s.worldTournamentWins}</p></div>` : ''}
    <div class="card"><h3>選手能力</h3>${bars}<p class="small">最高総合値：${Math.round(s.player.peak)} ／ 才能：${s.player.talent >= 1.25 ? '大器' : s.player.talent >= 0.95 ? '標準' : '努力型'}</p></div>
    ${lastMatchCard(s)}
    ${s.phase !== 'retired' ? `<h3>今月の育成方針</h3><p class="note">選んだ能力が最も伸びます。高校編は選択県の大会を1試合ずつ進行。大学編は公式リーグ戦7試合（9〜11月）と全国大学選手権（11月〜1月）、社会人編はディビジョン別の公式戦数で進行します。</p>${training}
    <button class="btn primary big" data-career="advance">${s.pendingTournament ? `次の試合へ（${s.pendingTournament.name} ${s.pendingTournament.rounds + 1}試合目）` : s.pendingFixtures?.length ? `次の試合へ（${s.pendingFixtures[0].label}）` : s.tournamentCompletedMonth === s.month ? `試合終了：${monthLabel(s.month)}を終えて次の月へ` : `${monthLabel(s.month)}を進める`}</button>` : `<div class="panel"><h3>現役引退</h3><p>${esc(s.finalSummary ?? '')}</p><p>通算リーグ出場：${s.seasons.reduce((n, r) => n + r.appearances, 0)}試合 ／ 通算トライ：${s.seasons.reduce((n, r) => n + r.tries, 0)}</p></div>`}
    ${seasonCard(s)}<h3>キャリア年表</h3><ul class="news">${history}</ul>
    <h3>シーズン記録</h3>${seasons || '<p class="note">シーズン終了後に記録が追加されます。</p>'}
    <button class="btn" data-career="title">タイトルへ戻る</button><p class="note">このモードのセーブは監督モードとは独立しています。</p></main>`;
}
function render(): void {
  if (!root) return;
  root.innerHTML = creating || !state ? createScreen() : homeScreen(state);
}
function act(action: string, value = ''): void {
  if (!root) return;
  if (action === 'title') { window.location.reload(); return; }
  if (action === 'start') {
    const name = root.querySelector<HTMLInputElement>('#career-name')?.value ?? '';
    const pos = (root.querySelector<HTMLSelectElement>('#career-pos')?.value ?? 'CTB') as Pos;
    if (hasCareerSave() && !confirm('保存済みの選手キャリアを上書きしますか？')) return;
    const school = schoolsOf(createPrefIndex)[createSchoolIndex] ?? schoolsOf(createPrefIndex)[1];
    state = newCareer(name, pos, createPrefIndex, school.name);
    creating = false;
  } else if (action === 'train' && state) {
    setCareerTraining(state, value as StatKey);
    saveCareer(state);
  } else if (action === 'advance' && state) {
    advanceCareerMonth(state);
  }
  render();
}
export function openCareerMode(el: HTMLElement, resume: boolean): void {
  root = el;
  state = resume ? loadCareer() : null;
  creating = !resume || !state;
  if (creating) { createPrefIndex = 26; createSchoolIndex = 1; }
  if (!bound) {
    root.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-career]');
      if (t) act(t.dataset.career ?? '', t.dataset.v ?? '');
    });
    root.addEventListener('change', (e) => {
      const t = e.target as HTMLSelectElement;
      if (t.id === 'career-pref') {
        const name = root?.querySelector<HTMLInputElement>('#career-name')?.value ?? '';
        const pos = root?.querySelector<HTMLSelectElement>('#career-pos')?.value ?? 'CTB';
        createPrefIndex = Number(t.value); createSchoolIndex = 1; render();
        const nameInput = root?.querySelector<HTMLInputElement>('#career-name'); if (nameInput) nameInput.value = name;
        const posInput = root?.querySelector<HTMLSelectElement>('#career-pos'); if (posInput) posInput.value = pos;
      } else if (t.id === 'career-school') createSchoolIndex = Number(t.value);
    });
    bound = true;
  }
  render();
}
