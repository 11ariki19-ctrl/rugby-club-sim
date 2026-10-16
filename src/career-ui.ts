import { careerTeamStrengthProfile } from './career';
import {
  advanceCareerMonth, careerOverall, currentTeam, newCareer, setCareerTraining, setCareerTrainingPlan,
  resolveCareerTransfer, careerHallOfFame, careerLegacyScore, UNIVERSITY_GROUPS, selectCareerUniversity,
  CAREER_POSITIONS, CAREER_STAT_KEYS, CAREER_STAT_LABEL, CAREER_TALENTS, hasCareerSave, loadCareer, saveCareer, setCareerSaveSlot, careerSaveSummary,
} from './career';
import type { CareerState, CareerPhase, CareerTrainingPlan } from './career';
import { STAT_LABEL } from './game';
import type { Pos, StatKey } from './game';
import { PREFS, schoolsOf } from './data';
import { generateUniquePlayerName, inferPlayerCountry } from './names';

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
let root: HTMLElement | null = null;
let state: CareerState | null = null;
let creating = false;
let titleMenu = true;
let selectedSaveSlot: 1 | 2 = 1;
let bound = false;
let createPrefIndex = 26;
let createSchoolIndex = 1;
let createTalentType: '凡人' | '秀才' | '天才' | '一芸' = '凡人';
const labels: Record<CareerPhase, string> = { highschool: '高校編', university: '大学編', professional: '社会人編', retired: '引退後' };

const monthLabel = (m: number) => `${m}月`;

function careerPortrait(name: string, pos: Pos): string {
  const colors = ['#8bd83f','#58a6d4','#d85b54','#d4b84d','#a7b4c0'];
  const seed = [...name].reduce((n,c)=>n+c.charCodeAt(0),0);
  const jersey = colors[seed % colors.length];
  const hair = ['#24352c','#30251f','#352a28','#1e252a'][seed % 4];
  return `<svg class="player-avatar career-avatar" viewBox="0 0 100 100" role="img" aria-label="${esc(name)}の選手イラスト"><rect width="100" height="100" rx="24" fill="#182832"/><circle cx="50" cy="39" r="22" fill="#e7bd9b"/><path d="M28 38Q24 12 49 13Q75 11 73 39L67 31Q54 26 44 30L32 42Z" fill="${hair}"/><path d="M21 100Q21 64 42 61L50 72L59 61Q80 65 81 100Z" fill="${jersey}"/><path d="M43 63L50 73L57 63" fill="none" stroke="#fff" stroke-width="4"/><circle cx="42" cy="41" r="2" fill="#27313a"/><circle cx="58" cy="41" r="2" fill="#27313a"/><path d="M43 51Q50 56 57 51" stroke="#8d5548" stroke-width="2" fill="none"/><text x="50" y="91" text-anchor="middle" font-size="10" font-weight="800" fill="#fff">${pos}</text></svg>`;
}

function careerRadar(stats: Record<string, number>): string {
  const keys: StatKey[] = ['pow','spd','sta','tec','men'];
  const names = ['パワー','スピード','スタミナ','技術','精神'];
  const points = keys.map((k,i)=>{const a=-Math.PI/2+i*Math.PI*2/5,r=34*Math.max(0,Math.min(200,stats[k]??0))/200;return `${50+Math.cos(a)*r},${47+Math.sin(a)*r}`;}).join(' ');
  const grid=[25,50,75,100].map(n=>`<polygon points="${keys.map((_,i)=>{const a=-Math.PI/2+i*Math.PI*2/5,r=34*n/100;return `${50+Math.cos(a)*r},${47+Math.sin(a)*r}`;}).join(' ')}" fill="none" stroke="#78909c" stroke-opacity=".35"/>`).join('');
  const axes=names.map((n,i)=>{const a=-Math.PI/2+i*Math.PI*2/5;return `<line x1="50" y1="47" x2="${50+Math.cos(a)*34}" y2="${47+Math.sin(a)*34}" stroke="#78909c" stroke-opacity=".45"/><text x="${50+Math.cos(a)*43}" y="${47+Math.sin(a)*43}" text-anchor="middle" dominant-baseline="middle" font-size="6.5" fill="currentColor">${n}</text>`;}).join('');
  return `<svg class="radar-chart" viewBox="0 0 100 100" role="img" aria-label="能力レーダーチャート">${grid}${axes}<polygon points="${points}" fill="#8bd83f" fill-opacity=".28" stroke="#8bd83f" stroke-width="1.8"/></svg>`;
}

function careerUniform(team: string): string {
  const colors=['#8bd83f','#58a6d4','#d85b54','#d4b84d','#a7b4c0'];
  const seed=[...team].reduce((n,c)=>n+c.charCodeAt(0),0), color=colors[seed%colors.length];
  return `<div class="uniform-preview"><span class="uniform-caption">HOME KIT</span><svg viewBox="0 0 120 110" role="img" aria-label="所属チームのユニフォーム"><path d="M35 14L48 8Q60 18 72 8L85 14L108 34L94 49L82 40L82 96L38 96L38 40L26 49L12 34Z" fill="${color}" stroke="#e9f1f5" stroke-width="2"/><path d="M48 9Q60 24 72 9" fill="none" stroke="#fff" stroke-width="4"/><path d="M39 54H81M39 67H81M39 80H81" stroke="#fff" stroke-opacity=".42" stroke-width="3"/><text x="60" y="48" text-anchor="middle" font-size="19" font-weight="900" fill="#fff">15</text></svg><b>${esc(team)}</b><span>PLAYER KIT</span></div>`;
}


function titleScreen(): string {
  const slots = ([1, 2] as const).map((slot) => {
    const s = careerSaveSummary(slot);
    return `<section class="card"><h3>セーブスロット ${slot}</h3>${s.exists
      ? `<p><b>${esc(s.name ?? '選手')}</b> ／ ${s.age}歳 ／ ${esc(s.team ?? '')}</p><p>ポジション ${s.pos}・総合値 ${s.overall}・シーズン ${s.years}</p><button class="btn primary" data-career="continue-slot" data-v="${slot}">このデータを続ける</button><button class="btn" data-career="new-slot" data-v="${slot}">この枠で新規開始（上書き）</button>`
      : `<p>データはありません。</p><button class="btn primary" data-career="new-slot" data-v="${slot}">この枠で新規開始</button>`}</section>`;
  }).join('');
  const hall = careerHallOfFame().slice(0, 10).map((p, i) => `<li>${i + 1}位 ${esc(p.name)} — ${p.score}点／${p.appearances}試合・${p.tries}トライ</li>`).join('');
  return `<main class="page career-pennant-shell"><div class="career-pennant-ribbon"><span>RUGBY PENNANT</span><span>PLAYER CAREER</span></div><header class="hd"><div class="school">🏉 ラグビー人生キャリア</div><div class="date">高校入学から引退まで、一人の選手の物語</div></header><div class="card"><h2>キャリアを選ぶ</h2><p>新しい選手を作るか、2つの独立したセーブデータから再開できます。</p>${slots}</div><div class="card"><h3>歴代選手殿堂</h3><ol class="news">${hall || '<li>引退した選手がここに登録されます。</li>'}</ol></div><p class="note">データはこの端末・ブラウザ内に保存されます。ブラウザのデータ消去や端末変更で失われる場合があります。</p></main>`;
}
function createScreen(): string {
  const schools = schoolsOf(createPrefIndex);
  return `<main class="page career-pennant-shell career-create-screen"><div class="career-pennant-ribbon"><span>RUGBY PENNANT</span><span>PLAYER DEVELOPMENT</span></div><button class="link" data-career="title">← タイトルへ</button>
    <h2>ラグビー人生キャリア</h2>
    <p>高校入学から社会人引退まで、一人の選手を育てます。高校3年間、大学4年間、そして社会人リーグを同じ選手で進みます。</p>
    <div class="card"><label>選手名<input id="career-name" class="search" maxlength="24" placeholder="例：佐藤 蓮"></label><button type="button" class="btn" data-career="random-name">名前をランダム生成</button>
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
  if (s.worldCup && !s.worldCup.completed) return `日本代表としてラグビーワールドカップ${s.worldCup.year}に出場中。プール${s.worldCup.pool}：${s.worldCup.poolPlayed}/4試合、${s.worldCup.poolWins}勝。${s.worldCup.qualified ? '決勝トーナメント進出！' : 'プール戦の結果で決勝トーナメント進出を目指します。'}`;
  if (s.phase === 'highschool') return `高校${s.stageYear}年生。${PREFS[s.prefIndex]?.name ?? ''}の県予選から進みます。大会での成績が優秀なら2月に高校日本代表候補へ選出され、世界大会に出場します。`;
  if (s.phase === 'university') return `大学${s.stageYear}年生。${s.universityGroup}に所属。9〜11月に公式リーグ戦7試合。成績により全国大学選手権またはA・Bグループ入替戦へ進みます。`;
  if (s.phase === 'professional') return `社会人${s.stageYear}年目・${s.professionalLeague || `リーグワンD${s.proDivision}`}。${s.professionalLeague === 'フランス・トップ14' ? 26 : s.professionalLeague === 'フランス・プロD2' ? 30 : s.professionalLeague === 'ユナイテッド・ラグビー・チャンピオンシップ' ? 18 : s.professionalLeague === 'スーパーラグビー・パシフィック' ? 14 : s.professionalLeague === 'メジャーリーグラグビー' ? 16 : s.professionalLeague === 'カリーカップ' ? 14 : s.proDivision === 1 ? 18 : s.proDivision === 2 ? 14 : 15}試合を基準にシーズンを戦い、現役引退予定年齢${s.retirementAge}歳までキャリアを重ねます。`;
  return s.finalSummary ?? '現役生活を終えました。';
}
function lastMatchCard(s: CareerState): string {
  const m = s.lastMatch;
  if (!m) return '<div class="card"><h3>直近の試合</h3><p class="note">試合を進めると、活躍シーン・個人成績・評価がここに表示されます。</p></div>';
  return `<div class="card"><h3>直近の試合レポート</h3><p><b>${esc(m.competition)}</b> ／ ${esc(m.date)}</p>
    <p>${esc(m.competition.includes('日本代表') ? '日本代表' : currentTeam(s))} vs ${esc(m.opponent)}<br><strong class="big2">${m.my} - ${m.their}</strong>　${m.result}</p>
    <p>起用：<b>${esc(m.role ?? (m.appeared ? '先発' : 'メンバー外'))}</b> ／ ${m.appeared ? `選手評価：<b>${m.rating.toFixed(1)} / 10</b>` : '選手評価：出場機会なし'} ／ 経験点 <b>+${m.experience}</b></p>
    <h4>得点経過</h4><ol class="news">${(m.scoreEvents ?? []).map(e => `<li>${e.minute}分 ${esc(e.side === '自チーム' ? (e.scorer === s.player.name ? e.scorer : e.scorer) : e.scorer)}：${esc(e.method)}（+${e.points}点）</li>`).join('') || '<li>得点経過データはありません（過去の試合記録）。</li>'}</ol>
    <div class="cards"><div class="card stat"><span class="k">トライ</span><b>${m.tries}</b></div><div class="card stat"><span class="k">キャリー</span><b>${m.carries}</b></div>
    <div class="card stat"><span class="k">タックル</span><b>${m.tackles}</b></div><div class="card stat"><span class="k">ラインブレイク</span><b>${m.lineBreaks}</b></div>
    <div class="card stat"><span class="k">キック</span><b>${m.kicks}</b></div><div class="card stat"><span class="k">ミス</span><b>${m.errors}</b></div></div>
    <h4>活躍シーン</h4><ul class="news">${m.scenes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
}
function homeScreen(s: CareerState): string {
  const o = careerOverall(s);
  const rating = s.phase === 'highschool' ? (o >= 76 ? 'S' : o >= 72 ? 'A' : o >= 68 ? 'B' : o >= 62 ? 'C' : o >= 55 ? 'D' : 'E') : s.phase === 'university' ? (o >= 95 ? 'S' : o >= 90 ? 'A' : o >= 85 ? 'B' : o >= 78 ? 'C' : o >= 68 ? 'D' : 'E') : (o >= 105 ? 'S' : o >= 98 ? 'A' : o >= 90 ? 'B' : o >= 80 ? 'C' : o >= 65 ? 'D' : 'E');
  const bars = CAREER_STAT_KEYS.map((k) => `<div class="bar"><span>${STAT_LABEL[k]}</span><div class="track"><i style="width:${Math.round(Math.min(120,s.player.stats[k]) / 120 * 100)}%"></i></div><b>${Math.round(s.player.stats[k])}</b></div>`).join('');
  const training = CAREER_STAT_KEYS.map((k) => `<button class="btn mode ${s.training === k ? 'primary' : ''}" data-career="train" data-v="${k}"><b>${STAT_LABEL[k]}を鍛える</b><span>${s.training === k ? '現在選択中' : '今月の重点トレーニングに設定'}</span></button>`).join('');
  const history = s.history.slice(0, 8).map((h) => `<li>${esc(h)}</li>`).join('');
  const seasons = s.seasons.slice().reverse().slice(0, 12).map((r) => `<div class="card"><b>${r.age}歳・${esc(r.team)}</b><div class="small">${labels[r.phase]} ${r.year}年目：${r.wins}勝${r.losses}敗${r.draws}分 ／ 出場${r.appearances}試合・${r.tries}トライ</div><div class="small">先発${r.starts ?? 0}・途中出場${r.substituteApps ?? 0}・控え${r.bench ?? 0}・メンバー外${r.notSelected ?? 0}</div>${r.awards?.length ? `<div class="small">表彰：${r.awards.map(esc).join('、')}</div>` : ''}</div>`).join('');
  const team = currentTeam(s);
  const advanceLabel = s.pendingTransfer ? '契約を更新して進む' : s.pendingTournament ? `試合開始（${s.pendingTournament.name}・${s.pendingTournament.rounds + 1}試合目）` : s.pendingFixtures?.length ? `試合開始（${s.pendingFixtures[0].label}）` : s.tournamentCompletedMonth === s.month ? `試合終了：${monthLabel(s.month)}を終えて次の月へ` : (s.phase === 'professional' && [12,1,2,3,4,5,6,8,9].includes(s.month)) || (s.phase === 'university' && [5,6,9,10,11,12,1].includes(s.month)) || (s.phase === 'highschool' && [2,7,11,12].includes(s.month)) ? `試合開始（${monthLabel(s.month)}）` : `${monthLabel(s.month)}を進める`;
  const plans: CareerTrainingPlan[] = ['バランス','筋力','技術','持久力'];
  const planButtons = plans.map((p) => `<button class="btn mode ${s.trainingPlan === p ? 'primary' : ''}" data-career="plan" data-v="${p}"><b>${p}</b><span>${s.trainingPlan === p ? '選択中' : ({'バランス':'能力全体をバランスよく育成','筋力':'パワー系能力を重点育成','技術':'技術系能力を重点育成','持久力':'スタミナとスピードを重点育成'} as Record<CareerTrainingPlan,string>)[p]}</span></button>`).join('');
  const sameCategoryRivals = s.rivals.filter((r) => !r.retired && r.phase === s.phase && r.pos === s.player.pos).sort((a,b) => Math.abs(a.age-s.age)-Math.abs(b.age-s.age) || b.overall-a.overall);
  const sameGenerationRivals = sameCategoryRivals.filter((r) => Math.abs(r.age-s.age) <= 2);
  const topRivals = (sameGenerationRivals.length >= 5 ? sameGenerationRivals : sameCategoryRivals).sort((a,b) => b.overall-a.overall || Math.abs(a.age-s.age)-Math.abs(b.age-s.age)).slice(0,5);
  const rivals = topRivals.map((r,i) => `<button class="row roster-player rival-player" data-career="rival-player" data-v="${s.rivals.indexOf(r)}"><span class="pos">${i+1}</span><span class="nm">${esc(r.name)}<small>${r.age}歳・${esc(r.team)}${r.league ? `・${esc(r.league)}` : ''}</small></span><span class="ov">${Math.round(r.overall)}</span><span aria-hidden="true">›</span></button>`).join('');
  const hall = careerHallOfFame().slice(0,5).map((r,i) => `<li>${i+1}位 ${esc(r.name)}：スコア${r.score}／出場${r.appearances}・${r.tries}トライ</li>`).join('');
  const rivalModal = selectedRivalIndex !== null && s.rivals[selectedRivalIndex] ? rivalDetail(s, s.rivals[selectedRivalIndex]) : '';
  return `<main class="page career-pennant-shell"><div class="career-pennant-ribbon"><span>RUGBY PENNANT</span><span>${esc(team)} ・ SEASON ${s.currentSeason.year}</span></div><header class="hd career-pennant-header"><div class="school">🏉 ラグビー人生キャリア</div><div class="date">${s.age}歳・${monthLabel(s.month)} ／ ${labels[s.phase]} ${s.phase === 'retired' ? '' : s.stageYear + '年目'}</div></header>
    <div class="career-sticky-progress"><div class="career-sticky-progress-meta"><b>${monthLabel(s.month)}</b><span>${labels[s.phase]}・${s.age}歳</span></div><button class="btn primary career-sticky-progress-button" data-career="advance">${advanceLabel}</button></div>
    <nav class="career-tabs" role="tablist" aria-label="キャリア情報">
      <button class="career-tab ${activeCareerTab === 'player' ? 'active' : ''}" role="tab" aria-selected="${activeCareerTab === 'player'}" data-career="career-tab" data-v="player">選手情報</button>
      <button class="career-tab ${activeCareerTab === 'roster' ? 'active' : ''}" role="tab" aria-selected="${activeCareerTab === 'roster'}" data-career="career-tab" data-v="roster">メンバー</button>
      <button class="career-tab ${activeCareerTab === 'records' ? 'active' : ''}" role="tab" aria-selected="${activeCareerTab === 'records'}" data-career="career-tab" data-v="records">戦績・記録</button>
    </nav>
    <section class="career-tab-panel ${activeCareerTab === 'player' ? 'active' : ''}" data-tab-panel="player">
    <div class="panel career-player-hero"><div class="profile-hero">${careerPortrait(s.player.name,s.player.pos)}<div><span class="profile-kicker">PLAYER CAREER</span><b class="career-player-name">${esc(s.player.name)}</b><p>${s.player.pos} ／ 総合値 ${o}（${rating}ランク）</p><span class="small">${esc(team)} ・ ${s.player.height}cm / ${s.player.weight}kg</span></div></div><p>${phaseDescription(s)}</p><div class="career-kit-radar">${careerUniform(team)}<div class="radar-wrap"><h3>能力バランス</h3>${careerRadar(s.player.stats as unknown as Record<string,number>)}</div></div></div>
    <div class="card career-history-card"><h3>キャリアの歩み</h3>
      <div class="career-path">
        <div class="career-path-step ${s.phase === 'highschool' ? 'current' : 'done'}"><span class="career-path-dot">高</span><div><b>高校編</b><p>${esc(s.highSchool || '未登録')}</p><small>${s.seasons.filter(x => x.phase === 'highschool').length}シーズン記録</small></div></div>
        <div class="career-path-step ${s.phase === 'university' ? 'current' : (s.phase === 'professional' || s.phase === 'retired') ? 'done' : ''}"><span class="career-path-dot">大</span><div><b>大学編</b><p>${esc(s.university || '進学前')}</p><small>${s.university ? esc(s.universityGroup) + '・' + esc(s.universityTier) : '高校卒業後の進路'}</small></div></div>
        <div class="career-path-step ${s.phase === 'professional' ? 'current' : s.phase === 'retired' ? 'done' : ''}"><span class="career-path-dot">社</span><div><b>社会人編</b><p>${esc(s.professionalTeam || '入団前')}</p><small>${esc(s.professionalLeague || (s.professionalTeam ? 'リーグワンD' + s.proDivision : 'プロ契約・海外挑戦'))}</small></div></div>
      </div>
      <h3>在籍シーズン記録</h3>
      <div class="career-season-history">${s.seasons.length ? [...s.seasons].reverse().map(season => `<div class="career-season-row"><b>${season.age}歳・${season.year}年目</b><span>${season.phase === 'highschool' ? '高校' : season.phase === 'university' ? '大学' : '社会人'}／${esc(season.team)}</span><small>${season.played}試合・${season.wins}勝 ${season.draws}分 ${season.losses}敗・得点 ${season.pointsFor}-${season.pointsAgainst}</small></div>`).join('') : '<p class="note">シーズン記録は進行に合わせて追加されます。</p>'}</div>
    </div>
    ${s.university ? `<div class="card"><b>進学先</b><p>${esc(s.university)}（${esc(s.universityGroup)}・${esc(s.universityTier)}）</p>${s.phase === 'university' ? `<p class="note">大学編の所属校は固定され、大学編の途中で移籍することはできません。</p></div>` : ''}
    ${s.professionalTeam ? `<div class="card"><b>所属社会人チーム</b><p>${esc(s.professionalTeam)}（${esc(s.professionalLeague || `リーグワンD${s.proDivision}`)}）</p></div>` : ''}
    ${s.nationalCandidate ? `<div class="card"><b>高校日本代表候補</b><p>選出済み ／ 世界大会勝利数：${s.worldTournamentWins}</p></div>` : ''}
    ${s.japanNationalTeamSelected ? `<div class="card"><b>日本代表</b><p>選出中 ／ 国際試合 ${s.japanNationalTeamCaps}キャップ・${s.japanNationalTeamWins}勝</p><p class="small">全国の候補からポジション別の総合力で毎月再選考します。</p></div>` : `<div class="card"><b>日本代表</b><p>現在は未選出 ／ 通算 ${s.japanNationalTeamCaps}キャップ・${s.japanNationalTeamWins}勝</p></div>`}
    ${s.nationalSquad?.length && (s.pendingTournament?.kind === 'world' || s.pendingFixtures?.some((f) => f.kind === 'japan-test' || f.kind === 'world-cup') || s.liveMatch?.fixture.kind === 'japan-test' || s.liveMatch?.fixture.kind === 'world-cup') ? `<div class="card national-squad-card"><h3>${s.phase === 'highschool' ? '高校日本代表候補' : '日本代表'} 選出メンバー（${s.nationalSquad.length}名）</h3><p class="small">ポジション別に選考。代表戦の予定があるときにメンバーを表示します。</p><ol class="national-squad-list">${s.nationalSquad.slice(0, 23).map((p,i)=>`<li><span class="squad-rank">${i+1}</span><span class="squad-main"><b>${esc(p.name)}</b><small>${p.pos} ／ ${esc(p.team)}${s.phase !== 'professional' && p.year ? `・${p.year}` : ''}</small></span><strong>${p.overall}</strong></li>`).join('')}</ol></div>` : ''}
    <div class="card"><h3>選手能力</h3>${bars}<p class="small">能力値は育成・経験・年齢に応じて変化 ／ 最高総合値：${Math.round(s.player.peak)} ／ 成長タイプ：${s.player.talentType}（成長係数 ${s.player.talent.toFixed(2)}）</p></div>
    </section>
    <section class="career-tab-panel ${activeCareerTab === 'roster' ? 'active' : ''}" data-tab-panel="roster">
    <section class="career-roster-panel"><h3>チーム登録メンバー（23名）</h3><div class="lineup-grid">${lineupCard(s, currentTeam(s), true)}</div></section>
    </section>
    <section class="career-tab-panel ${activeCareerTab === 'records' ? 'active' : ''}" data-tab-panel="records">
    ${lastMatchCard(s)}
    ${s.pendingTransfer ? `<div class="card"><h3>契約・移籍オファー</h3><p>シーズン終了。契約を選べます。選ばずに進行すると現所属で更新します。</p>${s.pendingTransfer.offers.map((o,i)=>`<button class="btn mode" data-career="transfer" data-v="${i}"><b>${esc(o.team)}（${o.overseas ? `海外・${o.league || '海外リーグ'}` : `国内D${o.division}`}）</b><span>年俸目安 ${o.salary}万円／契約 ${o.team === s.professionalTeam ? Math.max(1,s.proContractYears) : '2〜3'}年</span></button>`).join('')}</div>` : ''}
    ${s.phase !== 'retired' ? `<section class="career-command-panel"><div class="career-section-heading"><span class="career-section-no">01</span><div><h3>今月の育成方針</h3><p class="note">能力別トレーニングに加えて育成プランを選択。年齢によって成長が緩やかになり、ベテラン期は能力低下も起こります。</p></div></div><div class="career-training-grid">${training}</div><h4 class="career-subheading">育成プラン</h4><div class="career-plan-grid">${planButtons}</div>
    <button class="btn primary big career-advance-button" data-career="advance">${advanceLabel}</button></section>` : `<div class="panel"><h3>現役引退</h3><p>${esc(s.finalSummary ?? '')}</p><p>通算リーグ出場：${s.seasons.reduce((n, r) => n + r.appearances, 0)}試合 ／ 通算トライ：${s.seasons.reduce((n, r) => n + r.tries, 0)}</p></div>`}
    ${seasonCard(s)}<div class="card"><h3>契約・キャリア実績</h3><p>契約残り：${s.proContractYears}年 ／ 年俸：${s.proSalary ? `${s.proSalary}万円` : '未設定'} ／ レガシースコア：${s.legacyScore ?? careerLegacyScore(s)}</p>${s.transferHistory.length ? `<ul class="news">${s.transferHistory.slice(0,5).map(esc).map(x=>`<li>${x}</li>`).join('')}</ul>` : '<p class="small">プロ入り後、シーズン終了時に契約更新・国内移籍・海外挑戦の選択肢が提示されます。</p>'}</div>
    <div class="card"><h3>同年代・同カテゴリーのポジションランキング</h3><p class="small">${s.age}歳・${labels[s.phase]}・${s.player.pos}の選手を総合値順に表示。上位5名をタップすると能力詳細を確認できます。</p><div class="roster-list">${rivals || '<p class="note">該当するライバルがいません。</p>'}</div></div>
    <div class="card"><h3>通算記録・殿堂ランキング</h3><p>通算出場：${s.seasons.reduce((n,r)=>n+r.appearances,0)+s.currentSeason.appearances}試合 ／ トライ：${s.seasons.reduce((n,r)=>n+r.tries,0)+s.currentSeason.tries} ／ 代表：${s.japanNationalTeamCaps}キャップ ／ 表彰：${s.awards.length}件</p><p>現在のレガシースコア：${careerLegacyScore(s)}</p><ul class="news">${hall || '<li>殿堂入り記録は選手が引退すると登録されます。</li>'}</ul></div>
    <h3>キャリア年表</h3><ul class="news">${history}</ul>
    <h3>シーズン記録・年鑑</h3>${seasons || '<p class="note">シーズン終了後に記録が追加されます。</p>'}
    <button class="btn" data-career="title">タイトルへ戻る</button><p class="note">このモードのセーブは監督モードとは独立しています。</p>
    </section>${rivalModal}</main>`;
}

type RosterMember = { name: string; pos: Pos; number: number; role: string; stats: Record<StatKey, number>; overall: number; isUser?: boolean };
let selectedRosterMember: RosterMember | null = null;
let selectedRivalIndex: number | null = null;
let showMatchResult = false;
let activeCareerTab = 'player';
const rosterPositions: Pos[] = ['PR','HO','PR','LO','LO','FL','FL','N8','SH','SO','WTB','CTB','CTB','WTB','FB','PR','HO','LO','FL','N8','SH','SO','CTB'];
function stableHash(text: string): number { let h = 2166136261; for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }
function teamRoster(team: string, s: CareerState, own: boolean): RosterMember[] {
  const seed = stableHash(`${s.phase}|${team}`);
  const usedNames = new Set<string>([s.player.name, ...s.rivals.map((r) => r.name), ...s.matchHistory.flatMap((m) => (m.scoreEvents ?? []).map((e) => e.scorer))]);
  const knownCountry = s.rivals.find((r) => r.team === team && r.country && r.country !== '日本')?.country;
  const rosterCountry = inferPlayerCountry(knownCountry || team);
  return rosterPositions.map((pos, i) => {
    const isUser = own && pos === s.player.pos && i === rosterPositions.findIndex((p) => p === s.player.pos);
    const stats = {} as Record<StatKey, number>;
    for (const [j, key] of CAREER_STAT_KEYS.entries()) {
      const variation = ((seed >>> ((i + j) % 24)) + i * 13 + j * 7) % 19 - 9;
      const hsPenalty = !own && s.phase === 'highschool' ? 10 + ((seed + i * 7 + j * 3) % 6) : 0;
      const phaseBaseline = s.phase === 'highschool' ? 52 : s.phase === 'university' ? 82 : 112;
      const teamName = s.phase === 'highschool' ? s.highSchool : s.phase === 'university' ? s.university : s.professionalTeam;
      const profile = careerTeamStrengthProfile(s.phase, teamName || team);
      const base = own ? (profile.center + variation) : (phaseBaseline + variation + (s.phase === 'professional' ? 8 : 0) - hsPenalty);
      stats[key] = Math.max(15, Math.min(200, Math.round(isUser ? s.player.stats[key] : base)));
    }
    if (isUser) for (const key of CAREER_STAT_KEYS) stats[key] = Math.round(s.player.stats[key]);
    const overall = Math.round(CAREER_STAT_KEYS.reduce((sum, key) => sum + stats[key], 0) / CAREER_STAT_KEYS.length);
    let nameSeed = (seed + (i + 1) * 2654435761) >>> 0;
    const generatedName = isUser ? s.player.name : generateUniquePlayerName(usedNames, rosterCountry, () => {
      nameSeed = (Math.imul(nameSeed, 1664525) + 1013904223) >>> 0;
      return nameSeed / 4294967296;
    });
    return { name: isUser ? s.player.name : generatedName, pos, number: i + 1, role: i < 15 ? '先発' : '控え', stats, overall, isUser };
  }).map((member, index, all) => {
    const startsByPos: Partial<Record<Pos, number>> = { PR: 2, HO: 1, LO: 2, FL: 2, N8: 1, SH: 1, SO: 1, WTB: 2, CTB: 2, FB: 1 };
    const samePos = all.filter((candidate) => candidate.pos === member.pos).sort((a,b) => b.overall - a.overall || a.number - b.number);
    const role = samePos.findIndex((candidate) => candidate.number === member.number) < (startsByPos[member.pos] ?? 1) ? '先発' : '控え';
    return { ...member, role: member.isUser && s.liveMatch ? s.liveMatch.role : role };
  }).sort((a,b) => a.number - b.number);
}

function playerCareerHistory(member: RosterMember): string {
  if (member.isUser && state) {
    const seasons = state.seasons.slice().sort((a, b) => a.year - b.year).map(season =>
      `<li><b>${season.age}歳・${esc(labels[season.phase])} ${season.year}年目</b><span>${esc(season.team)}${season.league ? `・${esc(season.league)}` : ''}</span><small>${season.wins}勝 ${season.losses}敗 ${season.draws}分 ／ 出場${season.appearances}試合・${season.tries}トライ</small></li>`
    ).join('');
    const current = state.currentSeason ? `<li class="current"><b>${state.age}歳・${esc(labels[state.currentSeason.phase])} ${state.currentSeason.year}年目（現在）</b><span>${esc(state.currentSeason.team)}</span><small>${state.currentSeason.wins}勝 ${state.currentSeason.losses}敗 ${state.currentSeason.draws}分 ／ 出場${state.currentSeason.appearances}試合・${state.currentSeason.tries}トライ</small></li>` : '';
    const transfers = state.transferHistory.map(item => `<li><b>移籍・契約記録</b><span>${esc(item)}</span></li>`).join('');
    const history = state.history.map(item => `<li>${esc(item)}</li>`).join('');
    return `<div class="card player-career-history"><h3>選手経歴</h3><ol class="career-player-timeline">${seasons}${current}${transfers}</ol>${history ? `<h4>キャリア年表</h4><ul class="news">${history}</ul>` : ''}</div>`;
  }
  const currentPhase = state?.phase ?? 'highschool';
  const stage = [
    { label: '高校', team: state?.highSchool || '高校ラグビー', reached: true },
    { label: '大学', team: currentPhase === 'highschool' ? '進学前' : (state?.university || '大学ラグビー'), reached: currentPhase !== 'highschool' },
    { label: '社会人', team: currentPhase === 'professional' || currentPhase === 'retired' ? (state?.professionalTeam || '社会人ラグビー') : '未到達', reached: currentPhase === 'professional' || currentPhase === 'retired' }
  ];
  return `<div class="card player-career-history"><h3>選手経歴</h3><ol class="career-player-timeline">${stage.map(item => `<li class="${item.reached ? '' : 'future'}"><b>${item.label}</b><span>${esc(item.team)}</span></li>`).join('')}</ol><p class="small">チーム生成選手の個人別過去シーズン記録は保存されていないため、所属段階に基づく経歴を表示しています。</p></div>`;
}

function playerDetail(member: RosterMember): string {
  const bars = CAREER_STAT_KEYS.map((key) => `<div class="bar"><span>${CAREER_STAT_LABEL[key]}</span><div class="track"><i style="width:${Math.round(Math.min(200,member.stats[key])/2)}%"></i></div><b>${member.stats[key]}</b></div>`).join('');
  const height = member.isUser && state ? state.player.height : (member.pos === 'LO' ? 188 : member.pos === 'PR' ? 178 : 174);
  const weight = member.isUser && state ? state.player.weight : (['PR','HO','LO','N8'].includes(member.pos) ? 94 : 78);
  return `<div class="modal" data-career="roster-close"><section class="sheet" role="dialog" aria-modal="true" aria-label="選手詳細" data-roster-sheet><button class="link" data-career="roster-close">← メンバー表へ戻る</button><h2>${esc(member.name)}</h2><div class="panel">背番号 ${member.number} ／ ${member.pos} ／ ${member.role}<br>総合値 <b>${member.overall}</b>${member.isUser ? '<br>あなたが操作する選手' : ''}</div><div class="card"><h3>能力ステータス</h3>${bars}</div><div class="cards"><div class="card stat"><span class="k">身長</span><b>${height}cm</b></div><div class="card stat"><span class="k">体重</span><b>${weight}kg</b></div></div>${playerCareerHistory(member)}<button class="btn primary" data-career="roster-close">閉じる</button></section></div>`;
}
function rivalDetail(s: CareerState, rival: CareerState['rivals'][number]): string {
  const seed = stableHash(`${rival.name}|${rival.team}|${rival.pos}`);
  const stats = {} as Record<StatKey, number>;
  for (const [i, key] of CAREER_STAT_KEYS.entries()) {
    const variation = ((seed >>> ((i * 3) % 24)) + i * 11) % 17 - 8;
    stats[key] = Math.max(15, Math.min(200, Math.round(rival.overall + variation)));
  }
  const bars = CAREER_STAT_KEYS.map((key) => `<div class="bar"><span>${CAREER_STAT_LABEL[key]}</span><div class="track"><i style="width:${Math.round(Math.min(200,stats[key])/2)}%"></i></div><b>${stats[key]}</b></div>`).join('');
  return `<div class="modal" data-career="rival-close"><section class="sheet" role="dialog" aria-modal="true" aria-label="ライバル選手詳細" data-rival-sheet><button class="link" data-career="rival-close">← ランキングへ戻る</button><h2>${esc(rival.name)}</h2><div class="panel">${esc(rival.team)}${rival.league ? `・${esc(rival.league)}` : ''}<br>${labels[rival.phase]}・${rival.age}歳・${rival.pos}<br>総合値 <b>${Math.round(rival.overall)}</b>${rival.country && rival.country !== '日本' ? `<br>国籍：${esc(rival.country)}` : ''}</div><div class="card"><h3>能力ステータス</h3>${bars}<p class="small">能力値はゲーム内総合値を基準にしたライバル選手のステータスです。</p></div><div class="cards"><div class="card stat"><span class="k">出場</span><b>${rival.appearances}</b></div><div class="card stat"><span class="k">トライ</span><b>${rival.tries}</b></div></div><button class="btn primary" data-career="rival-close">閉じる</button></section></div>`;
}
function lineupCard(s: CareerState, team: string, own: boolean): string {
  const roster = teamRoster(team, s, own);
  return `<section class="card"><h3>${own ? '自チームのメンバー表' : '対戦相手のメンバー表'}</h3><p class="note">23名登録・ポジション順。先発／控えは同ポジション内の総合力で判定。選手をタップすると能力詳細を確認できます。</p><div class="roster-list">${roster.map((p) => `<button class="row roster-player" data-career="roster-player" data-v="${own ? 'own' : 'opponent'}:${p.number}"><span class="pos">${p.number}</span><span class="nm">${esc(p.name)}${p.isUser ? '（あなた）' : ''}<small>${p.pos}・${p.role}</small></span><span class="ov">${p.overall}</span><span aria-hidden="true">›</span></button>`).join('')}</div></section>`;
}

function matchResultScreen(s: CareerState): string {
  const m = s.lastMatch;
  if (!m) return homeScreen(s);
  const detail = selectedRosterMember ? playerDetail(selectedRosterMember) : '';
  return `<main class="page"><div class="match-result-top-actions"><button class="btn primary big" data-career="result-continue">← キャリアに戻る</button></div><header class="hd"><div class="school">🏉 試合結果</div><div class="date">${esc(m.date)} ／ ${esc(m.competition)}</div></header>
    ${detail}
    <section class="card match-result-card"><h2>${esc(m.competition)}</h2><p>${esc(m.date)}</p>
      <div class="scoreboard"><div><span>${esc(m.competition.includes('日本代表') ? '日本代表' : currentTeam(s))}</span><strong>${m.my}</strong></div><div class="score-dash">—</div><div><span>${esc(m.opponent)}</span><strong>${m.their}</strong></div></div>
      <p><b>${m.result}</b> ／ 起用：${esc(m.role ?? (m.appeared ? '先発' : 'メンバー外'))} ／ ${m.appeared ? `評価 ${m.rating.toFixed(1)}/10` : '出場機会なし'}</p>
      <h3>得点経過</h3><ol class="news">${(m.scoreEvents ?? []).map(e => `<li>${e.minute}分 ${esc(e.side === '自チーム' ? currentTeam(s) : m.opponent)}：${esc(e.scorer)} — ${esc(e.method)}（+${e.points}点）</li>`).join('') || '<li>得点経過データはありません（過去の試合記録）。</li>'}</ol>
      <div class="cards"><div class="card stat"><span class="k">トライ</span><b>${m.tries}</b></div><div class="card stat"><span class="k">キャリー</span><b>${m.carries}</b></div><div class="card stat"><span class="k">タックル</span><b>${m.tackles}</b></div><div class="card stat"><span class="k">突破</span><b>${m.lineBreaks}</b></div></div>
      <h3>試合レポート</h3><ul class="news">${m.scenes.map((scene) => `<li>${esc(scene)}</li>`).join('')}</ul>
    </section>
    <details class="match-lineups"><summary>メンバー表を表示（両チーム23名）</summary><div class="lineup-grid">${lineupCard(s, currentTeam(s), true)}${lineupCard(s, m.opponent, false)}</div></details>
    </main>`;
}
function render(): void {
  if (!root) return;
  if (titleMenu) { root.innerHTML = titleScreen(); return; }
  root.innerHTML = creating || !state ? createScreen() : showMatchResult ? matchResultScreen(state) : homeScreen(state);
}
function act(action: string, value = ''): void {
  if (!root) return;
  if (action === 'title') { titleMenu = true; creating = false; showMatchResult = false; selectedRosterMember = null; selectedRivalIndex = null; render(); return; }
  if (action === 'new-slot') {
    selectedSaveSlot = value === '2' ? 2 : 1; setCareerSaveSlot(selectedSaveSlot);
    if (hasCareerSave(selectedSaveSlot) && !confirm(`セーブスロット${selectedSaveSlot}を上書きしますか？`)) return;
    state = null; creating = true; titleMenu = false; createPrefIndex = 26; createSchoolIndex = 1; createTalentType = '凡人'; render(); return;
  }
  if (action === 'continue-slot') {
    selectedSaveSlot = value === '2' ? 2 : 1; setCareerSaveSlot(selectedSaveSlot);
    state = loadCareer(selectedSaveSlot); creating = !state; titleMenu = !state; showMatchResult = false; render(); return;
  }
  if (action === 'rival-close') { selectedRivalIndex = null; render(); return; }
  if (action === 'rival-player' && state) { const index = Number(value); if (Number.isInteger(index) && index >= 0 && index < state.rivals.length) selectedRivalIndex = index; render(); return; }
  if (action === 'roster-close') { selectedRosterMember = null; render(); return; }
  if (action === 'roster-player' && state) {
    const [side, rawNumber] = value.split(':');
    const opponent = state.liveMatch?.fixture.opponent ?? state.lastMatch?.opponent ?? '対戦相手';
    const team = side === 'own' ? currentTeam(state) : opponent;
    selectedRosterMember = teamRoster(team, state, side === 'own').find((p) => p.number === Number(rawNumber)) ?? null;
    render(); return;
  }
  if (action === 'career-tab' && state) {
    activeCareerTab = value;
    render();
    const panel = root?.querySelector<HTMLElement>(`[data-tab-panel="${value}"]`);
    panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  if (action === 'result-continue' && state) { showMatchResult = false; selectedRosterMember = null; activeCareerTab = 'player'; render(); return; }
  if (action === 'random-name') {
    const input = root.querySelector<HTMLInputElement>('#career-name');
    if (input) { input.value = generateUniquePlayerName(new Set<string>(), '日本'); input.focus(); }
    return;
  }
  if (action === 'start') {
    const name = root.querySelector<HTMLInputElement>('#career-name')?.value ?? '';
    const pos = (root.querySelector<HTMLSelectElement>('#career-pos')?.value ?? 'CTB') as Pos;
    if (hasCareerSave(selectedSaveSlot) && !confirm('保存済みの選手キャリアを上書きしますか？')) return;
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
    const previousMatchCount = state.matchHistory.length;
    state.liveMatch = undefined;
    advanceCareerMonth(state, false);
    showMatchResult = state.matchHistory.length > previousMatchCount;
    selectedRosterMember = null;
  }
  render();
}
export function openCareerMode(el: HTMLElement, resume: boolean): void {
  root = el;
  state = resume ? loadCareer() : null;
  creating = !resume || !state;
  if (creating) { createPrefIndex = 26; createSchoolIndex = 1; createTalentType = '凡人'; }
  showMatchResult = false; selectedRosterMember = null;
  if (!bound) {
    root.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-roster-sheet]') && !target.closest('button[data-career="roster-close"]')) return;
      const t = target.closest<HTMLElement>('[data-career]');
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
