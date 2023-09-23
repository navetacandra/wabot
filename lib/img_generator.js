require("dotenv").config();
const { proto, downloadMediaMessage } = require("@whiskeysockets/baileys");
const { default: OpenAI } = require("openai");
const { imagemagickConvertSupport } = require("../utils/bin_support");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_APIKEY,
});

module.exports = {
  command: ["img", "imggen", "imggenerator"],
  /**
   *
   * @param {*} sock
   * @param {proto.IWebMessageInfo} m
   * @param {String[]} args
   */
  exec: async (sock, m, args) => {
    try {
      let imageBuffer;
      const ImageMediaMessageType = [
        "imageMessage",
        "viewOnceMessage",
        "viewOnceMessageV2",
        "viewOnceMessageV2Extension",
      ];

      // Image from image url
      if (
        /^data:.*?\/.*?;base64,/i.test(args[0]) ||
        /^https?:\/\//.test(args[0])
      ) {
        const md = await sock.getFile(args[0]);
        if (!/image/.test(md.mime))
          return m.reply("URL yang dikirim, bukan gambar.");
        imageBuffer = md.data;
      }
      // Image from message
      else if (
        ImageMediaMessageType.filter((f) => Object.keys(m.message).includes(f))
          .length
      ) {
        const messageType = ImageMediaMessageType.filter((f) =>
          Object.keys(m.message).includes(f)
        )[0];
        const isViewOnce = messageType.startsWith("viewOnce");
        if (!isViewOnce) {
          imageBuffer = await downloadMediaMessage(m, "buffer");
        } else {
          // ViewOnce check is not video message
          const messageTypeViewOnce = ImageMediaMessageType.filter((f) =>
            Object.keys(m.message[messageType]?.message).includes(f)
          )[0];
          if (!messageTypeViewOnce) {
            return m.reply("Media tidak dapat di-ubah ke teks.");
          }
          imageBuffer = await downloadMediaMessage(m, "buffer");
        }
      }
      // Image from quoted message
      else if (m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const _msg = m.message?.extendedTextMessage?.contextInfo;
        // Fetch quoted message
        const _qmsg = await sock.store.loadMessage(
          m.key?.remoteJid,
          _msg?.stanzaId
        );
        // Quoted message not found in store
        if (!_qmsg) return m.reply("Chat tidak ditemukan pada history bot.");

        if (
          ImageMediaMessageType.filter((f) =>
            Object.keys(_msg?.quotedMessage).includes(f)
          ).length
        ) {
          const messageType = ImageMediaMessageType.filter((f) =>
            Object.keys(_msg?.quotedMessage).includes(f)
          )[0];
          const isViewOnce = messageType.startsWith("viewOnce");
          if (!isViewOnce) {
            imageBuffer = await downloadMediaMessage(_qmsg, "buffer");
          } else {
            // ViewOnce check is not video message
            const messageTypeViewOnce = ImageMediaMessageType.filter((f) =>
              Object.keys(_msg?.quotedMessage[messageType]?.message).includes(f)
            )[0];
            if (!messageTypeViewOnce) {
              return m.reply("Media tidak dapat di-ubah ke teks.");
            }
            imageBuffer = await downloadMediaMessage(_qmsg, "buffer");
          }
        }
      }

      if (imageBuffer) {
        if (!(await imagemagickConvertSupport())) {
          return m.reply("Bot tidak support imagemagick.");
        }
        console.log("generate");
        return;
      }

      const { data } = await openai.images.generate({
        prompt: args.join(" "),
        n: 2,
        size: "512x512",
        response_format: "url",
      });
      data.forEach((e, i) => {
        m.reply({ media: e.url }, { isMedia: true });
      });
    } catch (err) {
      m.reply(
        `Terjadi kesalahan saat membuat gambar. Error: ${
          err.code || err.toString()
        } (${err.status || 0})`
      );
    }
  },
};
