interface Props {
  onStart: () => void;
}

export function TitleScreen({ onStart }: Props) {
  return (
    <div className="title-screen">
      <h1>🏉 高校ラグビー部 監督物語</h1>
      <p className="subtitle">何十年も続く、長期育成型の部活運営シミュレーション</p>
      <div className="title-actions">
        <button className="btn primary" onClick={onStart}>画面構成を確認する(開発版)</button>
        <button className="btn" disabled title="第6段階で実装予定">続きから(第6段階で実装)</button>
      </div>
      <p className="note">
        ※ これは第1段階(プロジェクトの土台)です。新規ゲーム・ロードは未実装のため、
        まだゲームは始められません。
      </p>
    </div>
  );
}
