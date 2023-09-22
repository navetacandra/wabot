const {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  Browsers,
  makeInMemoryStore,
} = require("@whiskeysockets/baileys");
const {
  readdirSync,
  watch,
  existsSync,
  writeFileSync,
  readFileSync,
} = require("fs");
const { simplifyMessage, simplifySocket } = require("./utils/simple");
const path = require("path");
const messageLogger = require("./utils/message_logger");

// Initialize prefix for command
const prefix = ["."];
// Get ./lib path
const libPath = path.resolve(path.join(__dirname, "lib"));
const localDbPath = path.resolve(path.join(__dirname, "local_db.json"));
let commands = {};
let db = {};

const importCommandsFromLib = () => {
  // Import command files
  readdirSync(libPath)
    .filter((f) => f.endsWith(".js"))
    .forEach((f) => {
      commands[f.replace(/\.js/, "")] = require(
        path.resolve(path.join(libPath, f)),
      );
    });

  // Watch command files update and re-import
  watch(libPath, "utf8", (ev, f) => {
    if (!f.endsWith(".js")) return;
    const filePath = path.resolve(path.join(libPath, f));

    delete require.cache[filePath];

    if (existsSync(filePath)) {
      commands[f.replace(/\.js/, "")] = require(filePath);
    }
  });
};

const importLocalDB = () => {
  // Import local db files
  if (!existsSync(localDbPath)) writeFileSync(localDbPath, "{}");
  try {
    db = JSON.parse(readFileSync(localDbPath));
  } catch (err) {
    console.log("[Failed import local db]", err.toString());
  }

  // Watch local db files update and re-import
  watch(localDbPath, "utf8", () => {
    try {
      db = JSON.parse(readFileSync(localDbPath));
    } catch (err) {
      console.log("[Failed import local db]", err.toString());
    }
  });
};

// Import all command files
importCommandsFromLib();
// Import local db files
importLocalDB();

// Declare connectToWhatsApp function to connect socket to whatsapp
const connectToWhatsApp = async () => {
  // Create auth state
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  // Create whatsapp socket
  const _sock = await makeWASocket({
    auth: state,
    browser: Browsers.macOS("Desktop"),
    printQRInTerminal: true,
    syncFullHistory: true,
  });
  // Simplify socket
  const sock = simplifySocket(_sock);
  sock.author = "6285174254323@s.whatsapp.net";
  sock.dbPath = localDbPath;
  sock.db = db;

  // Save chats to file store
  sock.store = makeInMemoryStore({});
  sock.store.readFromFile("./baileys_store.json");
  setInterval(() => {
    sock.store.writeToFile("./baileys_store.json");
  }, 1000);

  // Bind event to store
  sock.store.bind(sock.ev);

  // Save auth state
  sock.ev.on("creds.update", saveCreds);

  // Connection update hancler
  sock.ev.on("connection.update", (update) => {
    // Get connection status and lastDisconnect status
    const { connection, lastDisconnect } = update;
    if (connection == "close") {
      // Check is socket should reconnect
      const shouldReconnect =
        lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(
        `Disconnected due to ${lastDisconnect.error}. Reconnecting: ${shouldReconnect}`,
      );

      if (shouldReconnect) {
        // Reconnect socket to whatsapp if should reconnect
        connectToWhatsApp();
      }
    } else if (connection == "open") {
      // Messaging to console if connection is opened
      console.log("Connection is open.");
    }
  });

  // Get message handler
  sock.ev.on("messages.upsert", async ({ messages }) => {
    // Simplify coming message
    const m = simplifyMessage(sock, messages[0]);
    if (m.key?.author == "status@broadcast") return;
    // Logging message to console and file
    messageLogger(sock, m);
    // Ignore if message come from baileys
    if (m.key?.isBaileys) return;

    // Db check
    if (!Object.keys(sock.db).includes(m.key?.author)) {
      sock.db[m.key?.author] = {
        chatgpt_active: false,
        chatgpt_verified: false,
      };
      writeFileSync(localDbPath, JSON.stringify(sock.db, null, 2));
    }

    // GPT features only when gpt enabled for user
    if (
      sock.db[m.key.author].chatgpt_active &&
      !(
        prefix.filter((f) => m.text.startsWith(f)).length &&
        /(chat)?gpt/.test(m.text.substring(1).split(" ")[0])
      )
    ) {
      m.reply(await commands.chat_gpt.handle_openai(sock, m, m.text));
      return;
    }

    // Parsing args and command from the message's text/caption
    let args = (m.text ?? "").split(" ");
    if (prefix.filter((f) => args[0].startsWith(f)).length < 1) return;
    const cmd = args.shift().substring(1).toLowerCase();

    // Sort commands which equal to user command
    const command = Object.values(commands)
      .map((f) => {
        if (typeof f.command === "string" && f.command === cmd) return f;
        else if (f.command instanceof Array && f.command.includes(cmd))
          return f;
        else if (f.command instanceof RegExp && f.command.test(cmd)) return f;
      })
      .filter((f) => f)[0];

    // Ignore if command not found;
    if (!command) return;
    try {
      // Execute command when command exist
      await command.exec(sock, m, args);
    } catch (err) {
      // Show command error
      console.log(err);
    }
  });
};

connectToWhatsApp();
