require("dotenv").config();
const { proto, downloadMediaMessage } = require("@whiskeysockets/baileys");
const { default: OpenAI } = require("openai");
const { imagemagickConvertSupport } = require("../utils/bin_support");
const { convertToPNG } = require("../utils/simple");
const { imageSize: sizeOf } = require("image-size");
const { resolve, join } = require("path");
const { v4 } = require("uuid");
const { writeFileSync, createReadStream, unlinkSync } = require("fs");
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
      const ImageMediaMessageType = [
        "imageMessage",
        "viewOnceMessage",
        "viewOnceMessageV2",
        "viewOnceMessageV2Extension",
      ];
      let imageBuffer;

      // Image from image url
      if (
        /^data:.*?\/.*?;base64,/i.test(args[0]) ||
        /^https?:\/\//.test(args[0])
      ) {
        const md = await sock.getFile(args[0]);
        if (!/image/.test(md.mime)) {
          return m.reply("URL yang dikirim, bukan gambar.");
        }
        imageBuffer = md.data;
      }
      // Image from message
      else if (ImageMediaMessageType.some((type) => m?.message[type])) {
        const messageType = ImageMediaMessageType.find((f) =>
          Object.keys(m.message).includes(f),
        );
        const isViewOnce = messageType && messageType.startsWith("viewOnce");

        if (isViewOnce) {
          // ViewOnce check is not video message
          const isViewOnceImage = ImageMediaMessageType.find((f) =>
            Object.keys(m.message[messageType]?.message).includes(f),
          );

          if (!isViewOnceImage) {
            return m.reply("Media tidak dapat di-jadikan referensi.");
          }
        }
        imageBuffer = await downloadMediaMessage(m, "buffer");
      }
      // Image from quoted message
      else if (m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const _msg = m.message?.extendedTextMessage?.contextInfo;
        const _qmsg = await sock.store.loadMessage(
          m.key?.remoteJid,
          _msg?.stanzaId,
        );

        if (!_qmsg) {
          return m.reply("Chat tidak ditemukan pada history bot.");
        }

        const messageType = ImageMediaMessageType.find((f) =>
          Object.keys(_msg?.quotedMessage).includes(f),
        );

        if (messageType) {
          const isViewOnce = messageType.startsWith("viewOnce");

          if (isViewOnce) {
            const isViewOnceMessage = ImageMediaMessageType.find((f) =>
              Object.keys(_msg?.quotedMessage[messageType]?.message).includes(
                f,
              ),
            );

            if (!isViewOnceMessage) {
              return m.reply("Media tidak dapat di-jadikan referensi.");
            }
          }

          imageBuffer = await downloadMediaMessage(_qmsg, "buffer");
        }
      }

      if (!imageBuffer) {
        // Generate image using OpenAI
        const { data } = await openai.images.generate({
          prompt: args.join(" "),
          n: 2,
          size: "1024x1024",
          response_format: "url",
        });
        data.forEach((e, i) => {
          m.reply({ media: e.url }, { isMedia: true });
        });
        return;
      }

      // Process the image
      if (!(await imagemagickConvertSupport())) {
        return m.reply("Bot tidak support imagemagick.");
      }

      if (Buffer.byteLength(imageBuffer) > 4 * 1000 ** 2) {
        return m.reply("Ukuran file gambar terlalu besar.");
      }

      const { width, height, type } = sizeOf(imageBuffer);
      if (width !== height) {
        return m.reply("Rasio gambar harus 1:1.");
      }

      imageBuffer = await convertToPNG(imageBuffer, type);
      const tempFilename = resolve(
        join(__dirname, "..", "temp", `${Date.now()}_${v4()}.${"png"}`),
      );

      writeFileSync(tempFilename, imageBuffer);

      const { data } = await openai.images.createVariation({
        image: createReadStream(tempFilename),
        n: 2,
        size: "1024x1024",
        response_format: "url",
      });

      data.forEach((e, i) => {
        m.reply({ media: e.url }, { isMedia: true });
      });

      unlinkSync(tempFilename);
    } catch (err) {
      m.reply(
        `Terjadi kesalahan saat membuat gambar. Error: ${
          err.code || err.toString()
        } (${err.status || 0})`,
      );
    }
  },
};
