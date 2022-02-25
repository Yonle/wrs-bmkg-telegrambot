const { inspect } = require("util");
const grammy = require("grammy");
const get = require("miniget");
const wrs = require("wrs-bmkg")();

wrs.recvWarn = 0;
require("dotenv").config();
const bot = new grammy.Bot(process.env.BOT_TOKEN);
const subscriber = [];

async function sendWarning(msg, id, t = 3000) {
  try {
    await bot.api.sendPhoto(
      id,
      new grammy.InputFile(
        get(
          `https://bmkg-content-inatews.storage.googleapis.com/${msg.shakemap}`
        )
      ),
      {
        caption: text,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Buka WRS-BMKG",
                url: "https://warning.bmkg.go.id",
              },
            ],
          ],
        },
      }
    );
  } catch (e) {
    console.error(e);
    setTimeout(async (_) => await sendWarning(msg, id, t + 1000), t);
  }
}

bot.command("start", async (ctx) => {
  if (!subscriber.includes(ctx.message.chat.id))
    subscriber.push(ctx.message.chat.id);
  await ctx.reply(wrs.lastAlert.info.headline);
  bot.api.sendChatAction(ctx.message.chat.id, "upload_photo");
  await sendWarning(ctx.message.chat.id, wrs.lastAlert.info);
  let text = `*${wrs.lastRealtimeQL.properties.place}*\``;
  text += `\nTanggal   : ${new Date(
    wrs.lastRealtimeQL.properties.time
  ).toLocaleDateString("id")}`;
  text += `\nWaktu     : ${new Date(
    wrs.lastRealtimeQL.properties.time
  ).toLocaleTimeString("us", {
    timeZone: "Asia/Jakarta",
  })} (WIB)`;
  text += `\nMagnitude : M${Number(wrs.lastRealtimeQL.properties.mag).toFixed(
    1
  )}`;
  text += `\nFase      : ${wrs.lastRealtimeQL.properties.fase}`;
  text += `\nStatus    : ${wrs.lastRealtimeQL.properties.status}`;
  text += `\nKedalaman : ${Math.floor(
    wrs.lastRealtimeQL.properties.depth
  )} KM\``;
  if (Number(wrs.lastRealtimeQL.properties.mag) >= 5)
    text += "\n\n<!> Peringatan: Gempa berskala M >= 5";
  else if (Number(wrs.lastRealtimeQL.properties.mag) >= 7)
    text += "\n\n<!!!> Peringatan: Gempa berskala M >= 7";
  let locationMessage = await bot.api.sendVenue(
    ctx.message.chat.id,
    wrs.lastRealtimeQL.geometry.coordinates[1],
    wrs.lastRealtimeQL.geometry.coordinates[0],
    wrs.lastRealtimeQL.properties.place,
    "M" +
      Number(wrs.lastRealtimeQL.properties.mag).toFixed(1) +
      ", " +
      new Date(wrs.lastRealtimeQL.properties.time).toLocaleTimeString("us", {
        timeZone: "Asia/Jakarta",
      }) +
      " (WIB)"
  );
  await ctx.reply(text, {
    parse_mode: "Markdown",
    reply_to_message_id: locationMessage.message_id,
  });
});

wrs.on("Gempabumi", (msg) => {
  if (wrs.recvWarn !== 2) return wrs.recvWarn++;
  let text = `*${msg.subject}*\n\n${msg.description}\n\n${msg.potential}\n\n${msg.instruction}`;
  subscriber.forEach(async (id) => {
    await bot.api.sendMessage(id, msg.headline);
  });
});

wrs.on("realtime", (msg) => {
  if (wrs.recvWarn !== 2) return wrs.recvWarn++;
  let text = `*${wrs.lastRealtimeQL.properties.place}*\``;
  text += `\nTanggal   : ${new Date(msg.properties.time).toLocaleDateString(
    "id"
  )}`;
  text += `\nWaktu     : ${new Date(msg.properties.time).toLocaleTimeString(
    "us",
    {
      timeZone: "Asia/Jakarta",
    }
  )} (WIB)`;
  text += `\nMagnitude : M${Number(msg.properties.mag).toFixed(1)}`;
  text += `\nFase      : ${msg.properties.fase}`;
  text += `\nStatus    : ${msg.properties.status}`;
  text += `\nKedalaman : ${Math.floor(msg.properties.depth)} KM\``;
  if (Number(msg.properties.mag) >= 5)
    text += "\n\n<!> Peringatan: Gempa berskala M >= 5";
  else if (Number(msg.properties.mag) >= 7)
    text += "\n\n<!!!> Peringatan: Gempa berskala M >= 7";

  subscriber.forEach(async (id) => {
    let locationMessage = await bot.api.sendVenue(
      id,
      msg.geometry.coordinates[1],
      msg.geometry.coordinates[0],
      wrs.lastRealtimeQL.properties.place,
      "M" +
        Number(msg.properties.mag).toFixed(1) +
        ", " +
        new Date(msg.properties.time).toLocaleTimeString("us", {
          timeZone: "Asia/Jakarta",
        }) +
        " (WIB)"
    );
    await bot.api.sendMessage(id, text, {
      parse_mode: "Markdown",
      reply_to_message_id: locationMessage.message_id,
    });
  });
});

wrs.on("error", (err) => {
  console.error(err);
  wrs.startPolling();
});
wrs.startPolling();

bot.start();
bot.api
  .getMe()
  .then(({ username }) => console.log(`Berhasil masuk sebagai @${username}`));
bot.catch((e) => console.error(e));
process.on("unhandledRejection", console.error);
