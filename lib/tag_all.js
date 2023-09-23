module.exports = {
  command: /tag(_|-)?all/,
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
