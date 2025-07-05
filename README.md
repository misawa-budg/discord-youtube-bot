# Youtube-play Discord Music Bot

A lightweight Discord.js (v14) music bot that plays YouTube audio via slash commands _or_ prefix commands.

## Features

* 🎵 `/music` **or** `y!play <url|query>` – play a YouTube URL _or_ search by keywords (top result)
* 📝 Queue management – `/queue`, `y!queue`, automatic next-track playback
* ⏭️ Skip – `/skip` / `y!skip`
* ⏹️ Stop – `/stop` / `y!stop` (clears queue & leaves VC)
* 🧹 Clean – `/clean` / `y!clean` (delete bot messages in current channel)
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

### 3. Register slash commands
```bash
npm run deploy
```

### 4. Run
```bash
# dev (nodemon + ts-node)
npm run dev
```
Bot がオンラインになったら VC で `/music` または `y!play` を試してください。

## Prefix Commands (text)
| Command | エイリアス | 説明 |
|---------|-----------|------|
| `y!play <url|query>` | `y!p` | 再生 / キュー追加 |
| `y!skip`             | `y!s` | スキップ |
| `y!stop`             |       | 停止 & 切断 |
| `y!queue`            |       | キュー表示 |
| `y!clean`            |       | Bot メッセージ削除 |

> **Note**: メッセージコマンドを使うには Bot アプリ設定で **MESSAGE CONTENT INTENT** を有効化し、Bot に「メッセージの管理」権限を付与してください。

## Scripts
| script | 説明 |
|--------|------|
| `npm run dev` | nodemon + ts-node で開発起動 |
| `npm run start` | ts-node で通常起動 |
| `npm run deploy` | スラッシュコマンドを Guild に登録 |

## Dependencies
* discord.js ^14
* @discordjs/voice
* @distube/ytdl-core – YouTube オーディオ取得
* play-dl – YouTube 検索
* ffmpeg-static – FFMPEG バイナリ

## License
MIT – see [LICENSE](./LICENSE). 
