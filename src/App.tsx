import { useState } from 'react';
import { Layout } from './components/Layout';
import { TitleScreen } from './screens/TitleScreen';
import { HomeScreen } from './screens/HomeScreen';
import { PlaceholderScreen } from './screens/PlaceholderScreen';
import { getScreen, type ScreenId } from './app/screens';

export default function App() {
  const [screen, setScreen] = useState<ScreenId>('title');

  // タイトル画面だけはナビゲーションなしの全画面表示
  if (screen === 'title') {
    return <TitleScreen onStart={() => setScreen('home')} />;
  }

  const def = getScreen(screen);
  let body;
  if (screen === 'home') body = <HomeScreen onNavigate={setScreen} />;
  else body = <PlaceholderScreen screen={def} />; // 実装済みになった画面は順次ここへ分岐を追加

  return (
    <Layout current={screen} onNavigate={setScreen}>
      {body}
    </Layout>
  );
}
