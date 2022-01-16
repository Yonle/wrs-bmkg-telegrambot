const { inspect } = require("util");
const grammy = require("grammy");
const get = require("miniget");
const wrs = require("wrs-bmkg")();

wrs.recvWarn = 0;
require("dotenv").config();
const bot = new grammy.Bot(process.env.BOT_TOKEN);
const subscriber = [];

bot.command("start", async (ctx) => {
  if (!subscriber.includes(ctx.message.chat.id))
    subscriber.push(ctx.message.chat.id);
  bot.api.sendChatAction(ctx.message.chat.id, "upload_photo");
  await ctx.replyWithPhoto(
    new grammy.InputFile(
      get(
        `https://bmkg-content-inatews.storage.googleapis.com/${wrs.lastAlert.info.shakemap}`
      )
    ),
    {
      caption: `*${wrs.lastAlert.info.subject}*\n\n${wrs.lastAlert.info.description}\n\n${wrs.lastAlert.info.headline}\n\nGempa ini dirasakan di ${wrs.lastAlert.info.felt}.\n\n${wrs.lastAlert.info.area}\n\n${wrs.lastAlert.info.potential}\n\n${wrs.lastAlert.info.instruction}`,
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
  let text = `*${wrs.lastRealtimeQL.properties.place}*\``;
  text += `\nTanggal   : ${new Date(
    wrs.lastRealtimeQL.properties.time
  ).toLocaleDateString("id")}`;
  text += `\nWaktu     : ${new Date(
    wrs.lastRealtimeQL.properties.time
  ).toLocaleTimeString("us", {
    timeZone: "Asia/Jakarta",
  })} (WIB)`;
  text += `\nMagnitude : M ${Number(wrs.lastRealtimeQL.properties.mag).toFixed(
    2
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
    Number(wrs.lastRealtimeQL.properties.mag).toFixed(2) +
      " M, " +
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
  let text = `*${msg.subject}*\n\n${msg.description}\n\n${msg.headline}\n\nGempa ini dirasakan di ${msg.felt}.\n\n${msg.area}\n\n${msg.potential}\n\n${msg.instruction}`;
  subscriber.forEach(async (id) => {
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
  text += `\nMagnitude : M ${Number(msg.properties.mag).toFixed(2)}`;
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
      Number(msg.properties.mag).toFixed(2) +
        " M, " +
        new Date(msg.properties.time).toLocaleTimeString("us", {
          timeZone: "Asia/Jakarta",
        }) +
        " (WIB)"
    );
    await bot.api.sendMessage(id, text, {
      parse_mode: "Markdown",
      reply_to_message_id: locationMessage.message_id,
    });
    if (Number(msg.properties.mag) >= 7)
      ctx.reply(
        "`" +
          `
    !!! PERINGATAN !!!
    Gempa berskala M >= 7 SR. Gempa bisa saja berpotensi Tsunami. Masyarakat sekitar dihimbau untuk tetap waspada dan ikuti himbauan petugas
    `,
        { parse_mode: "Markdown" }
      );
  });
});

wrs.startPolling();

bot.start();
bot.api
  .getMe()
  .then(({ username }) => console.log(`Berhasil masuk sebagai @${username}`));
bot.catch((e) => console.error(e));
process.on("unhandledRejection", console.error);
