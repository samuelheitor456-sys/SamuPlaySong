const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const { DisTube } = require("distube");
const { YtDlpPlugin } = require("@distube/yt-dlp");
const SpotifyWebApi = require("spotify-web-api-node");
const express = require("express");

const app = express();
app.get("/", (req, res) => res.send("SamuPlay online 🎵"));
app.listen(process.env.PORT || 3000);

// ====== Discord Client ======
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ]
});

// ====== Distube ======
const distube = new DisTube(client, {
  plugins: [new YtDlpPlugin()]
});

// ====== Spotify ======
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_ID,
  clientSecret: process.env.SPOTIFY_SECRET
});

async function getSpotifyToken() {
  const data = await spotifyApi.clientCredentialsGrant();
  spotifyApi.setAccessToken(data.body["access_token"]);
}
getSpotifyToken();
setInterval(getSpotifyToken, 1000 * 60 * 50); // Atualiza token a cada 50 min

// ====== Ready ======
client.once("ready", () => {
  console.log(`SamuPlay online como ${client.user.tag}`);
});

// ====== Comando !play ======
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!")) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "play") {
    const query = args.join(" ");
    if (!query) return message.reply("Coloque o nome da música ou link!");

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply("Entre em um canal de voz primeiro!");

    // Link do YouTube
    if (query.includes("youtube.com") || query.includes("youtu.be")) {
      distube.play(voiceChannel, query, { textChannel: message.channel, member: message.member });
      return message.reply(`🎵 Tocando pelo YouTube: ${query}`);
    }

    // Busca no Spotify
    try {
      const result = await spotifyApi.searchTracks(query, { limit: 1 });
      if (!result.body.tracks.items.length) return message.reply("Música não encontrada no Spotify.");

      const track = result.body.tracks.items[0];
      const searchString = `${track.name} ${track.artists[0].name}`;

      message.reply(`🔎 Encontrado no Spotify: ${track.name} - ${track.artists[0].name}`);

      // Toca no YouTube
      distube.play(voiceChannel, searchString, { textChannel: message.channel, member: message.member });

    } catch (err) {
      console.error(err);
      message.reply("Erro ao buscar no Spotify.");
    }
  }
});

// ====== Distube Events (opcional para feedback) ======
distube.on("playSong", (queue, song) => {
  const embed = new EmbedBuilder()
    .setTitle("🎶 Tocando agora")
    .setDescription(`[${song.name}](${song.url})`)
    .addFields({ name: "Pedido por", value: `${song.user}`, inline: true })
    .setThumbnail(song.thumbnail)
    .setColor("Random");
  queue.textChannel.send({ embeds: [embed] });
});

distube.on("addSong", (queue, song) => {
  queue.textChannel.send(`➕ Adicionada à fila: **${song.name}**`);
});

client.login(process.env.TOKEN);
