import { useState, type ReactNode } from 'react';
import { SCREENS, isImplemented, type ScreenId } from '../app/screens';

interface Props {
  current: ScreenId;
  onNavigate: (id: ScreenId) => void;
  children: ReactNode;
}

/** PC: 左サイドメニュー / スマホ: 下部ナビ + 「メニュー」から全画面へ */
export function Layout({ current, onNavigate, children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuScreens = SCREENS.filter((s) => s.id !== 'title');
  const primary = SCREENS.filter((s) => s.primary);

  const go = (id: ScreenId) => {
    setMenuOpen(false);
    onNavigate(id);
  };

  return (
    <div className="layout">
      <aside className="sidebar" aria-label="メインメニュー">
        <div className="sidebar-title">🏉 監督室</div>
        <nav>
          {menuScreens.map((s) => (
            <button
              key={s.id}
              className={`nav-item ${current === s.id ? 'active' : ''}`}
              onClick={() => go(s.id)}
            >
              <span className="nav-icon">{s.icon}</span>
              <span>{s.label}</span>
              {!isImplemented(s) && <span className="badge">準備中</span>}
            </button>
          ))}
          <button className="nav-item" onClick={() => go('title')}>
            <span className="nav-icon">↩️</span>
            <span>タイトルへ戻る</span>
          </button>
        </nav>
      </aside>

      <main className="content">{children}</main>

      <nav className="bottom-nav" aria-label="下部ナビゲーション">
        {primary.map((s) => (
          <button
            key={s.id}
            className={`bottom-item ${current === s.id ? 'active' : ''}`}
            onClick={() => go(s.id)}
          >
            <span className="nav-icon">{s.icon}</span>
            <span>{s.shortLabel}</span>
          </button>
        ))}
        <button className={`bottom-item ${menuOpen ? 'active' : ''}`} onClick={() => setMenuOpen((v) => !v)}>
          <span className="nav-icon">☰</span>
          <span>メニュー</span>
        </button>
      </nav>

      {menuOpen && (
        <div className="drawer-backdrop" onClick={() => setMenuOpen(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="全メニュー">
            {menuScreens.map((s) => (
              <button key={s.id} className="drawer-item" onClick={() => go(s.id)}>
                <span className="nav-icon">{s.icon}</span>
                <span>{s.label}</span>
                {!isImplemented(s) && <span className="badge">準備中</span>}
              </button>
            ))}
            <button className="drawer-item" onClick={() => go('title')}>
              <span className="nav-icon">↩️</span>
              <span>タイトルへ戻る</span>
            </button>
            <button className="drawer-close" onClick={() => setMenuOpen(false)}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}
