# MelodyFlow Music - ローカル音楽プレイヤー

<div align="center">
  <img src="https://img.shields.io/badge/Platform-Web-blue.svg" alt="Platform">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/Vue-3.0-brightgreen.svg" alt="Vue">
</div>

> Apple Music風のローカル音楽プレイヤー。歌詞、ローマ字表示、多言語対応

## 機能

### コア機能
- **ローカル音楽取込** - MP3、AAC、WAVなどの音声ファイル対応
- **オンライン音楽検索** - 网易云音乐、QQ音乐対応
- **Apple Music風UI** - モダンなデザイン
- **歌詞表示** - LRC形式対応、タイムライン同期
- **ローマ字表示** - 日本語曲にローマ字を表示
- **プレイリスト** - カスタムプレイリストの作成・管理
- **お気に入り** - 一括でお気に入りに追加
- **再生速度** - 0.5x ~ 2.0x 速度制御
- **A-Bリピート** - 区間ループ、学習に最適
- **スリープタイマー** - 15/30/45/60分後に自動停止
- **ミニプレイヤー** - フローティングミニプレイヤー
- **キーボードショートカット** - スペースで再生/一時停止

### UI機能
- **4つのテーマ** - ダーク、ライト、ピンク、ブルー
- **多言語** - 中文、English、日本語
- **レスポンシブ** - デスクトップとモバイルに対応
- **スムーズアニメーション** - Fluid transitions

### データ管理
- **ローカルストレージ** - ブラウザにデータを保存
- **エクスポート** - ワンプッシュバックアップ
- **インポート** - バックアップから復元

## クイックスタート

### 方法1: オンライン検索（推奨、安装不要）

1. ブラウザで `index.html` を開く
2. プラットフォームを選択（网易云音乐 / QQ音乐）
3. 検索して再生！

### 方法2: LAN展開（一発起動）

局域网内の複数デバイスで共有したい場合に推奨。

| プラットフォーム | スクリプト | 実行方法 |
|----------------|-----------|---------|
| Windows | `起動サービス.bat` | ダブルクリック |
| macOS | `start-server-macos.sh` | `chmod +x` 後に実行 |
| Linux | `start-server-linux.sh` | `chmod +x` 後に実行 |

初回のみ、setting > API 地址に `http://127.0.0.1:3000` を入力してください。

### 方法3: ローカル専用

1. `index.html` をブラウザで開く
2. 手動で音声ファイルをインポート

```bash
git clone https://github.com/huqingyuan-Python/MelodyFlow-Music.git
cd MelodyFlow-Music
open index.html
```

## ファイル構成

```
MelodyFlow-Music/
├── index.html               # メインページ（直接開く）
├── 起動サービス.bat         # Windows 一発展開スクリプト
├── start-server-macos.sh    # macOS 一発展開スクリプト
├── start-server-linux.sh    # Linux 一発展開スクリプト
├── music-server/            # 音源サービス（方法2で使用）
└── LICENSE                  # MITライセンス
```

## ライセンス

MIT License - [LICENSE](LICENSE)参照
