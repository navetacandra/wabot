const { proto } = require("@whiskeysockets/baileys");
const {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  mkdirSync,
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
 *
 * @param {*} sock
 * @returns
 */
const simplifySocket = (sock) => {
  /**
   *
   * @param {string} path
   * @returns
   */
  const getFile = async (path) => {
    let res;
    // Get buffer data from path
    let data = Buffer.isBuffer(path)
      ? path
      : /^data:.*?\/.*?;base64,/i.test(path)
      ? Buffer.from(path.split`,`[1], "base64")
      : /^https?:\/\//.test(path)
      ? await (res = await fetch(path)).buffer()
      : existsSync(path)
      ? readFileSync(path)
      : typeof path === "string"
      ? path
      : Buffer.alloc(0);

    // Send error message when data is not buffer
    if (!Buffer.isBuffer(data)) throw new TypeError("Result is not a buffer");
    // Get file type from buffer data
    let type = (await fileTypeFromBuffer(data)) || {
      mime: "application/octet-stream",
      ext: ".bin",
    };

    return { res, ...type, data };
  };

  /**
   *
   * @param {string} jid
   * @param {*} path
   * @param {string} filename
   * @param {string} caption
   * @param {object} options
   * @returns
   */
  const sendFile = async (jid, path, filename = "", caption = "", options) => {
    // Get file details
    let type = await getFile(path);
    let { res, data: file } = type;

    let content = {};

    // Send error message when file details error
    if ((res && res.status !== 200) || file.length <= 65536) {
      try {
        throw { json: JSON.parse(file.toString()) };
      } catch (e) {
        if (e.json) throw e.json;
      }
    }

    // Create sticker message config
    if (options.asSticker) {
      content = {
        sticker: await convertToWEBP(file, type.ext),
        mentions: options?.mentions,
        isAnimated: true,
      };
    }
    // Create document message config
    else if (options.asDocument) {
      content = {
        caption,
        filename,
        document: file,
        mimetype: type.mime,
        mentions: options?.mentions,
      };
      // Create document message config
    }
    // Create GIF message config
    else if (options.asGIF && /video/.test(type.mime)) {
      content = {
        caption,
        filename,
        video: file,
        mimetype: type.mime,
        mentions: options?.mentions,
        gifPlayback: true,
      };
    }
    // Create image message config
    else if (/image/.test(type.mime)) {
      content = {
        caption,
        filename,
        image: file,
        mimetype: type.mime,
        mentions: options?.mentions,
      };
    }
    // Create video message config
    else if (/video/.test(type.mime)) {
      content = {
        caption,
        filename,
        video: file,
        mimetype: type.mime,
        mentions: options?.mentions,
      };
    }
    // Create audio message config
    else if (/audio/.test(type.mime)) {
      content = {
        caption,
        filename,
        audio: file,
        mimetype: type.mime,
        mentions: options?.mentions,
      };
    }
    // Create document message config (default)
    else {
      content = {
        caption,
        filename,
        document: file,
        mimetype: type.mime,
        mentions: options?.mentions,
      };
    }

    // Delete unused options
    delete options?.asDocument;
    delete options?.asGIF;
    delete options?.asSticker;
    delete options?.mentions;

    // Send message with created message's config
    return sock.sendMessage(jid, content, options);
  };

  /**
   *
   * @param {string} jid
   * @param {Array} contacts
   * @param {string} displayName
   * @param {object} options
   * @returns
   */
  const sendContact = async (jid, contacts, displayName, options) => {
    console.log(contacts);
    const vcards = await Promise.all(
      contacts.map(async ({ number, name }) => {
        // Remove non-numeric from number
        number = number.replace(/[^0-9]/g, "");
        // Number to jid
        let njid = number + "@s.whatsapp.net";
        // Check is business
        let { isBusiness } = ((await sock.onWhatsApp(njid))[0]?.exists &&
          (await sock.getBusinessProfile(njid))) || {
          isBusiness: false,
        };

        // Parse phone number
        const parsedPhoneNumber = parsePhoneNumber("+" + number)?.number
          ?.international;
        // Parse name
        const vcardName = name.replace(/\n/g, "\\n");
        // Get business description
        const businessDesc = isBusiness
          ? ((await sock.getBusinessProfile(njid)).description || "").replace(
              /\n/g,
              "\\n",
            )
          : "";

        // Add business data
        const businessExtension =
          `X-WA-BIZ-NAME:${vcardName}\n` +
          `X-WA-BIZ-DESCRIPTION:${businessDesc}\n`;

        // Create vcard string
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

    // Get mentions
    const mentions = options?.mentions;
    // Remove unused options
    delete options?.mentions;

    // Send contact message
    return sock.sendMessage(
      jid,
      {
        contacts: { contacts: vcards, displayName: displayName },
        mentions: mentions,
      },
      options,
    );
  };

  return { ...sock, getFile, sendFile, sendContact };
};

/**
 *
 * @param {*} sock
 * @param {proto.IWebMessageInfo} m
 */
const simplifyMessage = (sock, m) => {
  // Get is message sent by baileys
  const isBaileys = m.key?.id.startsWith("BAE5");

  /**
   *
   * @param {object|string} content
   * @param {object|null} options
   * @returns
   */
  const reply = async (content, options) => {
    // Reply as contact
    if (content.contact) {
      // Send contacts when required options are met with quoted message
      if (content.contact.contacts && content.contact.displayName) {
        const { contacts, displayName } = content.contact;
        return sock.sendContact(m.key?.remoteJid, contacts, displayName, {
          ...options,
          quoted: m,
        });
      }
    }
    // Reply as contact
    else if (options?.isMedia) {
      // Delete unused options
      delete options?.isMedia;
      const { media, filename, caption } = content;
      // Send file with quoted message
      return sock.sendFile(m.key?.remoteJid, media, filename, caption, {
        ...options,
        quoted: m,
      });
    }
    // Reply as conversation
    else {
      // Get mentions
      const mentions = options?.mentions;
      // Delete unused options
      delete options?.mentions;
      // Send conversation message with quoted message
      return sock.sendMessage(
        m.key?.remoteJid,
        { text: content, mentions: mentions },
        { ...options, quoted: m },
      );
    }
  };

  // Get message author
  m.key.author = m.key?.participant || m.key?.remoteJid;
  // Check message is from group
  m.key.fromGroup = m.key?.remoteJid?.endsWith("@g.us");
  // Check message is from baileys
  m.key.isBaileys = isBaileys;
  m.reply = reply;
  // Get text from message (conversation/caption)
  m.text =
    m?.message?.conversation ||
    m?.message?.extendedTextMessage?.text ||
    m?.message?.imageMessage?.caption ||
    m?.message?.videoMessage?.caption ||
    m?.message?.documentMessage?.caption ||
    m?.message?.documentWithCaptionMessage?.message?.conversation ||
    m?.message?.documentWithCaptionMessage?.message?.imageMessage?.caption ||
    m?.message?.documentWithCaptionMessage?.message?.videoMessage?.caption ||
    m?.message?.documentWithCaptionMessage?.message?.documentMessage?.caption ||
    m?.message?.viewOnceMessage?.message?.conversation ||
    m?.message?.viewOnceMessage?.message?.imageMessage?.caption ||
    m?.message?.viewOnceMessage?.message?.videoMessage?.caption ||
    m?.message?.viewOnceMessage?.message?.documentMessage?.caption ||
    m?.message?.viewOnceMessage?.message?.documentWithCaptionMessage?.message
      ?.conversation ||
    m?.message?.viewOnceMessage?.message?.documentWithCaptionMessage?.message
      ?.imageMessage?.caption ||
    m?.message?.viewOnceMessage?.message?.documentWithCaptionMessage?.message
      ?.videoMessage?.caption ||
    m?.message?.viewOnceMessage?.message?.documentWithCaptionMessage?.message
      ?.documentMessage?.caption ||
    m?.message?.viewOnceMessageV2?.message?.conversation ||
    m?.message?.viewOnceMessageV2?.message?.imageMessage?.caption ||
    m?.message?.viewOnceMessageV2?.message?.videoMessage?.caption ||
    m?.message?.viewOnceMessageV2?.message?.documentMessage?.caption ||
    m?.message?.viewOnceMessageV2?.message?.documentWithCaptionMessage?.message
      ?.conversation ||
    m?.message?.viewOnceMessageV2?.message?.documentWithCaptionMessage?.message
      ?.imageMessage?.caption ||
    m?.message?.viewOnceMessageV2?.message?.documentWithCaptionMessage?.message
      ?.videoMessage?.caption;
  m?.message?.viewOnceMessageV2?.message?.documentWithCaptionMessage?.message
    ?.documentMessage?.caption;
  m?.message?.viewOnceMessageV2Extension?.message?.conversation ||
    m?.message?.viewOnceMessageV2Extension?.message?.imageMessage?.caption ||
    m?.message?.viewOnceMessageV2Extension?.message?.videoMessage?.caption ||
    m?.message?.viewOnceMessageV2Extension?.message?.documentMessage?.caption ||
    m?.message?.viewOnceMessageV2Extension?.message?.documentWithCaptionMessage
      ?.message?.conversation ||
    m?.message?.viewOnceMessageV2Extension?.message?.documentWithCaptionMessage
      ?.message?.imageMessage?.caption ||
    m?.message?.viewOnceMessageV2Extension?.message?.documentWithCaptionMessage
      ?.message?.videoMessage?.caption;
  m?.message?.viewOnceMessageV2Extension?.message?.documentWithCaptionMessage
    ?.message?.documentMessage?.caption || "";

  return m;
};

module.exports = { simplifySocket, simplifyMessage };
