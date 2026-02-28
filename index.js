const { Client, GatewayIntentBits } = require("discord.js");
const { DisTube } = require("distube");
const { YtDlpPlugin } = require("@distube/yt-dlp");
const SpotifyWebApi = require("spotify-web-api-node");
const express = require("express");

const app = express();
app.get("/", (req, res) => {
  res.send("SamuPlay online 🎵");
});
app.listen(process.env.PORT || 3000);

// ===== DISCORD =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ]
});

// ===== DISTUBE =====
const distube = new DisTube(client, {
  plugins: [new YtDlpPlugin()]
});

// ===== SPOTIFY =====
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_ID,
  clientSecret: process.env.SPOTIFY_SECRET
});

async function getSpotifyToken() {
  const data = await spotifyApi.clientCredentialsGrant();
  spotifyApi.setAccessToken(data.body['access_token']);
}
getSpotifyToken();

// Atualiza token a cada 50 min
setInterval(getSpotifyToken, 1000 * 60 * 50);

client.on("ready", () => {
  console.log(`SamuPlay online como ${client.user.tag}`);
});

// ===== COMANDO !play =====
client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!play")) return;

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.reply("Entre em um canal de voz!");

  const args = message.content.split(" ").slice(1).join(" ");
  if (!args)
    return message.reply("Coloque o nome da música ou link!");

  // Se for link do YouTube
  if (args.includes("youtube.com") || args.includes("youtu.be")) {
    distube.play(voiceChannel, args, {
      textChannel: message.channel,
      member: message.member
    });
    return message.reply("🎵 Tocando pelo YouTube!");
  }

  // Se for nome → buscar no Spotify
  try {
    const result = await spotifyApi.searchTracks(args, { limit: 1 });

    if (!result.body.tracks.items.length)
      return message.reply("Música não encontrada no Spotify.");

    const track = result.body.tracks.items[0];
    const searchString = `${track.name} ${track.artists[0].name}`;

    message.reply(`🔎 Encontrado no Spotify: ${searchString}`);

    // Toca no YouTube usando nome encontrado
    distube.play(voiceChannel, searchString, {
      textChannel: message.channel,
      member: message.member
    });

  } catch (err) {
    console.error(err);
    message.reply("Erro ao buscar no Spotify.");
  }
});

client.login(process.env.TOKEN);
