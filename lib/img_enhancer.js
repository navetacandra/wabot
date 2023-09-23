const { proto, downloadMediaMessage } = require("@whiskeysockets/baileys");
const { join, resolve } = require("path");
const { writeFileSync, unlinkSync, readFileSync } = require("fs");
const { v4 } = require("uuid");
const { imagemagickConvertSupport } = require("../utils/bin_support");
const { spawn } = require("child_process");

module.exports = {
  command: ["imgenhance", "sharpen"],
  /**
   *
   * @param {*} sock
   * @param {proto.IWebMessageInfo} m
   * @param {String[]} args
   */
  exec: async (sock, m, args) => {
    let imageBuffer;
    const ImageMediaMessageType = [
      "imageMessage",
      "viewOnceMessage",
      "viewOnceMessageV2",
      "viewOnceMessageV2Extension",
    ];

    if (!(await imagemagickConvertSupport()))
      return m.reply("Bot tidak support imagemagick.");

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

    if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
      return m.reply("Gambar tidak ditemukan.");
    }

    const ext = (await sock.getFile(imageBuffer)).ext;
    const fileInput = resolve(
      join(__dirname, "..", "temp", `${Date.now()}_${v4()}.${ext}`)
    );
    const fileOutput = resolve(
      join(__dirname, "..", "temp", `${Date.now()}_${v4()}.${ext}`)
    );

    writeFileSync(fileInput, imageBuffer);

    const convert = spawn("convert", [
      fileInput,
      "-auto-gamma",
      "-auto-level",
      "-normalize",
      "-colorspace",
      "sRGB",
      "-unsharp",
      "0x1",
      "-adaptive-resize",
      "2048x1080^",
      "-filter",
      "Lanczos",
      "-define",
      "filter:blur=0.25",
      "-quality",
      "95",
      "-density",
      "300%",
      fileOutput,
    ]);

    convert.on("error", (err) => {
      console.log(err);
      return m.reply(`Terjadi kesalahan. Error: ${err.toString()}`);
    });
    convert.on("close", (code) => {
      if (code != 0) return m.reply(`Terjadi kesalahan. Error: ${code}`);
      m.reply({ media: readFileSync(fileOutput), filename: `Enhance_${v4}.${ext}` }, { isMedia: true });
      unlinkSync(fileInput);
      unlinkSync(fileOutput);
    });
  },
};
