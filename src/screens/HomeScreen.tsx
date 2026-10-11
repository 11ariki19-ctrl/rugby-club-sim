import { SCREENS, CURRENT_STAGE, isImplemented, type ScreenId } from '../app/screens';

interface Props {
  onNavigate: (id: ScreenId) => void;
}

const STAGES = [
  '第1段階:プロジェクトの土台',
  '第2段階:高校と選手',
  '第3段階:育成とスカウト',
  '第4段階:試合エンジン',
  '第5段階:大会・ランキング・進路',
  '第6段階:保存とデータ',
  '第7段階:品質確認と公開',
];

export function HomeScreen({ onNavigate }: Props) {
  return (
    <div>
      <h2>ホーム・監督室</h2>
      <p className="note">第1段階のため、ゲーム内容はまだありません。開発の進捗を表示しています。</p>

      <section className="card">
        <h3>開発の進捗</h3>
        <ul className="stage-list">
          {STAGES.map((label, i) => (
            <li key={label} className={i + 1 <= CURRENT_STAGE ? 'done' : ''}>
              {i + 1 <= CURRENT_STAGE ? '✅' : '⬜'} {label}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h3>画面一覧(クリックで移動)</h3>
        <div className="grid">
          {SCREENS.filter((s) => s.id !== 'title' && s.id !== 'home').map((s) => (
            <button key={s.id} className="btn tile" onClick={() => onNavigate(s.id)}>
              <span className="nav-icon">{s.icon}</span> {s.label}
              {!isImplemented(s) && <span className="badge">第{s.stage}段階</span>}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
