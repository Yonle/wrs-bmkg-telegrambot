const { inspect } = require("util");
const slimbot = require("slimbot");
const miniget = require("miniget");
const wrs = require("wrs-bmkg")();

wrs.recvWarn = 0;
require("dotenv").config();
const bot = new slimbot(process.env.BOT_TOKEN);
const subscriber = [];

bot.on("message", async (message) => {
  if (!message.text || !message.text.startsWith("/start")) return;
  if (!subscriber.includes(message.chat.id)) subscriber.push(message.chat.id);
  await bot.sendPhoto(
    message.chat.id,
    `https://data.bmkg.go.id/DataMKG/TEWS/${wrs.lastAlert.info.shakemap}`,
    {
      caption: `*ℹ️${wrs.lastAlert.info.subject}*\n\n${wrs.lastAlert.info.description}\n\n${wrs.lastAlert.info.headline}\n\n⚠️${wrs.lastAlert.info.instruction}`,
      parse_mode: "Markdown",
    }
  );
  let text = "*ℹ️Informasi Gempa Bumi Terkini*";
  text += `\nWaktu: ${new Date(
    wrs.lastRealtimeQL.properties.time
  ).toLocaleString("en-US", { timeZone: "Asia/Jakarta" })}`;
  text += `\nMagnitude: ${wrs.lastRealtimeQL.properties.mag} M`;
  text += `\nFase: ${wrs.lastRealtimeQL.properties.fase}`;
  text += `\nStatus: ${wrs.lastRealtimeQL.properties.status}`;
  text += `\nKedalaman: ${Math.floor(wrs.lastRealtimeQL.properties.depth)} KM`;
  let locationMessage = await bot.sendVenue(
    message.chat.id,
    wrs.lastRealtimeQL.geometry.coordinates[1],
    wrs.lastRealtimeQL.geometry.coordinates[0],
    "Lokasi Gempa Bumi Terkini",
    wrs.lastRealtimeQL.properties.place
  );
  await bot.sendMessage(message.chat.id, text, {
    parse_mode: "Markdown",
    reply_to_message_id: locationMessage.result.message_id,
  });
});

wrs.on("Gempabumi", (msg) => {
  if (wrs.recvWarn !== 2) return wrs.recvWarn++;
  let text = `ℹ️*${msg.subject}*`;
  text += `\n\n${msg.description}\n\n${msg.headline}`;
  subscriber.forEach(async (id) => {
    await bot.sendPhoto(
      id,
      `https://data.bmkg.go.id/DataMKG/TEWS/${msg.shakemap}`,
      {
        caption: `*ℹ️${msg.subject}*\n\n${msg.description}\n\n${msg.headline}\n\n⚠️${msg.instruction}`,
        parse_mode: "Markdown",
      }
    );
  });
});

wrs.on("realtime", (msg) => {
  if (wrs.recvWarn !== 2) return wrs.recvWarn++;
  let text = "*ℹ️Informasi Gempa Bumi Terkini*";
  text += `\nWaktu: ${new Date(msg.properties.time).toLocaleString("en-US", {
    timeZone: "Asia/Jakarta",
  })}`;
  text += `\nMagnitude: ${msg.properties.mag} M`;
  text += `\nFase: ${msg.properties.fase}`;
  text += `\nStatus: ${msg.properties.status}`;
  text += `\nKedalaman: ${Math.floor(msg.properties.depth)} KM`;

  subscriber.forEach(async (id) => {
    let locationMessage = await bot.sendVenue(
      id,
      msg.geometry.coordinates[1],
      msg.geometry.coordinates[0],
      "Lokasi Gempa Bumi Terkini",
      wrs.lastRealtimeQL.properties.place
    );
    await bot.sendMessage(id, text, {
      parse_mode: "Markdown",
      reply_to_message_id: locationMessage.result.message_id,
    });
  });
});

wrs.startPolling();

console.log("Bot is starting now. You may sent a message than waiting a ready message appear.");
bot.startPolling().then(() => console.log("I'm ready to receive WRS-BMKG Warnings."));

process.on("unhandledRejection", console.error);
