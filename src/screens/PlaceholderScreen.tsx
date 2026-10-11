import type { ScreenDef } from '../app/screens';

/** 未実装画面。「準備中」であることを明示し、実装済みに見せかけない。 */
export function PlaceholderScreen({ screen }: { screen: ScreenDef }) {
  return (
    <div>
      <h2>{screen.icon} {screen.label}</h2>
      <section className="card">
        <p><strong>この画面は未実装です。</strong></p>
        <p>第{screen.stage}段階で実装する予定です。</p>
      </section>
    </div>
  );
}
