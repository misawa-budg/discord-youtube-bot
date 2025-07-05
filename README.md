# Youtube-play Discord Music Bot

A lightweight Discord.js (v14) music bot that plays YouTube audio via slash commands _or_ prefix commands.

## Features

* 🎵 `y!play <url|query>` – play a YouTube URL _or_ search by keywords (top result)
* 📝 Queue management – `y!queue`, automatic next-track playback
* ⏭️ Skip – `y!skip`
* ⏹️ Stop – `y!stop` (clears queue & leaves VC)
* 🧹 Clean – `y!clean` (delete bot messages in current channel)
* ⏰ Auto-disconnect after 3 minutes of inactivity
* Works with YouTube only; uses `@distube/ytdl-core` for streaming, `play-dl` for search

## Quick Start

### 1. Clone & install
```bash
git clone https://github.com/yourname/youtube-play-bot.git
cd youtube-play-bot
npm install
```

### 2. Environment variables
Create a `.env` file:
```
DISCORD_TOKEN=YOUR_BOT_TOKEN
CLIENT_ID=YOUR_BOT_CLIENT_ID
GUILD_ID=TARGET_GUILD_ID # テスト用 Guild (slash コマンド登録先)
```

### 3. Run
```bash
# dev (nodemon + ts-node)
npm run dev
```
Bot がオンラインになったら VC で `y!play` を試してください。

### 4. (任意) 既存スラッシュコマンドを削除したい場合
```bash
npm run clear   # または npx ts-node src/clear-commands.ts
```
`DISCORD_TOKEN` と `CLIENT_ID` を使用してグローバル／Guild コマンドを空配列で上書きします。

## Prefix Commands (text)
| Command | エイリアス | 説明 |
|---------|-----------|------|
| `y!play <url|query>` |       | 再生 / キュー追加 |
| `y!skip`             |       | スキップ |
| `y!stop`             |       | 停止 & 切断 |
| `y!queue`            |       | キュー表示 |
| `y!clean`            |       | Bot メッセージ削除 |
| `y!help`             |       | ヘルプ |

> **Note**: メッセージコマンドを使うには Bot アプリ設定で **MESSAGE CONTENT INTENT** を有効化し、Bot に「メッセージの管理」権限を付与してください。

## Scripts
| script | 説明 |
|--------|------|
| `npm run dev` | nodemon + ts-node で開発起動 |
| `npm run start` | ts-node で通常起動 |
| `npm run clear` | 登録済みスラッシュコマンドを削除 |

## Dependencies
* discord.js ^14
* @discordjs/voice
* @distube/ytdl-core – YouTube オーディオ取得
* play-dl – YouTube 検索
* ffmpeg-static – FFMPEG バイナリ

## License
MIT – see [LICENSE](./LICENSE). 
