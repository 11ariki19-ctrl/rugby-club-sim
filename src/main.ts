import './style.css';
import { openCareerMode } from './career-ui';

// このアプリはラグビー人生キャリア専用。旧・部活監督モードの画面は起動しない。
const app = document.getElementById('app');
if (!app) throw new Error('アプリの起動領域 #app が見つかりません。');
openCareerMode(app, false);
