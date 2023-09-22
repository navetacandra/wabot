const { proto } = require("@whiskeysockets/baileys");

module.exports = {
  command: "owner",
  /**
   *
   * @param {*} sock
   * @param {proto.IWebMessageInfo} m
   * @param {Array} args
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
