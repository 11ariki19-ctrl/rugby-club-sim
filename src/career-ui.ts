import {
  advanceCareerMonth, careerOverall, currentTeam, newCareer, setCareerTraining,
  CAREER_POSITIONS, CAREER_STAT_KEYS, CAREER_STAT_LABEL, hasCareerSave, loadCareer, saveCareer,
} from './career';
import type { CareerState, CareerPhase } from './career';
import { STAT_LABEL } from './game';
import type { Pos, StatKey } from './game';

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
let root: HTMLElement | null = null;
let state: CareerState | null = null;
let creating = false;
let bound = false;
const labels: Record<CareerPhase, string> = { highschool: '高校編', university: '大学編', professional: '社会人編', retired: '引退後' };
const monthLabel = (m: number) => `${m}月`;

function createScreen(): string {
  return `<main class="page"><button class="link" data-career="title">← タイトルへ</button>
    <h2>ラグビー人生キャリア</h2>
    <p>高校入学から社会人引退まで、一人の選手を育てます。高校3年間、大学4年間、そして社会人リーグを同じ選手で進みます。</p>
    <div class="card"><label>選手名<input id="career-name" class="search" maxlength="24" placeholder="例：佐藤 蓮"></label>
    <label>ポジション<select id="career-pos" class="search">${CAREER_POSITIONS.map((p) => `<option value="${p.id}" ${p.id === 'CTB' ? 'selected' : ''}>${p.label}（${p.id}）</option>`).join('')}</select></label>
    <p class="note">初期能力と才能は選手ごとにランダム。進学先の大学は高校卒業時の総合値と大学ランクに応じて自動決定されます。</p>
    <button class="btn primary big" data-career="start">この選手でキャリア開始</button></div>
    <p class="note">監督モードのセーブデータとは別に保存されます。</p></main>`;
}
function seasonCard(s: CareerState): string {
  const r = s.currentSeason;
  return `<div class="card"><h3>今シーズンの成績</h3><p>${r.team} ／ ${r.year}年目</p>
    <div class="cards"><div class="card stat"><span class="k">リーグ戦</span><b>${r.played}</b></div><div class="card stat"><span class="k">チーム成績</span><b>${r.wins}-${r.losses}-${r.draws}</b></div>
    <div class="card stat"><span class="k">出場</span><b>${r.appearances}</b></div><div class="card stat"><span class="k">トライ</span><b>${r.tries}</b></div></div>
    ${r.notes.length ? `<ul class="news">${r.notes.slice().reverse().map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : '<p class="note">7月・11月・2月にリーグ戦が行われます。</p>'}</div>`;
}
function phaseDescription(s: CareerState): string {
  if (s.phase === 'highschool') return `高校${s.stageYear}年生。監督モードと同じ大会カレンダーで試合を進め、3月の年度終了後に総合値に応じた大学へ進学します。`;
  if (s.phase === 'university') return `大学${s.stageYear}年生。4年間のリーグ戦で活躍し、卒業後の社会人チーム入りを目指します。`;
  if (s.phase === 'professional') return `社会人${s.stageYear}年目。現役引退予定年齢は${s.retirementAge}歳。年齢と能力のピークを意識してキャリアを重ねます。`;
  return s.finalSummary ?? '現役生活を終えました。';
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
    ${s.professionalTeam ? `<div class="card"><b>所属社会人チーム</b><p>${esc(s.professionalTeam)}</p></div>` : ''}
    <div class="card"><h3>選手能力</h3>${bars}<p class="small">最高総合値：${Math.round(s.player.peak)} ／ 才能：${s.player.talent >= 1.25 ? '大器' : s.player.talent >= 0.95 ? '標準' : '努力型'}</p></div>
    ${s.phase !== 'retired' ? `<h3>今月の育成方針</h3><p class="note">選んだ能力が最も伸びます。高校編は監督モードと同じ大会日程、大学編は9〜12月リーグ戦・1〜2月トーナメント。試合は1試合ずつ進み、試合結果に応じて経験点を獲得します。</p>${training}
    <button class="btn primary big" data-career="advance">1か月進める（${monthLabel(s.month)}）</button>` : `<div class="panel"><h3>現役引退</h3><p>${esc(s.finalSummary ?? '')}</p><p>通算リーグ出場：${s.seasons.reduce((n, r) => n + r.appearances, 0)}試合 ／ 通算トライ：${s.seasons.reduce((n, r) => n + r.tries, 0)}</p></div>`}
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
    state = newCareer(name, pos);
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
  if (!bound) {
    root.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-career]');
      if (t) act(t.dataset.career ?? '', t.dataset.v ?? '');
    });
    bound = true;
  }
  render();
}
