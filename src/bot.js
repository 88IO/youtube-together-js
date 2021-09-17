const { Client, Intents, MessageActionRow, MessageButton, VoiceChannel } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const youtubeId = require('./app_ids.json').youtube;
require('dotenv').config();

const { clientId, token } = process.env;

// クライアント生成
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
const rest = new REST({ version: '9' }).setToken(token);

// グローバルコマンド定義
const commands = [
    new SlashCommandBuilder()
          .setName('youtube')
          .setDescription('invite youtube together')
          .addIntegerOption(option =>
              option.setName("max_age")
                  .setDescription("招待期限（時間）"))
          .addIntegerOption(option =>
              option.setName("max_uses")
                  .setDescription("招待人数（人）"))
].map(command => command.toJSON());

// グローバルコマンド登録
(async () => {
  	try {
	    	await rest.put(
			      Routes.applicationCommands(clientId),
			      { body: commands },
		    );

		    console.log('Successfully registered application commands.');
	  } catch (error) {
		    console.error(error);
	  }
})();

// 待機用
const wait = require('util').promisify(setTimeout);

// スラッシュコマンド応答
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    // YouTubeコマンド
    if (interaction.commandName === 'youtube') {
        // ボイスチャンネルに不参加の場合はパス
        if (interaction.member.voice.channel == null) {
            await interaction.reply({ content: "You need to be on the voice channel.", ephemeral: true });
            return;
        }

        // 使用するボイスチャンネルまたコマンドオプション
        const voiceChannelId = interaction.member.voice.channel.id;
        //const max_age = interaction.options.getInteger('max_age');
        const max_age = 0.01;
        const max_uses = interaction.options.getInteger('max_uses');
        let inviteURL;

        // YouTube-Togetherの招待リンクのリクエスト
        try {
            await rest.post(
                `/channels/${voiceChannelId}/invites`, {
                body: {
                    max_age: max_age * 3600,
                    max_uses: max_uses,
                    target_application_id: youtubeId,
                    target_type: 2,
                    temporary: false,
                    validate: null,
                }
            }
        )
            .then((invite) => {
                if (invite.error || !invite.code) throw new Error('An error occured while retrieving data !');
                if (Number(invite.code) === 50013) console.warn('Your bot lacks permissions to perform that action');
                inviteURL = `https://discord.com/invite/${invite.code}`;
            });
        } catch (error) {
            console.log(error);
        }

        const button =  new MessageButton()
                            .setLabel(" Join YouTube Together")
                            .setStyle('LINK')
                            .setURL(inviteURL)
                            .setEmoji("\u25B6\uFE0F");

        await interaction.reply({
            content: (max_age ? (new Date(Date.now() + max_age * 3600000)).toLocaleString() : "期限なし")
                      + (max_uses ? ` @ ${max_uses}人` : " @ 無制限"),
            components: [new MessageActionRow().addComponents(button)] });

        // 無期限の場合は終了
        if (!max_age)  return;

        // 期限まで待機
        await wait(max_age * 3600000);

        // ボタンを無効化
        button.setDisabled(true);
        await interaction.editReply({
            components: [new MessageActionRow().addComponents(button)] });
    }
});

client.login(token);
