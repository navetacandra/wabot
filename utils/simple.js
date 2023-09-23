require("dotenv").config();
const { proto, makeInMemoryStore } = require("@whiskeysockets/baileys");
const {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  mkdirSync,
  watch,
} = require("fs");
const { v4 } = require("uuid");
const { spawn } = require("child_process");
const parsePhoneNumber = require("awesome-phonenumber").parsePhoneNumber;
const fileTypeFromBuffer = (...args) =>
  import("file-type")
    .then(({ fileTypeFromBuffer: f }) => f(...args))
    .catch((err) => console.log(err));
const fetch = (...args) =>
  import("node-fetch")
    .then(({ default: f }) => f(...args))
    .catch((err) => console.log(err));
const path = require("path");

/**
 *
 * @param {*} data
 * @param {string} ext
 * @returns
 */
const convertToPNG = (data, ext) => {
  return new Promise(async (resolve, reject) => {
    // Send error message if data not buffer
    if (!Buffer.isBuffer(data)) throw new TypeError("data is not Buffer");
    // Send error message if data not buffer
    const dir = path.resolve(path.join(__dirname, "..", "temp"));
    // Create temp directory
    if (!existsSync(dir)) {
      mkdirSync(dir);
    }
    // Declare file name
    const filenameData = path.resolve(
      path.join(__dirname, "..", "temp", `${Date.now()}_${v4()}.${ext}`),
    );
    const filenameResult = path.resolve(
      path.join(__dirname, "..", "temp", `${Date.now()}_${v4()}.png`),
    );

    // Write input file
    writeFileSync(filenameData, data);
    // Convert input file to output
    const convert = spawn("convert", [filenameData, filenameResult]);
    // Send and display error message when convert error
    convert.on("error", (err) => {
      console.log(err);
      reject(err);
    });
    // Send convert result and unlink temp file
    convert.on("close", (code) => {
      unlinkSync(filenameData);
      if (code != 0) return reject(code);
      resolve(readFileSync(filenameResult));
      unlinkSync(filenameResult);
    });
  });
};

/**
 *
 * @param {*} data
 * @param {string} ext
 * @returns
 */
const convertToWEBP = (data, ext) => {
  return new Promise(async (resolve, reject) => {
    // Send error message if data not buffer
    if (!Buffer.isBuffer(data)) throw new TypeError("data is not Buffer");
    // Send error message if data not buffer
    const dir = path.resolve(path.join(__dirname, "..", "temp"));
    // Create temp directory
    if (!existsSync(dir)) {
      mkdirSync(dir);
    }
    // Declare file name
    const filenameData = path.resolve(
      path.join(__dirname, "..", "temp", `${Date.now()}-${v4()}.${ext}`),
    );
    const filenameResult = path.resolve(
      path.join(__dirname, "..", "temp", `${Date.now()}-${v4()}.webp`),
    );

    // Write input file
    writeFileSync(filenameData, data);
    // Convert input file to output
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-i",
      filenameData,
      "-vf",
      "scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1",
      filenameResult,
    ]);
    // Send and display error message when convert error
    ffmpeg.on("error", (err) => {
      console.log(err);
      reject(err);
    });
    // Send convert result and unlink temp file
    ffmpeg.on("close", (code) => {
      unlinkSync(filenameData);
      if (code != 0) return reject(code);
      resolve(readFileSync(filenameResult));
      unlinkSync(filenameResult);
    });
  });
};

/**
 * Simplifies the functionality of a socket.
 *
 * @param {import("./type")._WASocket} sock - The socket to simplify.
 * @returns {import("./type").SimplifiedSocket} - An object containing simplified socket functions.
 */
const simplifySocket = (sock) => {
  /**
   * Get file data from various sources.
   *
   * @param {string|Buffer} path - The path or data source.
   * @returns {Promise<Object>} - An object containing file data and metadata.
   */
  const getFile = async (path) => {
    try {
      let res;
      let data = Buffer.isBuffer(path)
        ? path
        : /^data:.*?\/.*?;base64,/i.test(path)
        ? Buffer.from(path.split(",")[1], "base64")
        : /^https?:\/\//.test(path)
        ? await (res = await fetch(path)).buffer()
        : existsSync(path)
        ? readFileSync(path)
        : typeof path === "string"
        ? path
        : Buffer.alloc(0);

      if (!Buffer.isBuffer(data)) throw new TypeError("Result is not a buffer");

      let type = (await fileTypeFromBuffer(data)) || {
        mime: "application/octet-stream",
        ext: ".bin",
      };

      return { res, ...type, data };
    } catch (err) {
      console.log(err);
    }
  };

  /**
   * Send a file message with optional settings.
   *
   * @param {string} jid - The JID to send the file to.
   * @param {string|Buffer} path - The path to the file or data source.
   * @param {string} [filename=''] - The name of the file.
   * @param {string} [caption=''] - The caption for the file.
   * @param {import("./type").MessageOptions|undefined} options - Additional options for sending the file.
   * @returns {Promise<proto.IWebMessageInfo|undefined>} - A promise indicating the success of the operation.
   */
  const sendFile = async (jid, path, filename = "", caption = "", options) => {
    let type = await getFile(path);
    let { res, data: file } = type;

    let content = {};

    if ((res && res.status !== 200) || file.length <= 65536) {
      try {
        throw { json: JSON.parse(file.toString()) };
      } catch (e) {
        if (e.json) throw e.json;
      }
    }

    if (options?.asSticker) {
      content = {
        sticker: await convertToWEBP(file, type.ext),
        mentions: options?.mentions,
        isAnimated: true,
      };
    } else if (options?.asDocument) {
      content = {
        caption,
        filename,
        document: file,
        mimetype: type.mime,
        mentions: options?.mentions,
      };
    } else if (options?.asGIF && /video/.test(type.mime)) {
      content = {
        caption,
        filename,
        video: file,
        mimetype: type.mime,
        mentions: options?.mentions,
        gifPlayback: true,
      };
    } else if (/image/.test(type.mime)) {
      content = {
        caption,
        filename,
        image: file,
        mimetype: type.mime,
        mentions: options?.mentions,
      };
    } else if (/video/.test(type.mime)) {
      content = {
        caption,
        filename,
        video: file,
        mimetype: type.mime,
        mentions: options?.mentions,
      };
    } else if (/audio/.test(type.mime)) {
      content = {
        caption,
        filename,
        audio: file,
        mimetype: type.mime,
        mentions: options?.mentions,
      };
    } else {
      content = {
        caption,
        filename,
        document: file,
        mimetype: type.mime,
        mentions: options?.mentions,
      };
    }

    delete options?.asDocument;
    delete options?.asGIF;
    delete options?.asSticker;
    delete options?.mentions;

    return sock.sendMessage(jid, content, options);
  };

  /**
   * Send a contact message with vCards.
   *
   * @param {string} jid - The JID to send the contact to.
   * @param {import("./type").ContactMessage[]} contacts - An array of contact objects.
   * @param {string} displayName - The display name for the contacts.
   * @param {MessageOptions|undefined} options - Additional options for sending the contact.
   * @returns {Promise<proto.IWebMessageInfo|undefined>} - A promise indicating the success of the operation.
   */
  const sendContact = async (jid, contacts, displayName, options) => {
    console.log(contacts);
    const vcards = await Promise.all(
      contacts.map(async ({ number, name }) => {
        number = number.replace(/[^0-9]/g, "");
        let njid = number + "@s.whatsapp.net";
        let { isBusiness } = ((await sock.onWhatsApp(njid))[0]?.exists &&
          (await sock.getBusinessProfile(njid))) || {
          isBusiness: false,
        };

        const parsedPhoneNumber = parsePhoneNumber("+" + number)?.number
          ?.international;
        const vcardName = name.replace(/\n/g, "\\n");
        const businessDesc = isBusiness
          ? ((await sock.getBusinessProfile(njid)).description || "").replace(
              /\n/g,
              "\\n",
            )
          : "";

        const businessExtension =
          `X-WA-BIZ-NAME:${vcardName}\n` +
          `X-WA-BIZ-DESCRIPTION:${businessDesc}\n`;

        return {
          vcard:
            "BEGIN:VCARD\n" +
            "VERSION:3.0\n" +
            `N:;${vcardName};;;\n` +
            `FN:${vcardName}\n` +
            `TEL;type=CELL;type=VOICE;waid=${number}:${parsedPhoneNumber}\n` +
            (isBusiness ? businessExtension : "") +
            "END:VCARD".trim(),
        };
      }),
    );

    const mentions = options?.mentions;
    delete options?.mentions;

    return sock.sendMessage(
      jid,
      {
        contacts: { contacts: vcards, displayName: displayName },
        mentions: mentions,
      },
      options,
    );
  };

  // Set author
  sock.author_jid = process.env.OWNER_JID;
  sock.author_name = process.env.OWNER_NAME;

  // Set dbPath
  sock.dbPath = path.resolve(
    path.join(process.cwd(), process.env.LOCALDB_PATH),
  );

  // Import local db files
  const importLocalDB = (() => {
    // Import local db files
    if (!existsSync(sock.dbPath)) writeFileSync(sock.dbPath, "{}");
    try {
      sock.db = JSON.parse(readFileSync(sock.dbPath));
    } catch (err) {
      console.log("[Failed import local db]", err.toString());
    }

    // Watch local db files update and re-import
    watch(sock.dbPath, "utf8", () => {
      if (!existsSync(sock.dbPath)) writeFileSync(sock.dbPath, "{}");
      try {
        sock.db = JSON.parse(readFileSync(sock.dbPath));
      } catch (err) {
        console.log("[Failed import local db]", err.toString());
      }
    });
  })();

  // Save chats to file store
  sock.store = makeInMemoryStore({});
  sock.store.readFromFile(process.env.STORE_PATH);
  setInterval(() => {
    sock.store.writeToFile(process.env.STORE_PATH);
  }, 1000);

  // Bind event to store
  sock.store.bind(sock.ev);

  // Queue
  sock.queue = [];
  sock.addQueue = (cb) => sock.queue.push(async () => await cb());

  return { ...sock, getFile, sendFile, sendContact };
};

/**
 * Simplifies a received message.
 *
 * @param {import("./type").SimplifiedSocket} sock - The socket handling the message.
 * @param {proto.IWebMessageInfo} m - The received message.
 * @returns {import("./type").SimplifiedMessage} - The simplified message.
 */
const simplifyMessage = (sock, m) => {
  const isBaileys = m.key?.id.startsWith("BAE5");

  /**
   * Reply to a message with content and options.
   *
   * @param {import("./type").ReplyContent} content - The content to send in the reply.
   * @param {import("./type").MessageOptions} options - Additional options for sending the reply.
   * @returns {Promise<proto.IWebMessageInfo|undefined>} - A promise indicating the success of the operation.
   */
  const reply = async (content, options) => {
    if (typeof content == "string") {
      const mentions = options?.mentions;
      delete options?.mentions;
      return sock.sendMessage(
        m.key?.remoteJid,
        { text: content, mentions: mentions },
        { ...options, quoted: m },
      );
    }

    if (content?.contact) {
      if (content?.contact.contacts && content?.contact.displayName) {
        const { contacts, displayName } = content?.contact;
        return sock.sendContact(m.key?.remoteJid, contacts, displayName, {
          ...options,
          quoted: m,
        });
      }
    } else if (options?.isMedia) {
      delete options?.isMedia;
      const { media, filename, caption } = content;
      return sock.sendFile(m.key?.remoteJid, media, filename, caption, {
        ...options,
        quoted: m,
      });
    }
  };

  reply();

  m.key.author = m.key?.participant || m.key?.remoteJid;
  m.key.fromGroup = m.key?.remoteJid?.endsWith("@g.us");
  m.key.isBaileys = isBaileys;
  m.reply = reply;

  /**
   *
   * @returns {string}
   */
  function extractCaption() {
    const message = m?.message;
    if (!message) return "";

    return (
      message?.conversation ||
      message?.extendedTextMessage?.text ||
      message?.imageMessage?.caption ||
      message?.videoMessage?.caption ||
      message?.documentMessage?.caption ||
      message?.documentWithCaptionMessage?.message?.conversation ||
      message?.documentWithCaptionMessage?.message?.imageMessage?.caption ||
      message?.documentWithCaptionMessage?.message?.videoMessage?.caption ||
      message?.documentWithCaptionMessage?.message?.documentMessage?.caption ||
      message?.viewOnceMessage?.message?.conversation ||
      message?.viewOnceMessage?.message?.imageMessage?.caption ||
      message?.viewOnceMessage?.message?.videoMessage?.caption ||
      message?.viewOnceMessage?.message?.documentMessage?.caption ||
      message?.viewOnceMessage?.message?.documentWithCaptionMessage?.message
        ?.conversation ||
      message?.viewOnceMessage?.message?.documentWithCaptionMessage?.message
        ?.imageMessage?.caption ||
      message?.viewOnceMessage?.message?.documentWithCaptionMessage?.message
        ?.videoMessage?.caption ||
      message?.viewOnceMessage?.message?.documentWithCaptionMessage?.message
        ?.documentMessage?.caption ||
      message?.viewOnceMessageV2?.message?.conversation ||
      message?.viewOnceMessageV2?.message?.imageMessage?.caption ||
      message?.viewOnceMessageV2?.message?.videoMessage?.caption ||
      message?.viewOnceMessageV2?.message?.documentMessage?.caption ||
      message?.viewOnceMessageV2?.message?.documentWithCaptionMessage?.message
        ?.conversation ||
      message?.viewOnceMessageV2?.message?.documentWithCaptionMessage?.message
        ?.imageMessage?.caption ||
      message?.viewOnceMessageV2?.message?.documentWithCaptionMessage?.message
        ?.videoMessage?.caption ||
      message?.viewOnceMessageV2?.message?.documentWithCaptionMessage?.message
        ?.documentMessage?.caption ||
      message?.viewOnceMessageV2Extension?.message?.conversation ||
      message?.viewOnceMessageV2Extension?.message?.imageMessage?.caption ||
      message?.viewOnceMessageV2Extension?.message?.videoMessage?.caption ||
      message?.viewOnceMessageV2Extension?.message?.documentMessage?.caption ||
      message?.viewOnceMessageV2Extension?.message?.documentWithCaptionMessage
        ?.message?.conversation ||
      message?.viewOnceMessageV2Extension?.message?.documentWithCaptionMessage
        ?.message?.imageMessage?.caption ||
      message?.viewOnceMessageV2Extension?.message?.documentWithCaptionMessage
        ?.message?.videoMessage?.caption ||
      message?.viewOnceMessageV2Extension?.message?.documentWithCaptionMessage
        ?.message?.documentMessage?.caption ||
      ""
    );
  }

  m.text = extractCaption();
  return m;
};

module.exports = {
  simplifySocket,
  simplifyMessage,
  convertToPNG,
  convertToWEBP,
};
