const { proto } = require("@whiskeysockets/baileys");

module.exports = {
  command: /tag(_|-)?all/,
  /**
   *
   * @param {*} sock
   * @param {proto.IWebMessageInfo} m
   * @param {Array} args
   */
  exec: async (sock, m, args) => {
    // Send failed message if command sent not in group
    if (!m.key?.fromGroup) {
      return m.reply("Ini hanya dapat berfungsi di group!");
    }

    // Get group participants list
    const participants = (
      await sock.groupMetadata(m.key?.remoteJid)
    ).participants
      .filter(
        (f) =>
          f.id != m.key?.author &&
          f.id != `${sock.user.id.split(":")[0]}@s.whatsapp.net`,
      )
      .map((e) => e.id);

    // Send message with all participants mentions
    m.reply(participants.map((e) => `@${e.split("@")[0]}`).join(" "), {
      mentions: participants,
    });
  },
};
