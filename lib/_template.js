module.exports = {
  command: null,
  /**
   *
   * @param {import("../utils/type").SimplifiedMessage} sock - WhatsApp socket
   * @param {import("../utils/type").SimplifiedMessage} m - Simplified WhatsApp message
   * @param {string[]} args - Splitted message text
   * @returns {Promise<any>}
   */
  exec: async (sock, m, args) => {},
};
