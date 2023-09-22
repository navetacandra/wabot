require("dotenv").config();
const { proto } = require("@whiskeysockets/baileys");
const { writeFileSync } = require("fs");
const { default: OpenAI } = require("openai");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_APIKEY,
});

module.exports = {
  command: /(chat)?gpt/,
  /**
   *
   * @param {*} sock
   * @param {proto.IWebMessageInfo} m
   * @param {Array} args
   */
  exec: async (sock, m, args) => {
    const c = args[0];
    // Verify command
    if (c == "verify") {
      // Send failed message when message author not bot owner
      if (m.key?.author != sock.author) {
        return m.reply("Anda tidak dapat menggunakan perintah _*verify*_.");
      } else {
        // Update local db
        sock.db[`${args[1]}@s.whatsapp.net`].chatgpt_verified = true;
        writeFileSync(sock.dbPath, JSON.stringify(sock.db, null, 2));
        // Send success message
        return m.reply(`${args[1]} berhasil terverifikasi`);
      }
    }
    // Unverify command
    else if (c == "unverify") {
      // Send failed message when message author not bot owner
      if (m.key?.author != sock.author) {
        return m.reply("Anda tidak dapat menggunakan perintah _*unverify*_.");
      } else {
        // Update local db
        sock.db[`${args[1]}@s.whatsapp.net`].chatgpt_verified = false;
        writeFileSync(sock.dbPath, JSON.stringify(sock.db, null, 2));
        // Send success message
        return m.reply(`berhasil membatalkan verifikasi ${args[1]}`);
      }
    }
    // Enable command
    else if (c == "enable") {
      // Send failed message when message author not verified by owner
      if (!sock.db[m.key.author]?.chatgpt_verified) {
        return m.reply("Anda tidak dapat menggunakan perintah _*enable*_.");
      } else {
        // Update local db
        sock.db[m.key.author].chatgpt_active = true;
        writeFileSync(sock.dbPath, JSON.stringify(sock.db, null, 2));
        // Send success message
        return m.reply(`berhasil mengaktifkan chat-gpt`);
      }
    } else if (c == "disable") {
      // Send failed message when message author not verified by owner
      if (!sock.db[m.key.author]?.chatgpt_verified) {
        return m.reply("Anda tidak dapat menggunakan perintah _*disable*_.");
      } else {
        // Update local db
        sock.db[m.key.author].chatgpt_active = false;
        writeFileSync(sock.dbPath, JSON.stringify(sock.db, null, 2));
        // Send success message
        return m.reply(`berhasil menonaktifkan chat-gpt`);
      }
    }
  },

  handle_openai: async (sock, m, prompt) => {
    // Create initial messages list
    if (!sock.db[m.key.author]?.chatgpt_messages) {
      sock.db[m.key.author].chatgpt_messages = [
        {
          role: "system",
          content:
            "Kamu adalah chatbot yang terdaftar di WhatsApp dengan nama ECHO, ECHO adalah singkatan dari Electronic Computing Humanoid Organism. Kamu terdaftar dengan nomor WhatsApp +62 857-1823-4965. Panggilan kamu adalah Echo.",
        },
      ];
    }

    // Add user message to messages list
    sock.db[m.key.author].chatgpt_messages.push({
      role: "user",
      content: prompt,
    });

    // Create completion from prompt
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [...sock.db[m.key.author].chatgpt_messages],
    });

    // Add completion message to messages list
    sock.db[m.key.author].chatgpt_messages.push(completion.choices[0].message);
    // Save messages list
    writeFileSync(sock.dbPath, JSON.stringify(sock.db, null, 2));

    return completion.choices[0].message.content;
  },
};
