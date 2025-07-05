import { Client, GatewayIntentBits, ChatInputCommandInteraction, GuildMember, Interaction, Message, TextChannel } from 'discord.js';
import { config } from 'dotenv';
import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    StreamType,
    VoiceConnection,
    AudioPlayer,
} from '@discordjs/voice';
import ytdl from '@distube/ytdl-core';
import * as play from 'play-dl';

config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const PREFIX = 'y!';

const HELP_TEXT = `📖  **YouTube Music Bot コマンド一覧**\n\n` +
`• y!play <url|検索語>  … 再生/キュー追加\n` +
`• y!skip                … スキップ\n` +
`• y!stop                … 停止 & 切断\n` +
`• y!queue               … キュー表示\n` +
`• y!clean               … Bot メッセージ削除\n` +
`• y!help                … このヘルプを表示`;

type Song = {
    url: string;
    requester: string; // user id
};

class MusicSubscription {
    public readonly voiceConnection: VoiceConnection;
    public readonly audioPlayer: AudioPlayer;
    private queue: Song[] = [];
    private current: Song | null = null;
    private readyLock = false;
    private idleTimer: NodeJS.Timeout | null = null;
    constructor(voiceConnection: VoiceConnection, private guildId: string) {
        this.voiceConnection = voiceConnection;
        this.audioPlayer = createAudioPlayer();
        this.voiceConnection.subscribe(this.audioPlayer);

        // 再生終了時のハンドラ
        this.audioPlayer.on('stateChange', (oldState, newState) => {
            // 再生終了→Idle で次へ
            if (oldState.status !== AudioPlayerStatus.Idle && newState.status === AudioPlayerStatus.Idle) {
                this.processQueue();
            }
            // 新しく Playing になったらアイドルタイマー解除
            if (newState.status === AudioPlayerStatus.Playing) {
                this.clearIdleTimer();
            }
        });

        this.audioPlayer.on('error', (error) => {
            console.error('AudioPlayer error:', error);
            this.processQueue();
        });
    }

    /** キューに追加し、再生が止まっていれば開始 */
    public enqueue(song: Song) {
        this.queue.push(song);
        this.clearIdleTimer();
        if (this.audioPlayer.state.status === AudioPlayerStatus.Idle && !this.readyLock) {
            this.processQueue();
        }
    }

    /** 現在の曲を停止（次があれば自動再生） */
    public skip() {
        this.audioPlayer.stop(true);
    }

    /** キューと再生を完全停止 */
    public stop() {
        this.queue = [];
        this.current = null;
        this.clearIdleTimer();
        this.audioPlayer.stop(true);
        if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) {
            this.voiceConnection.destroy();
        }
    }

    private async processQueue() {

        if (this.queue.length === 0) {
            // 3分後に退出
            if (!this.idleTimer) {
                this.idleTimer = setTimeout(() => {
                    if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) {
                        this.voiceConnection.destroy();
                    }
                    subscriptions.delete(this.guildId);
                }, 3 * 60 * 1000);
            }
            this.current = null;
            return;
        }

        const next = this.queue.shift()!;
        this.readyLock = true;
        try {
            const stream = ytdl(next.url, {
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25,
            });
            const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
            this.current = next;
            this.audioPlayer.play(resource);
        } catch (error) {
            console.error('Failed to play stream:', error);
            // 次の曲へ
            this.readyLock = false;
            this.processQueue();
            return;
        }
        // 再生開始後ロック解除
        this.audioPlayer.once(AudioPlayerStatus.Playing, () => {
            this.readyLock = false;
        });
    }

    public getQueue(): { current: Song | null; upcoming: Song[] } {
        return { current: this.current, upcoming: [...this.queue] };
    }

    private clearIdleTimer() {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
    }
}

const subscriptions = new Map<string, MusicSubscription>();

client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);
});

// スラッシュコマンドを無効化したため、interactionCreate は未使用

client.on('messageCreate', async (message: Message) => {
    if (message.author.bot || !message.guild) return;

    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();

    switch (command) {
        case 'music':
            await handlePlayTextCommand(message, args.join(' '));
            break;
        case 'skip':
            await handleSkipTextCommand(message);
            break;
        case 'stop':
            await handleStopTextCommand(message);
            break;
        case 'queue':
            await handleQueueTextCommand(message);
            break;
        case 'clean':
            await handleCleanTextCommand(message);
            break;
        case 'help':
            await handleHelpTextCommand(message);
            break;
    }
});

async function getOrCreateSubscription(member: GuildMember) {
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) return null;

    let sub = subscriptions.get(voiceChannel.guild.id);
    if (!sub) {
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
        sub = new MusicSubscription(connection, voiceChannel.guild.id);
        subscriptions.set(voiceChannel.guild.id, sub);
    }
    return sub;
}

async function handleMusic(interaction: ChatInputCommandInteraction) {
    const input = interaction.options.getString('input') ?? interaction.options.getString('url');

    if (!input) {
        await interaction.reply({ content: '入力が見つかりません。', ephemeral: true });
        return;
    }

    let url: string;

    if (ytdl.validateURL(input)) {
        url = input;
    } else {
        // Treat as search query
        await interaction.deferReply();
        try {
            const results = await play.search(input, { limit: 1, source: { youtube: 'video' } });
            if (results.length === 0 || !('url' in results[0])) {
                await interaction.editReply('検索結果が見つかりませんでした。');
                return;
            }
            url = results[0].url as string;
            await interaction.editReply(`🔍 '${input}' の検索結果を再生キューに追加します: ${url}`);
        } catch (err) {
            console.error(err);
            await interaction.editReply('検索中にエラーが発生しました。');
            return;
        }
    }

    // URL が決定されたのでキューに追加
    const member = interaction.member as GuildMember;
    const sub = await getOrCreateSubscription(member);

    if (!sub) {
        await interaction.reply({ content: 'まずボイスチャンネルに参加してください。', ephemeral: true });
        return;
    }

    sub.enqueue({ url, requester: member.id });
    // もしまだ返信していなければ
    if (interaction.replied) {
        await interaction.followUp(`キューに追加しました: ${url}`);
    } else {
        await interaction.reply(`キューに追加しました: ${url}`);
    }
}

async function handleSkip(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const sub = subscriptions.get(member.guild.id);
    if (!sub) {
        await interaction.reply({ content: '再生キューがありません。', ephemeral: true });
        return;
    }
    sub.skip();
    await interaction.reply('⏭️ スキップしました');
}

async function handleStop(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const sub = subscriptions.get(member.guild.id);
    if (!sub) {
        await interaction.reply({ content: '何も再生していません。', ephemeral: true });
        return;
    }
    sub.stop();
    subscriptions.delete(member.guild.id);
    await interaction.reply('⏹️ 再生を停止しました');
}

async function handleQueue(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const sub = subscriptions.get(member.guild.id);
    if (!sub) {
        await interaction.reply({ content: 'キューは空です。', ephemeral: true });
        return;
    }

    const { current, upcoming } = sub.getQueue();
    let message = '';
    if (current) {
        message += `🎶 Now Playing:\n${current.url}\n`;
    } else {
        message += '⏸️ 再生中の曲はありません\n';
    }

    if (upcoming.length > 0) {
        message += '\n📜 Queue:\n';
        upcoming.slice(0, 10).forEach((s, i) => {
            message += `${i + 1}. ${s.url}\n`;
        });
        if (upcoming.length > 10) message += `…and ${upcoming.length - 10} more`;
    }

    await interaction.reply(message);
}

async function handlePlayTextCommand(message: Message, input: string) {
    if (!input) {
        await message.reply('再生したい URL または キーワードを入力してください。');
        return;
    }

    let url: string;
    if (ytdl.validateURL(input)) {
        url = input;
    } else {
        try {
            const results = await play.search(input, { limit: 1, source: { youtube: 'video' } });
            if (results.length === 0 || !('url' in results[0])) {
                await message.reply('検索結果が見つかりませんでした。');
                return;
            }
            url = results[0].url as string;
            await message.reply(`🔍 '${input}' の検索結果をキューに追加: ${url}`);
        } catch (err) {
            console.error(err);
            await message.reply('検索中にエラーが発生しました。');
            return;
        }
    }

    const member = message.member as GuildMember;
    if (!member.voice.channel) {
        await message.reply('まずボイスチャンネルに参加してください。');
        return;
    }

    const sub = await getOrCreateSubscription(member);
    if (!sub) {
        await message.reply('ボイスチャンネル接続に失敗しました。');
        return;
    }

    sub.enqueue({ url, requester: member.id });
    await message.reply(`キューに追加しました: ${url}`);
}

async function handleSkipTextCommand(message: Message) {
    const sub = subscriptions.get(message.guild!.id);
    if (!sub) {
        await message.reply('再生キューがありません。');
        return;
    }
    sub.skip();
    await message.reply('⏭️ スキップしました');
}

async function handleStopTextCommand(message: Message) {
    const sub = subscriptions.get(message.guild!.id);
    if (!sub) {
        await message.reply('何も再生していません。');
        return;
    }
    sub.stop();
    subscriptions.delete(message.guild!.id);
    await message.reply('⏹️ 再生を停止しました');
}

async function handleQueueTextCommand(message: Message) {
    const sub = subscriptions.get(message.guild!.id);
    if (!sub) {
        await message.reply('キューは空です。');
        return;
    }

    const { current, upcoming } = sub.getQueue();
    let msg = '';
    if (current) msg += `🎶 Now Playing:\n${current.url}\n`;
    else msg += '⏸️ 再生中の曲はありません\n';

    if (upcoming.length > 0) {
        msg += '\n📜 Queue:\n';
        upcoming.slice(0, 10).forEach((s, i) => {
            msg += `${i + 1}. ${s.url}\n`;
        });
        if (upcoming.length > 10) msg += `…and ${upcoming.length - 10} more`;
    }

    await message.reply(msg);
}

async function handleCleanTextCommand(message: Message) {
    if (!(message.channel instanceof TextChannel)) return;
    const count = await deleteBotMessages(message.channel);
    await message.reply(`🧹 メッセージ ${count} 件を削除しました。`);
}

async function handleClean(interaction: ChatInputCommandInteraction) {
    if (!interaction.channel || interaction.channel.isDMBased()) {
        await interaction.reply({ content: 'このコマンドはテキストチャンネルでのみ使用できます。', ephemeral: true });
        return;
    }
    const channel = interaction.channel as TextChannel;
    const count = await deleteBotMessages(channel);
    await interaction.reply(`🧹 メッセージ ${count} 件を削除しました。`);
}

async function handleHelpTextCommand(message: Message) {
    await message.reply(HELP_TEXT);
}

client.login(process.env.DISCORD_TOKEN);

async function deleteBotMessages(channel: TextChannel) {
    const messages = await channel.messages.fetch({ limit: 100 });
    const bots = messages.filter(m => m.author.id === client.user?.id);
    if (bots.size === 0) return 0;
    await channel.bulkDelete(bots, true);
    return bots.size;
}
