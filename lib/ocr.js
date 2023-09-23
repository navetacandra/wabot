const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const { createWorker } = require("tesseract.js");

module.exports = {
  command: ["ocr", "itt"],
  /**
   *
   * @param {import("../utils/type").SimplifiedMessage} sock - WhatsApp socket
   * @param {import("../utils/type").SimplifiedMessage} m - Simplified WhatsApp message
   * @param {string[]} args - Splitted message text
   * @returns {Promise<any>}
   */
  exec: async (sock, m, args) => {
    let text = "";
    const ImageMediaMessageType = [
      "imageMessage",
      "viewOnceMessage",
      "viewOnceMessageV2",
      "viewOnceMessageV2Extension",
    ];
    const worker = await createWorker({ logger: (m) => m });
    await worker.loadLanguage("eng");
    await worker.initialize("eng");

    // Image from image url
    if (
      /^data:.*?\/.*?;base64,/i.test(args[0]) ||
      /^https?:\/\//.test(args[0])
    ) {
      const md = await sock.getFile(args[0]);
      if (!/image/.test(md.mime)) {
        return m.reply("URL yang dikirim, bukan gambar.");
      }
      text = (await worker.recognize(md.data)).data.text;
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
          return m.reply("Media tidak dapat di-rubah ke teks.");
        }
      }
      text = (await worker.recognize(await downloadMediaMessage(m, "buffer")))
        .data.text;
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
            Object.keys(_msg?.quotedMessage[messageType]?.message).includes(f),
          );

          if (!isViewOnceMessage) {
            return m.reply("Media tidak dapat di-rubah ke teks.");
          }
        }

        text = (
          await worker.recognize(await downloadMediaMessage(_qmsg, "buffer"))
        ).data.text;
      }
    }

    return m.reply(text);
  },
};
