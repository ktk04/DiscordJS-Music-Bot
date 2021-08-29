const Discord = require("discord.js");
const { prefix, token } = require("./config.json");
const ytdl = require("ytdl-core");
const yts = require("yt-search");
const client = new Discord.Client();
const queue = new Map();
client.once("ready", () => {
  console.log("Ready!");
});

client.once("reconnecting", () => {
  console.log("Reconnecting!");
});

client.once("disconnect", () => {
  console.log("Disconnect!");
});

client.on("message", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const serverQueue = queue.get(message.guild.id);

  if (message.content.startsWith(`${prefix}play`)) {
    execute(message, serverQueue);
    message.react('👍');
    return;
  } else if (message.content.startsWith(`${prefix}skip`)) {
    skip(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}stop`)) {
    stop(message, serverQueue);
    message.react('⏹️');
    message.react('👋');
    return;
  } else if (message.content.startsWith(`${prefix}pause`)) {
    {
     pause(message, serverQueue);
     message.react('⏸️');
    }
    return;
  } else if (message.content.startsWith(`${prefix}resume`)) {
    resume(message, serverQueue);
    message.react('▶️');
    return;
  }else {
    message.channel.send("Not a Valid Command");
    message.react('❌');
  }
});

async function execute(message, serverQueue) {
  const args = message.content.split(" ");
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "Please join the VC to play music"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "I need the permissions to join and speak in your voice channel!"
    );
  }
  let song;
  if (ytdl.validateURL(args[1])) {
    const songDetails = await ytdl.getInfo(args[1]);
    song = {
      title: songDetails.title,
      url: songDetails.video_url
    };
  } else {
    const {videos} = await yts(args.slice(1).join(" "));
    if (!videos.length) return message.channel.send("No songs were found!");
    song = {
      title: videos[0].title,
      url: videos[0].url
    };
  }
  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };
    queue.set(message.guild.id, queueContruct);
    queueContruct.songs.push(song);
    try {
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      play(message.guild, queueContruct.songs[0]);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`**${song.title}**: Added to the queue! by {${message.author}}`);
  }
}
function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  if (!serverQueue)
    return message.channel.send("There is no song that I could skip!");
  serverQueue.connection.dispatcher.end();
}
function pause(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  if (!serverQueue)
    return message.channel.send("There is no song that I could skip!");
  serverQueue.connection.dispatcher.pause();
}
function resume(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  if (!serverQueue)
    return message.channel.send("There is no song that I could resume!");
  serverQueue.connection.dispatcher.resume();
}
function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
    
  if (!serverQueue)
    return message.channel.send("There is no song that I could stop!");
      serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}
function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    if(serverQueue.songs.length == 0) {
      serverQueue.leaveTimer = setTimeout(function() {
        leave_with_timeout(guild.id);
      }, 30* 1000);
    }
    return;
  }
  try {
    clearTimeout(serverQueue.leaveTimer);
  } catch(e) {
  }
  const dispatcher = serverQueue.connection
    .play(ytdl(song.url))
    .on("finish", () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`Started playing: **${song.title}**.` );
}
function leave_with_timeout(guild_id) {
  const serverQueue = queue.get(guild_id);
  if(serverQueue) {
    serverQueue.textChannel.send(`Left VC due to inactivity. Bye!`);
    serverQueue.voiceChannel.leave();
    queue.delete(guild_id);
  }
}
client.login(token);