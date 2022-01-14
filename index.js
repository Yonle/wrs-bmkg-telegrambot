const { inspect } = require("util");
const grammy = require("grammy");
const get = require("miniget");
const wrs = require("wrs-bmkg")();

wrs.recvWarn = 0;
require("dotenv").config();
const bot = new grammy.Bot(process.env.BOT_TOKEN);
const subscriber = [];

bot.command("start", async ctx => {
  if (!subscriber.includes(ctx.message.chat.id)) subscriber.push(ctx.message.chat.id);
  bot.api.sendChatAction(ctx.message.chat.id, "upload_photo");
  await ctx.replyWithPhoto(new grammy.InputFile(
    get(`https://data.bmkg.go.id/DataMKG/TEWS/${wrs.lastAlert.info.shakemap}`)),
    {
      caption: `*${wrs.lastAlert.info.subject}*\n\n${wrs.lastAlert.info.description}\n\n${wrs.lastAlert.info.headline}\n\n⚠️${wrs.lastAlert.info.instruction}`,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{
          text: "Buka WRS-BMKG",
	  url: "https://warning.bmkg.go.id"
	}]]
      }
    }
  );
  let text = `*${wrs.lastRealtimeQL.properties.place}*\``
  text += `\nWaktu     : ${new Date(
    wrs.lastRealtimeQL.properties.time
  ).toLocaleTimeString("us", { timeZone: "Asia/Jakarta" })}`;
  text += `\nMagnitude : ${Number(wrs.lastRealtimeQL.properties.mag).toFixed(2)} M`;
  text += `\nFase      : ${wrs.lastRealtimeQL.properties.fase}`;
  text += `\nStatus    : ${wrs.lastRealtimeQL.properties.status}`;
  text += `\nKedalaman : ${Math.floor(wrs.lastRealtimeQL.properties.depth)} KM\``;
  let locationMessage = await bot.api.sendVenue(
    ctx.message.chat.id,
    wrs.lastRealtimeQL.geometry.coordinates[1],
    wrs.lastRealtimeQL.geometry.coordinates[0],
    wrs.lastRealtimeQL.properties.place,
    Number(wrs.lastRealtimeQL.properties.mag).toFixed(2) + " M, " + new Date(wrs.lastRealtimeQL.properties.mag).toLocaleDateString("id", { timeZone: "Asia/Jakarta" }) + " (WIB)"
  );
  await ctx.reply(text, {
    parse_mode: "Markdown",
    reply_to_message_id: locationMessage.message_id,
  });
});

wrs.on("Gempabumi", (msg) => {
  if (wrs.recvWarn !== 2) return wrs.recvWarn++;
  let text = `*${msg.subject}*`;
  text += `\n\n${msg.description}\n\n${msg.headline}`;
  subscriber.forEach(async (id) => {
    await bot.api.sendPhoto(
      id,
      new grammy.InputFile(
	      get(`https://data.bmkg.go.id/DataMKG/TEWS/${msg.shakemap}`)
	),
      {
        caption: `*${msg.subject}*\n\n${msg.description}\n\n${msg.headline}\n\n*${msg.instruction}*`,
        parse_mode: "Markdown",
	reply_markup: {
          inline_keyboard: [[{
	    text: "Buka WRS-BMKG",
            url: "https://warning.bmkg.go.id"
          }]]
        }
      }
    );
  });
});

wrs.on("realtime", (msg) => {
  if (wrs.recvWarn !== 2) return wrs.recvWarn++;
  let text = `*${wrs.lastRealtimeQL.properties.place}*\``
  text += `\nTanggal   : ${new Date(msg.properties.time).toLocaleDateString("id", {
    timeZone: "Asia/Jakarta",
  })}`;
  text += `\nMagnitude : ${Number(msg.properties.mag).toFixed(2)} M`;
  text += `\nFase      : ${msg.properties.fase}`;
  text += `\nStatus    : ${msg.properties.status}`;
  text += `\nKedalaman : ${Math.floor(msg.properties.depth)} KM\``;

  subscriber.forEach(async (id) => {
    let locationMessage = await bot.api.sendVenue(
      id,
      msg.geometry.coordinates[1],
      msg.geometry.coordinates[0],
      wrs.lastRealtimeQL.properties.place,
      Number(msg.properties.mag).toFixed(2) + " M, " + new Date(msg.properties.time).toLocaleTimeString("us", { timeZone: "Asia/Jakarta" }) + " (WIB)"
    );
    await bot.api.sendMessage(id, text, {
      parse_mode: "Markdown",
      reply_to_message_id: locationMessage.message_id,
    });
  });
});

wrs.startPolling();

bot.start()
bot.api.getMe().then(({ username }) => console.log(`Berhasil masuk sebagai @${username}`));
bot.catch(e => console.error(e));
process.on("unhandledRejection", console.error);
