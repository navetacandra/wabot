const { proto } = require("@whiskeysockets/baileys");

module.exports = {
  command: "kick",
  /**
   *
   * @param {*} sock
   * @param {proto.IWebMessageInfo} m
   * @param {String[]} args
   */
  exec: async (sock, m, args) => {
    // Send failed message if command sent not in group
    if (!m.key?.fromGroup) {
      return m.reply("Ini hanya dapat berfungsi di group!");
    }

    const isAdmin =
      (await sock.groupMetadata(m.key?.remoteJid)).participants.filter(
        (f) => f.id == `${sock.user.id.split(":")[0]}@s.whatsapp.net`,
      )[0].admin != null;

    if (!isAdmin) {
      return m.reply("Bot tidak terdaftar sebagai admin di group!");
    }

    if (!m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length)
      return m.reply("Mention anggota yang akan di-kick.");

    return await sock.groupParticipantsUpdate(
      m.key?.remoteJid,
      m.message?.extendedTextMessage?.contextInfo?.mentionedJid,
      "remove",
    );
  },
};
