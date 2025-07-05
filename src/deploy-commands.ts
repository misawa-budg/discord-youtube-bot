import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { config } from 'dotenv';

config();

const commands = [
    new SlashCommandBuilder()
        .setName('music')
        .setDescription('指定されたYouTubeのURL再生')
        .addStringOption(option =>
            option.setName('input')
                .setDescription('YouTubeのURL または 検索キーワード')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('skip')
        .setDescription('現在の曲をスキップ'),
    new SlashCommandBuilder()
        .setName('stop')
        .setDescription('再生を停止し接続を切断'),
    new SlashCommandBuilder()
        .setName('queue')
        .setDescription('現在のキューを表示'),
    new SlashCommandBuilder()
        .setName('clean')
        .setDescription('Botのメッセージを一括削除'),
].map(command => command.toJSON());

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
    throw new Error('DISCORD_TOKEN or CLIENT_ID or GUILD_ID is not set in .env file');
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('スラッシュコマンドの登録開始');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log('スラッシュコマンドの登録完了');
    } catch (error) {
        console.error(error);
    }
})();
