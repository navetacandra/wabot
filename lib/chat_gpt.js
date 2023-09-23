require("dotenv").config();

const { writeFileSync } = require("fs");
const { default: OpenAI } = require("openai");
const parsePhoneNumber = require("awesome-phonenumber").parsePhoneNumber;
const openai = new OpenAI({
  apiKey: process.env.OPENAI_APIKEY,
});

module.exports = {
  command: /(chat)?gpt/,
  /**
   *
   * @param {import("../utils/type").SimplifiedMessage} sock - WhatsApp socket
   * @param {import("../utils/type").SimplifiedMessage} m - Simplified WhatsApp message
   * @param {string[]} args - Splitted message text
   * @returns {Promise<any>}
   */
  exec: async (sock, m, args) => {
    const c = args[0];

    switch (c) {
      case "enable":
        if (sock.db[m.key?.remoteJid]) {
          sock.db[m.key.remoteJid].chatgpt_active = true;
          writeFileSync(sock.dbPath, JSON.stringify(sock.db, null, 2));
          m.reply("Chat-GPT berhasil di-aktifkan pada Room Chat ini.");
        } else {
          m.reply("Tidak dapat mengaktifkan Chat-GPT.");
        }
        break;

      case "disable":
        if (sock.db[m.key?.remoteJid]) {
          sock.db[m.key.remoteJid].chatgpt_active = false;
          writeFileSync(sock.dbPath, JSON.stringify(sock.db, null, 2));
          m.reply("Chat-GPT berhasil di-nonaktifkan pada Room Chat ini.");
        } else {
          m.reply("Tidak dapat menonaktifkan Chat-GPT.");
        }
        break;

      case "flush":
        if (sock.db[m.key?.remoteJid]) {
          delete sock.db[m.key.remoteJid].chatgpt_messages;
          writeFileSync(sock.dbPath, JSON.stringify(sock.db, null, 2));
          m.reply("Berhasil mengahapus history Chat-GPT pada Room Chat ini.");
        } else {
          m.reply("Tidak dapat menonaktifkan Chat-GPT.");
        }
        break;

      default:
        m.reply("Perintah tidak diketahui.");
        break;
    }
  },

  /**
   *
   * @param {*} sock - WhatsApp socket
   * @param {import("../utils/type").SimplifiedMessage} m - Simplified WhatsApp message- Simplified WhatsApp message
   * @param {string} prompt
   * @returns
   */
  handle_openai: async (sock, m, prompt) => {
    try {
      // Create initial messages list
      if (!sock.db[m.key?.remoteJid]?.chatgpt_messages) {
        sock.db[m.key?.remoteJid].chatgpt_messages = [
          {
            role: "system",
            content:
              "Kamu adalah chatbot yang terdaftar di WhatsApp dengan nama Echo. Echo adalah singkatan dari Electronic Computing Humanoid Organism. Kamu dibuat oleh navetacandra. Kamu harus memberikan completion dengan format pesan WhatsApp, agar mudah dibaca di pesan WhatsApp.",
          },
        ];
      }

      console.log(prompt);

      // Add user message to messages list
      sock.db[m.key?.remoteJid].chatgpt_messages.push({
        role: "user",
        // content: `Ada pesan dari: ${(await parsePhoneNumber('+' + m.key?.author.split('@')[0])).number.international}, yang berisi: ${prompt}`,
        content: prompt,
      });

      // Create completion from prompt
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [...sock.db[m.key?.remoteJid].chatgpt_messages],
      });

      // Add completion message to messages list
      sock.db[m.key?.remoteJid].chatgpt_messages.push(
        completion.choices[0].message,
      );
      // Save messages list
      writeFileSync(sock.dbPath, JSON.stringify(sock.db, null, 2));

      return completion.choices[0].message.content;
    } catch (err) {
      console.log(err);
      return `Terjadi kesalahan pada Chat-GPT. Error: ${
        err.code || err.toString()
      } ${err.status || ""}`;
    }
  },
};
