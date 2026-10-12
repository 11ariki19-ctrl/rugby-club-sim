import {
  advanceCareerMonth, careerOverall, currentTeam, newCareer, setCareerTraining, setCareerTrainingPlan,
  resolveCareerTransfer, careerHallOfFame, careerLegacyScore,
  CAREER_POSITIONS, CAREER_STAT_KEYS, CAREER_STAT_LABEL, CAREER_TALENTS, hasCareerSave, loadCareer, saveCareer,
} from './career';
import type { CareerState, CareerPhase, CareerTrainingPlan } from './career';
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
let createTalentType: '凡人' | '秀才' | '天才' | '一芸' = '凡人';
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
    <label>成長の才能<select id="career-talent" class="search">${CAREER_TALENTS.map((x) => `<option value="${x.id}" ${x.id === createTalentType ? 'selected' : ''}>${x.label} — ${x.description}</option>`).join('')}</select></label>
    <p class="note">凡人は現行のランダム能力。秀才は全能力+10、天才は全能力+15。一芸は1能力が最低能力の3倍（最低能力15〜20）です。</p>
    <p class="note">高校は選択した都道府県の予選に参加します。高校大会の試合は1試合ずつ進み、活躍シーン・個人成績・評価を確認できます。</p>
    <button class="btn primary big" data-career="start">この選手でキャリア開始</button></div>
    <p class="note">監督モードのセーブデータとは別に保存されます。</p></main>`;
}
function seasonCard(s: CareerState): string {
  const r = s.currentSeason;
  return `<div class="card"><h3>今シーズンの成績</h3><p>${r.team} ／ ${r.year}年目</p>
    <div class="cards"><div class="card stat"><span class="k">公式リーグ戦</span><b>${r.leaguePlayed ?? 0}</b></div><div class="card stat"><span class="k">リーグ成績</span><b>${r.leagueWins ?? 0}-${r.leagueLosses ?? 0}-${r.leagueDraws ?? 0}</b></div>
    <div class="card stat"><span class="k">出場</span><b>${r.appearances}</b></div><div class="card stat"><span class="k">トライ</span><b>${r.tries}</b></div><div class="card stat"><span class="k">先発</span><b>${r.starts ?? 0}</b></div><div class="card stat"><span class="k">途中出場</span><b>${r.substituteApps ?? 0}</b></div><div class="card stat"><span class="k">控え/メンバー外</span><b>${(r.bench ?? 0) + (r.notSelected ?? 0)}</b></div></div>
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
    <p>起用：<b>${esc(m.role ?? (m.appeared ? '先発' : 'メンバー外'))}</b> ／ ${m.appeared ? `選手評価：<b>${m.rating.toFixed(1)} / 10</b>` : '選手評価：出場機会なし'} ／ 経験点 <b>+${m.experience}</b></p>
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
  const seasons = s.seasons.slice().reverse().slice(0, 12).map((r) => `<div class="card"><b>${r.age}歳・${esc(r.team)}</b><div class="small">${labels[r.phase]} ${r.year}年目：${r.wins}勝${r.losses}敗${r.draws}分 ／ 出場${r.appearances}試合・${r.tries}トライ</div><div class="small">先発${r.starts ?? 0}・途中出場${r.substituteApps ?? 0}・控え${r.bench ?? 0}・メンバー外${r.notSelected ?? 0}</div>${r.awards?.length ? `<div class="small">表彰：${r.awards.map(esc).join('、')}</div>` : ''}</div>`).join('');
  const team = currentTeam(s);
  const plans: CareerTrainingPlan[] = ['バランス','筋力','技術','持久力','回復'];
  const planButtons = plans.map((p) => `<button class="btn mode ${s.trainingPlan === p ? 'primary' : ''}" data-career="plan" data-v="${p}"><b>${p}</b><span>${s.trainingPlan === p ? '選択中' : ({'バランス':'成長と回復の両立','筋力':'筋力を伸ばすが疲労が増えやすい','技術':'技術系能力を重点育成','持久力':'スタミナと疲労耐性','回復':'疲労軽減・負傷回復を優先'} as Record<CareerTrainingPlan,string>)[p]}</span></button>`).join('');
  const rivals = s.rivals.filter((r) => !r.retired).slice().sort((a,b) => b.overall-a.overall).slice(0,5).map((r) => `<li>${esc(r.name)}（${r.pos}・総合値${Math.round(r.overall)}）／${esc(r.team)} ${r.pos === s.player.pos ? '・同ポジションのライバル' : ''}</li>`).join('');
  const hall = careerHallOfFame().slice(0,5).map((r,i) => `<li>${i+1}位 ${esc(r.name)}：スコア${r.score}／出場${r.appearances}・${r.tries}トライ</li>`).join('');
  return `<main class="page"><header class="hd"><div class="school">🏉 ラグビー人生キャリア</div><div class="date">${s.age}歳・${monthLabel(s.month)} ／ ${labels[s.phase]} ${s.phase === 'retired' ? '' : s.stageYear + '年目'}</div></header>
    <div class="panel"><b>${esc(s.player.name)}</b> ／ ${s.player.pos} ／ 総合値 ${o}（${o >= 75 ? 'S' : o >= 65 ? 'A' : o >= 55 ? 'B' : o >= 45 ? 'C' : o >= 35 ? 'D' : 'E'}ランク）<br>
    <span class="small">${esc(team)} ・ ${s.player.height}cm / ${s.player.weight}kg</span><br><span>${phaseDescription(s)}</span></div>
    ${s.university ? `<div class="card"><b>進学先</b><p>${esc(s.university)}（${esc(s.universityTier)}）</p></div>` : ''}
    ${s.professionalTeam ? `<div class="card"><b>所属社会人チーム</b><p>${esc(s.professionalTeam)}（リーグワンD${s.proDivision}）</p></div>` : ''}
    ${s.nationalCandidate ? `<div class="card"><b>高校日本代表候補</b><p>選出済み ／ 世界大会勝利数：${s.worldTournamentWins}</p></div>` : ''}
    <div class="card"><b>コンディション</b><p>疲労：${Math.round(s.fatigue)} / 100　／　士気：${Math.round(s.morale)} / 100</p><div class="bar"><span>疲労</span><div class="track"><i style="width:${Math.round(s.fatigue)}%"></i></div><b>${Math.round(s.fatigue)}%</b></div>${s.injuryMonths > 0 ? `<p class="note">負傷中：${esc(s.injurySeverity ?? '負傷')}・復帰まで約${s.injuryMonths}か月。療養中は試合に出場できません。</p>` : '<p class="small">現在は負傷なし。連戦や疲労蓄積で負傷リスクが上がります。</p>'}</div>
    ${s.japanNationalTeamSelected ? `<div class="card"><b>日本代表</b><p>選出中 ／ 国際試合 ${s.japanNationalTeamCaps}キャップ・${s.japanNationalTeamWins}勝</p><p class="small">代表選考はクラブ成績・能力・コンディションで変動し、落選後の再招集もあります。</p></div>` : `<div class="card"><b>日本代表</b><p>現在は未選出 ／ 通算 ${s.japanNationalTeamCaps}キャップ・${s.japanNationalTeamWins}勝</p></div>`}
    <div class="card"><h3>選手能力</h3>${bars}<p class="small">最高総合値：${Math.round(s.player.peak)} ／ 成長タイプ：${s.player.talentType}（成長係数 ${s.player.talent.toFixed(2)}）</p></div>
    ${lastMatchCard(s)}
    ${s.pendingTransfer ? `<div class="card"><h3>契約・移籍オファー</h3><p>シーズン終了。契約を選べます。選ばずに進行すると現所属で更新します。</p>${s.pendingTransfer.offers.map((o,i)=>`<button class="btn mode" data-career="transfer" data-v="${i}"><b>${esc(o.team)}（${o.overseas ? '海外' : `国内D${o.division}`}）</b><span>年俸目安 ${o.salary}万円／契約 ${o.team === s.professionalTeam ? Math.max(1,s.proContractYears) : '2〜3'}年</span></button>`).join('')}</div>` : ''}
    ${s.phase !== 'retired' ? `<h3>今月の育成方針</h3><p class="note">能力別トレーニングに加えて育成プランを選択。年齢によって成長が緩やかになり、ベテラン期は能力低下も起こります。</p>${training}<h4>育成プラン</h4>${planButtons}
    <button class="btn primary big" data-career="advance">${s.pendingTransfer ? '契約を更新して進む' : s.pendingTournament ? `次の試合へ（${s.pendingTournament.name} ${s.pendingTournament.rounds + 1}試合目）` : s.pendingFixtures?.length ? `次の試合へ（${s.pendingFixtures[0].label}）` : s.tournamentCompletedMonth === s.month ? `試合終了：${monthLabel(s.month)}を終えて次の月へ` : `${monthLabel(s.month)}を進める`}</button>` : `<div class="panel"><h3>現役引退</h3><p>${esc(s.finalSummary ?? '')}</p><p>通算リーグ出場：${s.seasons.reduce((n, r) => n + r.appearances, 0)}試合 ／ 通算トライ：${s.seasons.reduce((n, r) => n + r.tries, 0)}</p></div>`}
    ${seasonCard(s)}<div class="card"><h3>契約・キャリア実績</h3><p>契約残り：${s.proContractYears}年 ／ 年俸：${s.proSalary ? `${s.proSalary}万円` : '未設定'} ／ レガシースコア：${s.legacyScore ?? careerLegacyScore(s)}</p>${s.transferHistory.length ? `<ul class="news">${s.transferHistory.slice(0,5).map(esc).map(x=>`<li>${x}</li>`).join('')}</ul>` : '<p class="small">プロ入り後、シーズン終了時に契約更新・国内移籍・海外挑戦の選択肢が提示されます。</p>'}</div>
    <div class="card"><h3>ライバル・ポジション争い</h3><p class="small">ライバルは年齢に応じて成長・衰退し、同ポジションで能力が上の選手がいると起用確率が下がります。</p><ul class="news">${rivals || '<li>現役ライバルはいません。</li>'}</ul></div>
    <div class="card"><h3>通算記録・殿堂ランキング</h3><p>通算出場：${s.seasons.reduce((n,r)=>n+r.appearances,0)+s.currentSeason.appearances}試合 ／ トライ：${s.seasons.reduce((n,r)=>n+r.tries,0)+s.currentSeason.tries} ／ 代表：${s.japanNationalTeamCaps}キャップ ／ 表彰：${s.awards.length}件</p><p>現在のレガシースコア：${careerLegacyScore(s)}</p><ul class="news">${hall || '<li>殿堂入り記録は選手が引退すると登録されます。</li>'}</ul></div>
    <h3>キャリア年表</h3><ul class="news">${history}</ul>
    <h3>シーズン記録・年鑑</h3>${seasons || '<p class="note">シーズン終了後に記録が追加されます。</p>'}
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
    createTalentType = (root.querySelector<HTMLSelectElement>('#career-talent')?.value ?? '凡人') as '凡人' | '秀才' | '天才' | '一芸';
    state = newCareer(name, pos, createPrefIndex, school.name, createTalentType);
    creating = false;
  } else if (action === 'train' && state) {
    setCareerTraining(state, value as StatKey);
    saveCareer(state);
  } else if (action === 'plan' && state) {
    setCareerTrainingPlan(state, value as CareerTrainingPlan);
    saveCareer(state);
  } else if (action === 'transfer' && state) {
    resolveCareerTransfer(state, Number(value));
  } else if (action === 'advance' && state) {
    advanceCareerMonth(state);
  }
  render();
}
export function openCareerMode(el: HTMLElement, resume: boolean): void {
  root = el;
  state = resume ? loadCareer() : null;
  creating = !resume || !state;
  if (creating) { createPrefIndex = 26; createSchoolIndex = 1; createTalentType = '凡人'; }
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
      else if (t.id === 'career-talent') createTalentType = t.value as '凡人' | '秀才' | '天才' | '一芸';
    });
    bound = true;
  }
  render();
}
