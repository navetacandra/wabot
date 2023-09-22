const { proto } = require("@whiskeysockets/baileys");
const { readFileSync, writeFileSync, existsSync } = require("fs");
const { resolve, join } = require("path");
const location = resolve(join(__dirname, "..", "chat_log.log"));

/**
 *
 * @param {*} sock
 * @param {proto.IWebMessageInfo} m
 */
const messageLogger = (sock, m) => {
  let message;
  let date = new Date(Date(m?.messageTimestamp?.low || m?.messageTimestamp));
  let timestamp = `${date.getDate()}/${
    date.getMonth() + 1
  }/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${date.getMilliseconds()}`;

  if (m?.messageStubType == 20 || m?.messageStubType == 27) {
    const added = m?.messageStubParameters
      .map((e) => e.replace("@s.whatsapp.net", ""))
      .map((e) => (e == "n" ? "Bot" : e))
      .join(",");
    message = `[${timestamp}] ${added} was invited to group ${m?.key?.remoteJid}`;
  } else if (m?.messageStubType == 28) {
    const kicked = m?.messageStubParameters
      .map((e) => e.replace("@s.whatsapp.net", ""))
      .map((e) => (e == "n" ? "Bot" : e))
      .join(",");
    message = `[${timestamp}] ${kicked} was kicked from group ${m?.key?.remoteJid}`;
  } else {
    const isGroup = m?.key?.remoteJid?.endsWith("@g.us");
    const typeChat = Object?.keys(m.message)[0] || "unknownMessageType";
    const jid = m?.key?.remoteJid?.split("@")[0];
    const author =
      m?.key?.fromMe && m?.key?.isBaileys
        ? "BOT"
        : (m?.key?.participant ?? m?.key?.remoteJid)?.split("@")[0];

    message = `[${timestamp}] ${isGroup ? `(${jid})` : ""} (${author}):${
      typeChat != "conversation" ? ` [${typeChat}]` : ""
    } ${m.text || ""}`;
  }
  const before = existsSync(location) ? readFileSync(location, "utf-8") : "";

  writeFileSync(location, `${before}${message}\n`, "utf-8");
  console.log(message);
};

module.exports = messageLogger;
