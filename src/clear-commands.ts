import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';

config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID; // optional

if (!token || !clientId) {
    throw new Error('DISCORD_TOKEN or CLIENT_ID is not set');
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        if (guildId) {
            console.log('⌫ Deleting all guild commands...');
            await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
            console.log('✔ Guild commands deleted');
        }

        console.log('⌫ Deleting all global commands...');
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        console.log('✔ Global commands deleted');
    } catch (error) {
        console.error(error);
    }
})();
