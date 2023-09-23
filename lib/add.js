module.exports = {
  command: "add",
  /**
   *
   * @param {import("../utils/type").SimplifiedMessage} sock - WhatsApp socket
   * @param {import("../utils/type").SimplifiedMessage} m - Simplified WhatsApp message
   * @param {string[]} args - Splitted message text
   * @returns {Promise<any>}
   */
  exec: async (sock, m, args) => {
    // Send failed message if command sent not in group
    if (!m.key?.fromGroup) {
      return m.reply("Ini hanya dapat berfungsi di group!");
    }

    const isAuthorAdmin =
      (await sock.groupMetadata(m.key?.remoteJid)).participants.filter(
        (f) => f.id == m.key.author,
      )[0].admin != null;

    const isAdmin =
      (await sock.groupMetadata(m.key?.remoteJid)).participants.filter(
        (f) => f.id == `${sock.user.id.split(":")[0]}@s.whatsapp.net`,
      )[0].admin != null;

    if (!isAuthorAdmin) {
      return m.reply("Kamu tidak terdaftar sebagai admin di group!");
    }
    if (!isAdmin) {
      return m.reply("Bot tidak terdaftar sebagai admin di group!");
    }

    return await sock.groupParticipantsUpdate(
      m.key?.remoteJid,
      args.map((e) => `${e}@s.whatsapp.net`),
      "add",
    );
  },
};
