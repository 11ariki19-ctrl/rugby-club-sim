# 高校ラグビー部 監督物語

React + TypeScript + Vite で作る、長期育成型の高校ラグビー部運営シミュレーション(ブラウザゲーム)です。
サーバー不要で、GitHub Pages で公開できます。

## 現在の状況

**第1段階(プロジェクトの土台)のみ完了**です。ゲーム本体(選手生成・育成・試合など)は未実装です。
実装済み: 画面遷移(PC サイドメニュー / スマホ下部ナビ)、型定義、設定値、テスト環境、GitHub Actions。
未実装の画面は「準備中」と明示しています。

## 開発環境の準備

1. [Node.js](https://nodejs.org/) の LTS 版(20 以上)をインストールする
2. このフォルダでターミナルを開く
3. `npm install` を実行(必要な部品をダウンロードします。初回のみ)

## 起動方法

`npm run dev` を実行し、表示された URL(例: http://localhost:5173/)をブラウザで開く。

## ビルド方法

`npm run build` で `dist/` フォルダに公開用ファイルができます。

## テスト方法

`npm test`(自動テスト)/ `npm run typecheck`(型チェック)

## GitHub Pages への公開方法

1. GitHub で新しいリポジトリを作成し、このフォルダの内容を push する(`main` ブランチ)
2. リポジトリの **Settings → Pages → Source** を **GitHub Actions** にする
3. push するたびに `.github/workflows/deploy.yml` が自動でテスト・ビルド・公開を行う

## セーブデータのバックアップ方法

第6段階で実装予定です(JSON エクスポート / インポート)。

## 設定値の場所

ゲームバランスの数値は `src/config/gameConfig.ts` に集約しています。
