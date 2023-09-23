module.exports = {
  command: "owner",
  /**
   *
   * @param {import("../utils/type").SimplifiedMessage} sock - WhatsApp socket
   * @param {import("../utils/type").SimplifiedMessage} m - Simplified WhatsApp message
   * @param {string[]} args - Splitted message text
   * @returns {Promise<any>}
   */
  exec: async (sock, m, args) => {
    m.reply({
      contact: {
        contacts: [{ number: "6285174254323", name: "navetacandra" }],
        displayName: "navetacandra",
      },
    });
  },
};
