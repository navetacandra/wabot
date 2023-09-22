require("dotenv").config();
const { proto } = require("@whiskeysockets/baileys");
const { writeFileSync } = require("fs");
const { default: OpenAI } = require("openai");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_APIKEY,
});

module.exports = {
  command: /img(gen)?/,
  /**
   *
   * @param {*} sock
   * @param {proto.IWebMessageInfo} m
   * @param {String[]} args
   */
  exec: async (sock, m, args) => {
    try {
      const { data } = await openai.images.generate({
        prompt: args.join(" "),
        n: 1,
        size: "512x512",
        response_format: "url",
      });
      m.reply({ media: data[0].url }, { isMedia: true });
    } catch (err) {
      console.log(err);
      m.reply(
        `Terjadi kesalahan saat membuat gambar. Error: ${
          err.code || err.toString()
        } (${err.status || 0})`
      );
    }
  },
};
