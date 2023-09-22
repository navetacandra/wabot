const { proto, downloadMediaMessage } = require("@whiskeysockets/baileys");
const { createWorker } = require("tesseract.js");

module.exports = {
  command: ["ocr", "itt"],
  /**
   *
   * @param {*} sock
   * @param {proto.IWebMessageInfo} m
   * @param {String[]} args
   */
  exec: async (sock, m, args) => {
    let text = "";
    const MediaMessageType = [
      "imageMessage",
      "viewOnceMessage",
      "viewOnceMessageV2",
      "viewOnceMessageV2Extension",
    ];
    const worker = await createWorker({ logger: (m) => m });
    await worker.loadLanguage("eng");
    await worker.initialize("eng");

    // OCR from image url
    if (
      /^data:.*?\/.*?;base64,/i.test(args[0]) ||
      /^https?:\/\//.test(args[0])
    ) {
      text = await (
        await worker.recognize((await sock.getFile(args[0])).data)
      ).data.text;
    }
    // OCR from image message
    else if (
      MediaMessageType.filter((f) => Object.keys(m.message).includes(f)).length
    ) {
      const messageType = MediaMessageType.filter((f) =>
        Object.keys(m.message).includes(f),
      )[0];
      const isViewOnce = messageType.startsWith("viewOnce");
      if (!isViewOnce) {
        text = await (
          await worker.recognize(
            (await downloadMediaMessage(m, "buffer")).buffer,
          )
        ).data.text;
      } else {
        // ViewOnce check is not video message
        const messageTypeViewOnce = MediaMessageType.filter((f) =>
          Object.keys(m.message[messageType]?.message).includes(f),
        )[0];
        if (!messageTypeViewOnce) {
          return m.reply("Media tidak dapat di-ubah ke teks.");
        }
        text = await (
          await worker.recognize(
            (await downloadMediaMessage(m, "buffer")).buffer,
          )
        ).data.text;
      }
    }
    // OCR from quoted message
    else if (m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      const _msg = m.message?.extendedTextMessage?.contextInfo;
      // Fetch quoted message
      const _qmsg = await sock.store.loadMessage(
        m.key?.remoteJid,
        _msg?.stanzaId,
      );
      // Quoted message not found in store
      if (!_qmsg) return m.reply("Chat tidak ditemukan pada history bot.");

      if (
        MediaMessageType.filter((f) =>
          Object.keys(_msg?.quotedMessage).includes(f),
        ).length
      ) {
        const messageType = MediaMessageType.filter((f) =>
          Object.keys(_msg?.quotedMessage).includes(f),
        )[0];
        const isViewOnce = messageType.startsWith("viewOnce");
        if (!isViewOnce) {
          text = await (
            await worker.recognize(
              (await downloadMediaMessage(_qmsg, "buffer")).buffer,
            )
          ).data.text;
        } else {
          // ViewOnce check is not video message
          const messageTypeViewOnce = MediaMessageType.filter((f) =>
            Object.keys(_msg?.quotedMessage[messageType]?.message).includes(f),
          )[0];
          if (!messageTypeViewOnce) {
            return m.reply("Media tidak dapat di-ubah ke teks.");
          }
          text = await (
            await worker.recognize(
              (await downloadMediaMessage(_qmsg, "buffer")).buffer,
            )
          ).data.text;
        }
      }
    }
    return m.reply(text);
  },
};
