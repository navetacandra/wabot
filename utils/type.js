const { proto, makeInMemoryStore } = require("@whiskeysockets/baileys");
const {
  MiscMessageGenerationOptions,
} = require("@whiskeysockets/baileys/lib/Types/Message");
const { Response } = require("node-fetch");

/**
 * @typedef {Object} protoMessage
 * @property {proto.IWebMessageInfo} [proto] - The base message info from the TypeScript interface.
 */

/**
 * @typedef {Object} protoMessageKey
 * @property {proto.IMessageKey} [proto] - The base message info from the TypeScript interface.
 */

/**
 * @typedef {Object} protoMessageOptions
 * @property {MiscMessageGenerationOptions} [proto] - The base message info from the TypeScript interface.
 */

/** @type {protoMessageOptions} */
const { proto: _messageOptions } = { proto: MiscMessageGenerationOptions };
/** @type {protoMessage} */
const { proto: _message } = { proto: proto.IWebMessageInfo };
/** @type {protoMessageKey} */
const { proto: _messageKey } = { proto: proto.IMessageKey };

/**
 * The WhatsApp API client with various methods for interacting with WhatsApp services.
 * @typedef {Object} _WASocket
 * @property {(code: string) => Promise<import("@whiskeysockets/baileys/lib/Socket/registration").ExistsResponse>} register - Register a user with the provided code.
 * @property {(
 *   registrationOptions?: import("@whiskeysockets/baileys/lib/Socket/registration").RegistrationOptions | undefined
 * ) => Promise<import("@whiskeysockets/baileys/lib/Socket/registration").ExistsResponse>} requestRegistrationCode - Request a registration code for the user.
 * @property {(orderId: string, tokenBase64: string) => Promise<import("@whiskeysockets/baileys/lib/Types").OrderDetails>} getOrderDetails - Get order details for a specific order.
 * @property {(
 *   options: import("@whiskeysockets/baileys/lib/Types").GetCatalogOptions
 * ) => Promise<{
 *   products: import("@whiskeysockets/baileys/lib/Types").Product[];
 *   nextPageCursor: string | undefined;
 * }>} getCatalog - Get a catalog of products with optional filtering options.
 * @property {(
 *   jid?: string | undefined,
 *   limit?: number
 * ) => Promise<{
 *   collections: import("@whiskeysockets/baileys/lib/Types").CatalogCollection[];
 * }>} getCollections - Get collections of products, optionally filtered by JID and limit.
 * @property {(create: import("@whiskeysockets/baileys/lib/Types").ProductCreate) => Promise<import("@whiskeysockets/baileys/lib/Types").Product>} productCreate - Create a new product.
 * @property {(productIds: string[]) => Promise<{
 *   deleted: number;
 * }>} productDelete - Delete products by their IDs.
 * @property {(productId: string, update: import("@whiskeysockets/baileys/lib/Types").ProductUpdate) => Promise<import("@whiskeysockets/baileys/lib/Types").Product>} productUpdate - Update a product with the specified ID.
 * @property {(
 *   node: import("@whiskeysockets/baileys/lib/index").BinaryNode,
 *   forceIncludeKeys?: boolean
 * ) => Promise<void>} sendRetryRequest - Send a retry request for a binary node.
 * @property {(callId: string, callFrom: string) => Promise<void>} rejectCall - Reject an incoming call with the given call ID and sender JID.
 * @property {(jids: string[]) => Promise<import("@whiskeysockets/baileys/lib/index").BinaryNode>} getPrivacyTokens - Get privacy tokens for a list of JIDs.
 * @property {(jids: string[], force: boolean) => Promise<boolean>} assertSessions - Assert sessions for a list of JIDs.
 * @property {(jid: string, message: import("@whiskeysockets/baileys/lib/Types").WAProto.IMessage, options: import("@whiskeysockets/baileys/lib/Types").MessageRelayOptions) => Promise<string>} relayMessage - Relay a message to a specific JID with options.
 * @property {(
 *   jid: string,
 *   participant: string | undefined,
 *   messageIds: string[],
 *   type: import("@whiskeysockets/baileys/lib/Types").MessageReceiptType
 * ) => Promise<void>} sendReceipts - Send message receipts to a JID with specified parameters.
 * @property {(
 *   keys: import("@whiskeysockets/baileys/lib/Types").WAProto.IMessageKey[],
 *   type: import("@whiskeysockets/baileys/lib/Types").MessageReceiptType
 * ) => Promise<void>} sendReceipts - Send message receipts for multiple message keys with a specified type.
 * @property {(keys: import("@whiskeysockets/baileys/lib/Types").WAProto.IMessageKey[]) => Promise<void>} readMessages - Mark messages as read using message keys.
 * @property {(
 *   forceGet?: boolean
 * ) => Promise<import("@whiskeysockets/baileys/lib/Types").MediaConnInfo>} refreshMediaConn - Refresh the media connection with an optional force flag.
 * @property {import("@whiskeysockets/baileys/lib/Types").WAMediaUploadFunction} waUploadToServer - Upload media to the WhatsApp server.
 * @property {(
 *   force?: boolean
 * ) => Promise<{
 *   [_: string]: string;
 * }>} fetchPrivacySettings - Fetch privacy settings with an optional force flag.
 * @property {(message: import("@whiskeysockets/baileys/lib/Types").WAProto.IWebMessageInfo) => Promise<import("@whiskeysockets/baileys/lib/Types").WAProto.IWebMessageInfo>} updateMediaMessage - Update a media message.
 * @property {(
 *   jid: string,
 *   content: import("@whiskeysockets/baileys/lib/Types").AnyMessageContent,
 *   options?: import("@whiskeysockets/baileys/lib/Types").MiscMessageGenerationOptions | undefined
 * ) => Promise<import("@whiskeysockets/baileys/lib/Types").WAProto.WebMessageInfo | undefined>} sendMessage - Send a message to a specific JID with content and optional options.
 * @property {(jid: string) => Promise<import("@whiskeysockets/baileys/lib/Types").GroupMetadata>} groupMetadata - Get group metadata for a specific JID.
 * @property {(subject: string, participants: string[]) => Promise<import("@whiskeysockets/baileys/lib/Types").GroupMetadata>} groupCreate - Create a new group with a subject and participants.
 * @property {(id: string) => Promise<void>} groupLeave - Leave a group with the specified ID.
 * @property {(jid: string, subject: string) => Promise<void>} groupUpdateSubject - Update the subject of a group with the specified JID.
 * @property {(jid: string) => Promise<{
 *   [key: string]: string;
 * }[]>} groupRequestParticipantsList - Request the list of participants for a group with the specified JID.
 * @property {(jid: string, participants: string[], action: import("@whiskeysockets/baileys/lib/Types").ParticipantAction) => Promise<{
 *   status: string;
 *   jid: string;
 *   content: import("@whiskeysockets/baileys/lib/index").BinaryNode;
 * }[]>} groupParticipantsUpdate - Update group participants with the specified JID, participants, and action.
 * @property {(jid: string, description?: string | undefined) => Promise<void>} groupUpdateDescription - Update the description of a group with the specified JID.
 * @property {(jid: string) => Promise<string | undefined>} groupInviteCode - Get the invite code for a group with the specified JID.
 * @property {(jid: string) => Promise<string | undefined>} groupRevokeInvite - Revoke the invite code for a group with the specified JID.
 * @property {(code: string) => Promise<string | undefined>} groupAcceptInvite - Accept a group invite with a code.
 * @property {(key: string | import("@whiskeysockets/baileys/lib/Types").WAProto.IMessageKey, inviteMessage: import("@whiskeysockets/baileys/lib/Types").WAProto.Message.IGroupInviteMessage) => Promise<string>} groupAcceptInviteV4 - Accept a group invite with version 4 parameters.
 * @property {(code: string) => Promise<import("@whiskeysockets/baileys/lib/Types").GroupMetadata>} groupGetInviteInfo - Get group metadata for a group with the specified invite code.
 * @property {(jid: string, ephemeralExpiration: number) => Promise<void>} groupToggleEphemeral - Toggle group ephemeral mode with a specified JID and expiration time.
 * @property {(jid: string, setting: "announcement" | "locked" | "not_announcement" | "unlocked") => Promise<void>} groupSettingUpdate - Update group settings with a specified JID and setting type.
 * @property {() => Promise<{
 *   [_: string]: import("@whiskeysockets/baileys/lib/Types").GroupMetadata;
 * }>} groupFetchAllParticipating - Fetch metadata for all participating groups.
 * @property {{ mutex<T>(code: () => T | Promise<T>): Promise<T> }} processingMutex - A mutex object for handling code execution.
 * @property {(msg: import("@whiskeysockets/baileys/lib/Types").WAProto.IWebMessageInfo, type: import("@whiskeysockets/baileys/lib/Types").MessageUpsertType) => Promise<void>} upsertMessage - Upsert a message with the specified type.
 * @property {(patchCreate: import("@whiskeysockets/baileys/lib/Types").WAPatchCreate) => Promise<void>} appPatch - Apply a patch to the app with the given patch create object.
 * @property {(type: import("@whiskeysockets/baileys/lib/Types").WAPresence, toJid?: string | undefined) => Promise<void>} sendPresenceUpdate - Send a presence update with an optional target JID.
 * @property {(toJid: string, tcToken?: Buffer | undefined) => Promise<void>} presenceSubscribe - Subscribe to the presence updates of a specific JID.
 * @property {(
 *   jid: string,
 *   type?: "image" | "preview",
 *   timeoutMs?: number | undefined
 * ) => Promise<string | undefined>} profilePictureUrl - Get the URL of a profile picture with optional parameters.
 * @property {(...jids: string[]) => Promise<{
 *   exists: boolean;
 *   jid: string;
 * }[]>} onWhatsApp - Check if WhatsApp accounts exist for multiple JIDs.
 * @property {() => Promise<string[]>} fetchBlocklist - Fetch the user's blocklist.
 * @property {(jid: string) => Promise<{
 *   status: string | undefined;
 *   setAt: Date;
 * } | undefined>} fetchStatus - Fetch the status of a contact with the specified JID.
 * @property {(jid: string, content: import("@whiskeysockets/baileys/lib/Types").WAMediaUpload) => Promise<void>} updateProfilePicture - Update the profile picture of the user.
 * @property {(jid: string) => Promise<void>} removeProfilePicture - Remove the profile picture of the user.
 * @property {(status: string) => Promise<void>} updateProfileStatus - Update the user's profile status.
 * @property {(name: string) => Promise<void>} updateProfileName - Update the user's profile name.
 * @property {(jid: string, action: "block" | "unblock") => Promise<void>} updateBlockStatus - Update the block status of a contact with the specified JID.
 * @property {(value: import("@whiskeysockets/baileys/lib/Types").WAPrivacyValue) => Promise<void>} updateLastSeenPrivacy - Update the privacy settings for last seen status.
 * @property {(value: import("@whiskeysockets/baileys/lib/Types").WAPrivacyOnlineValue) => Promise<void>} updateOnlinePrivacy - Update the privacy settings for online status.
 * @property {(value: import("@whiskeysockets/baileys/lib/Types").WAPrivacyValue) => Promise<void>} updateProfilePicturePrivacy - Update the privacy settings for profile pictures.
 * @property {(value: import("@whiskeysockets/baileys/lib/Types").WAPrivacyValue) => Promise<void>} updateStatusPrivacy - Update the privacy settings for status updates.
 * @property {(value: import("@whiskeysockets/baileys/lib/Types").WAReadReceiptsValue) => Promise<void>} updateReadReceiptsPrivacy - Update the privacy settings for read receipts.
 * @property {(value: import("@whiskeysockets/baileys/lib/Types").WAPrivacyValue) => Promise<void>} updateGroupsAddPrivacy - Update the privacy settings for group adds.
 * @property {(duration: number) => Promise<void>} updateDefaultDisappearingMode - Update the default disappearing mode duration.
 * @property {(jid: string) => Promise<void | import("@whiskeysockets/baileys/lib/Types").WABusinessProfile>} getBusinessProfile - Get the business profile of a contact with the specified JID.
 * @property {(
 *   collections: readonly (
 *     | "critical_block"
 *     | "critical_unblock_low"
 *     | "regular_high"
 *     | "regular_low"
 *     | "regular"
 *   )[],
 *   isInitialSync: boolean
 * ) => Promise<void>} resyncAppState - Resynchronize the app state with specified collections and sync state.
 * @property {(mod: import("@whiskeysockets/baileys/lib/Types").ChatModification, jid: string) => Promise<void>} chatModify - Modify a chat with a specified modification and JID.
 * @property {(
 *   type: "account_sync" | "groups",
 *   fromTimestamp?: string | number | undefined
 * ) => Promise<void>} cleanDirtyBits - Clean dirty bits for a specified type with an optional timestamp.
 * @property {(jid: string, labelId: string) => Promise<void>} addChatLabel - Add a label to a chat with the specified JID and label ID.
 * @property {(jid: string, labelId: string) => Promise<void>} removeChatLabel - Remove a label from a chat with the specified JID and label ID.
 * @property {(jid: string, messageId: string, labelId: string) => Promise<void>} addMessageLabel - Add a label to a message with the specified JID, message ID, and label ID.
 * @property {(jid: string, messageId: string, labelId: string) => Promise<void>} removeMessageLabel - Remove a label from a message with the specified JID, message ID, and label ID.
 * @property {string} type - The type of the WhatsApp client, which is "md" (metadata).
 * @property {
 *   import("@whiskeysockets/baileys/lib/Socket/Client/mobile-socket-client").MobileSocketClient | import("@whiskeysockets/baileys/lib/Socket/Client/web-socket-client").WebSocketClient
 * } ws - The WebSocket client for mobile or web.
 * @property {import("@whiskeysockets/baileys/lib/Types").BaileysEventEmitter & {
 *   process(handler: (events: Partial<import("@whiskeysockets/baileys/lib/Types").BaileysEventMap>) => void | Promise<void>): () => void;
 *   buffer(): void;
 *   createBufferedFunction<A extends any[], T_1>(
 *     work: (...args: A) => Promise<T_1>
 *   ): (...args: A) => Promise<T_1>;
 *   flush(force?: boolean | undefined): boolean;
 *   isBuffering(): boolean;
 * }} ev - The event emitter with various event processing methods.
 * @property {{
 *   creds: import("@whiskeysockets/baileys/lib/Types").AuthenticationCreds;
 *   keys: import("@whiskeysockets/baileys/lib/Types").SignalKeyStoreWithTransaction;
 * }} authState - The authentication state with credentials and keys.
 * @property {import("@whiskeysockets/baileys/lib/Types").SignalRepository} signalRepository - The Signal protocol repository.
 * @property {import("@whiskeysockets/baileys/lib/Types").Contact | undefined} user - The user's contact information if available.
 * @property {() => string} generateMessageTag - Generate a message tag.
 * @property {(
 *   node: import("@whiskeysockets/baileys/lib/index").BinaryNode,
 *   timeoutMs?: number | undefined
 * ) => Promise<import("@whiskeysockets/baileys/lib/index").BinaryNode>} query - Query a binary node with an optional timeout.
 * @property {<T_2>(
 *   msgId: string,
 *   timeoutMs?: number | undefined
 * ) => Promise<T_2>} waitForMessage - Wait for a message with a specific message ID and optional timeout.
 * @property {() => Promise<void>} waitForSocketOpen - Wait for the WebSocket connection to be open.
 * @property {(data: Uint8Array | Buffer) => Promise<void>} sendRawMessage - Send a raw binary message.
 * @property {(frame: import("@whiskeysockets/baileys/lib/index").BinaryNode) => Promise<void>} sendNode - Send a binary node.
 * @property {(msg?: string | undefined) => Promise<void>} logout - Log out of the WhatsApp account with an optional logout message.
 * @property {(error: Error | undefined) => void} end - End the WhatsApp client with an optional error.
 * @property {(count?: number) => Promise<void>} uploadPreKeys - Upload prekeys to the server with an optional count.
 * @property {() => Promise<void>} uploadPreKeysToServerIfRequired - Upload prekeys to the server if required.
 * @property {(phoneNumber: string) => Promise<string>} requestPairingCode - Request a pairing code for a phone number.
 * @property {(
 *   check: (u: Partial<import("@whiskeysockets/baileys/lib/Types").ConnectionState>) => boolean | undefined,
 *   timeoutMs?: number | undefined
 * ) => Promise<void>} waitForConnectionUpdate - Wait for a connection update with a specified check and optional timeout.
 */

const _MessageOptions = {
  ..._messageOptions,
  isMedia: false,
  asDocument: false,
  asSticker: false,
  asGIF: false,
  mention: [],
};

const _ContactMessage = {
  name: "",
  number: "",
};

const _ReplyContent = {
  contact: {
    /** @type {ContactMessage[]} */
    contacts: [],
    displayName: "",
  },
  /** @type {Buffer|string} */
  media: "" || Buffer.alloc(0),
  filename: "",
  caption: "",
};

const fileDetail = {
  res: Response,
  mime: "",
  ext: "",
  data: Buffer.alloc(0),
};

/**
 * @typedef {fileDetail} FileDetail
 * @property {Response} res
 * @property {string} mime
 * @property {ext} mime
 * @property {Buffer} data
 */

/** @type {_WASocket} */
let _sock;

const _SimplifiedSocket = {
  ..._sock,
  author_jid: "",
  author_name: "",
  dbPath: "",
  db: {},
  queue: [],
  store: makeInMemoryStore({}),
  /**
   *
   * @param {function|void} cb
   * @returns {number|undefined}
   */
  addQueue: (cb) => this.queue.push(async () => await cb()),
  /**
   * Get file data from various sources.
   *
   * @param {string|Buffer} path - The path or data source.
   * @returns {Promise<FileDetail|undefined>}
   */
  getFile: async (path) => {},
  /**
   * Send a file message with optional settings.
   *
   * @param {string} jid - The JID to send the file to.
   * @param {string|Buffer} path - The path to the file or data source.
   * @param {string} [filename=''] - The name of the file.
   * @param {string} [caption=''] - The caption for the file.
   * @param {MessageOptions|undefined} options - Additional options for sending the file.
   * @returns {Promise<proto.IWebMessageInfo|undefined>} - A promise indicating the success of the operation.
   */
  sendFile: async (jid, path, filename = "", caption = "", options) => {},
  /**
   * Send a contact message with vCards.
   *
   * @param {string} jid - The JID to send the contact to.
   * @param {ContactMessage[]} contacts - An array of contact objects.
   * @param {string} displayName - The display name for the contacts.
   * @param {MessageOptions|undefined} options - Additional options for sending the contact.
   * @returns {Promise<proto.IWebMessageInfo|undefined>} - A promise indicating the success of the operation.
   */
  sendContact: async (jid, contacts, displayName, options) => {},
};

const _SimplifiedMessage = {
  ..._message,
  key: {
    ..._messageKey,
    author: "",
    fromGroup: false,
    isBaileys: false,
  },
  text: "",
  /**
   *
   * @param {ReplyContent} content
   * @param {MessageOptions} options
   * @returns {Promise<proto.IWebMessageInfo|undefined>}
   */
  reply: (content, options) => {},
};

/**
 * @typedef {_MessageOptions} MessageOptions
 * @property {boolean} isMedia - Send message media
 * @property {boolean} asDocument - Send message as document
 * @property {boolean} asSticker - Send message as sticker
 * @property {boolean} asGIF - Send message as GIF
 * @property {string[]|undefined} mentions - Send message with mentions
 */

/**
 * @typedef {_ContactMessage} ContactMessage
 * @property {string} name
 * @property {string} number
 */

/**
 * @typedef {_ReplyContent|string} ReplyContent
 * @property {Object|undefined} contact
 * @property {ContactMessage[]|undefined} contact.contacts
 * @property {string|undefined} contact.displayName
 * @property {Buffer|string} media
 * @property {string|undefined} [filename='file']
 * @property {string|undefined} [caption='']
 */

/**
 * @typedef {_SimplifiedSocket} SimplifiedSocket
 * @property {string} author_jid
 * @property {string} author_name
 * @property {string} dbPath
 * @property {object} db
 * @property {Array} queue
 * @property {(cb: function|void) => number|undefined} addQueue
 * @property {(path: string|Buffer) => Promise<FileDetail|undefined>} getFile
 * @property {(jid: string, path: string|Buffer, filename?: string, caption?: string, options: MessageOptions|undefined) => Promise<proto.IWebMessageInfo|undefined>} sendFile
 * @property {(jid: string, contacts: ContactMessage[], displayName: string, options: MessageOptions|undefined) => Promise<proto.IWebMessageInfo|undefined>} sendContact
 */

/**
 * @typedef {_SimplifiedMessage} SimplifiedMessage
 * @property {string} key.author - Message author
 * @property {boolean} key.fromGroup - Is message sent in group
 * @property {boolean} key.isBaileys - Is message sent by baileys
 * @property {string} text - Message text/caption
 * @property {(content: ReplyContent|string, options: MessageOptions) => Promise<proto.IWebMessageInfo|undefined>} reply - Reply message
 */

module.exports = {
  _WASocket,
  SimplifiedSocket,
  SimplifiedMessage,
  MessageOptions,
  ReplyContent,
  ContactMessage,
};
