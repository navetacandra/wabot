const { proto, downloadMediaMessage } = require("@whiskeysockets/baileys");

module.exports = {
  command: /stic?ker/,
  /**
   *
   * @param {*} sock
   * @param {proto.IWebMessageInfo} m
   * @param {Array} args
   */
  exec: async (sock, m, args) => {
    let msg;
    // MessageTypeMedia
    const allowedMessageType = [
      "imageMessage",
      "videoMessage",
      "viewOnceMessage",
      "viewOnceMessageV2",
      "viewOnceMessageV2Extension",
    ];

    // Sticker from url
    if (
      /^data:.*?\/.*?;base64,/i.test(args[0]) ||
      /^https?:\/\//.test(args[0])
    ) {
      // Send media from url as sticker
      return m.reply({ media: args[0] }, { asSticker: true, isMedia: true });
    }
    // Message has media
    else if (
      allowedMessageType.filter((f) => Object.keys(m.message).includes(f))
        .length
    ) {
      msg = m;
    }
    // Message has quotedMessage
    else if (m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      const _msg = m?.message?.extendedTextMessage?.contextInfo;
      // Quoted message has media
      if (
        allowedMessageType.filter((f) =>
          Object.keys(_msg?.quotedMessage).includes(f),
        ).length
      ) {
        // Fetch quoted message
        const _qmsg = await sock.store.loadMessage(
          m.key?.remoteJid,
          _msg?.stanzaId,
        );
        // Quoted message not found in store
        if (!_qmsg) return m.reply("Chat tidak ditemukan pada history bot.");
        msg = _qmsg;
      }
      // Quoted message hasn't media
      else {
        return m.reply("Media chat tidak ditemukan.");
      }
    }
    // Quoted message hasn't media
    else {
      return m.reply("Media chat tidak ditemukan.");
    }

    // Message not found in story
    if (!msg) return m.reply("Chat tidak ditemukan pada history bot.");

    // Download message media
    const media = await downloadMediaMessage(msg, "buffer");
    // Send media as sticker
    m.reply({ media }, { asSticker: true, isMedia: true });
  },
};
