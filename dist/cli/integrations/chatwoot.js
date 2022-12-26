"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupChatwootOutgoingMessageHandler = exports.chatwootMiddleware = exports.chatwoot_webhook_check_event_name = void 0;
const uuid_apikey_1 = __importDefault(require("uuid-apikey"));
const __1 = require("../..");
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const mime_types_1 = __importDefault(require("mime-types"));
const contactReg = {
    //WID : chatwoot contact ID
    "example@c.us": "1"
};
const convoReg = {
    //WID : chatwoot conversation ID
    "example@c.us": "1"
};
const ignoreMap = {
    "example_message_id": true
};
exports.chatwoot_webhook_check_event_name = "cli.integrations.chatwoot.check";
const chatwootMiddleware = (cliConfig, client) => {
    return (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const processMesssage = () => __awaiter(void 0, void 0, void 0, function* () {
            const promises = [];
            const { body } = req;
            if (!body)
                return;
            if (!body.conversation)
                return;
            const m = body.conversation.messages[0];
            const contact = (body.conversation.meta.sender.phone_number || "").replace('+', '');
            if (body.message_type === "incoming" ||
                body.private ||
                body.event !== "message_created" ||
                !m ||
                !contact)
                return;
            const { attachments, content } = m;
            const to = `${contact}@c.us`;
            if (!convoReg[to])
                convoReg[to] = body.conversation.id;
            if ((attachments === null || attachments === void 0 ? void 0 : attachments.length) > 0) {
                //has attachments
                const [firstAttachment, ...restAttachments] = attachments;
                const sendAttachment = (attachment, c) => __awaiter(void 0, void 0, void 0, function* () { return attachment && client.sendImage(to, attachment.data_url, attachment.data_url.substring(attachment.data_url.lastIndexOf('/') + 1), c || '', null, true); });
                //send the text as the caption with the first message only
                promises.push(sendAttachment(firstAttachment, content));
                ((restAttachments || []).map(attachment => sendAttachment(attachment)) || []).map(p => promises.push(p));
            }
            else {
                //no attachments
                if (!content)
                    return;
                /**
                 * Check if this is a location message
                 */
                const locationMatcher = /@(\-*\d*\.*\d*\,\-*\d*\.*\d*)/g;
                const [possLoc, ...restMessage] = content.split(' ');
                const locArr = possLoc.match(locationMatcher);
                if (locArr) {
                    const [lat, lng] = locArr[0].split(',');
                    //grab the location message
                    const loc = restMessage.join(' ') || '';
                    promises.push(client.sendLocation(to, lat, lng, loc));
                }
                else {
                    //not a location message
                    /**
                     * Check for url
                     */
                    const urlregex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
                    if (content.match(urlregex) && content.match(urlregex)[0]) {
                        promises.push(client.sendLinkWithAutoPreview(to, content.match(urlregex)[0], content));
                    }
                    else
                        promises.push(client.sendText(to, content));
                }
            }
            const outgoingMessageIds = yield Promise.all(promises);
            __1.log.info(`Outgoing message IDs: ${JSON.stringify(outgoingMessageIds)}`);
            /**
             * Add these message IDs to the ignore map
             */
            outgoingMessageIds.map(id => ignoreMap[`${id}`] = true);
            return outgoingMessageIds;
        });
        try {
            const processAndSendResult = yield processMesssage();
            res.status(200).send(processAndSendResult);
        }
        catch (error) {
            console.log("🚀 ~ file: chatwoot.ts ~ line 62 ~ return ~ error", error);
            res.status(400).send(error);
        }
        return;
    });
};
exports.chatwootMiddleware = chatwootMiddleware;
const setupChatwootOutgoingMessageHandler = (cliConfig, client) => __awaiter(void 0, void 0, void 0, function* () {
    __1.log.info(`Setting up chatwoot integration: ${cliConfig.chatwootUrl}`);
    const u = cliConfig.chatwootUrl; //e.g `"localhost:3000/api/v1/accounts/3"
    const api_access_token = cliConfig.chatwootApiAccessToken;
    const _u = new URL(u);
    const origin = _u.origin;
    const port = _u.port || 80;
    const accountNumber = yield client.getHostNumber();
    const proms = [];
    let expectedSelfWebhookUrl = cliConfig.apiHost ? `${cliConfig.apiHost}/chatwoot ` : `${cliConfig.host.includes('http') ? '' : `http${cliConfig.https || (cliConfig.cert && cliConfig.privkey) ? 's' : ''}://`}${cliConfig.host}:${cliConfig.port}/chatwoot `;
    expectedSelfWebhookUrl = expectedSelfWebhookUrl.trim();
    if (cliConfig.key)
        expectedSelfWebhookUrl = `${expectedSelfWebhookUrl}?api_key=${cliConfig.key}`;
    let [accountId, inboxId] = (u.match(/\/(app|(api\/v1))\/accounts\/\d*\/(inbox|inboxes)\/\d*/g) || [''])[0].split('/').filter(Number);
    inboxId = inboxId || u.match(/inboxes\/\d*/g) && u.match(/inboxes\/\d*/g)[0].replace('inboxes/', '');
    // const accountId = u.match(/accounts\/\d*/g) && u.match(/accounts\/\d*/g)[0].replace('accounts/', '')
    /**
     * Is the inbox and or account id undefined??
     */
    if (!accountId) {
        __1.log.info(`CHATWOOT INTEGRATION: account ID missing. Attempting to infer from access token....`);
        /**
         * If the account ID is undefined then get the account ID from the access_token
         */
        accountId = (yield axios_1.default.get(`${origin}/api/v1/profile`, { headers: { api_access_token } })).data.account_id;
        __1.log.info(`CHATWOOT INTEGRATION: Got account ID: ${accountId}`);
    }
    if (!inboxId) {
        __1.log.info(`CHATWOOT INTEGRATION: inbox ID missing. Attempting to find correct inbox....`);
        /**
         * Find the inbox with the correct setup.
         */
        const inboxArray = (yield axios_1.default.get(`${origin}/api/v1/accounts/${accountId}/inboxes`, { headers: { api_access_token } })).data.payload;
        const possibleInbox = inboxArray.find(inbox => { var _a; return ((_a = inbox === null || inbox === void 0 ? void 0 : inbox.additional_attributes) === null || _a === void 0 ? void 0 : _a.hostAccountNumber) === accountNumber; });
        if (possibleInbox) {
            __1.log.info(`CHATWOOT INTEGRATION: found inbox: ${JSON.stringify(possibleInbox)}`);
            __1.log.info(`CHATWOOT INTEGRATION: found inbox id: ${possibleInbox.channel_id}`);
            inboxId = possibleInbox.channel_id;
        }
        else {
            __1.log.info(`CHATWOOT INTEGRATION: inbox not found. Attempting to create inbox....`);
            /**
             * Create inbox
             */
            const { data: new_inbox } = (yield axios_1.default.post(`${origin}/api/v1/accounts/${accountId}/inboxes`, {
                "name": `open-wa-${accountNumber}`,
                "channel": {
                    "phone_number": `${accountNumber}`,
                    "type": "api",
                    "webhook_url": expectedSelfWebhookUrl,
                    "additional_attributes": {
                        "sessionId": client.getSessionId(),
                        "hostAccountNumber": `${accountNumber}`
                    }
                }
            }, { headers: { api_access_token } }));
            inboxId = new_inbox.id;
            __1.log.info(`CHATWOOT INTEGRATION: inbox created. id: ${inboxId}`);
        }
    }
    const cwReq = (method, path, data, _headers) => {
        const url = `${origin}/api/v1/accounts/${accountId}/${path}`.replace('app.bentonow.com', 'chat.bentonow.com');
        // console.log(url,method,data)
        return (0, axios_1.default)({
            method,
            data,
            url,
            headers: Object.assign({ api_access_token }, _headers)
        }).catch(error => {
            var _a, _b;
            __1.log.error(`CW REQ ERROR: ${(_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status} ${(_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.message}`, error === null || error === void 0 ? void 0 : error.toJSON());
            throw error;
        });
    };
    let { data: get_inbox } = yield cwReq('get', `inboxes/${inboxId}`);
    /**
     * Update the webhook
     */
    const updatePayload = {
        "channel": {
            "additional_attributes": {
                "sessionId": client.getSessionId(),
                "hostAccountNumber": `${accountNumber}`,
                "instanceId": `${client.getInstanceId()}`
            }
        }
    };
    if (cliConfig.forceUpdateCwWebhook)
        updatePayload.channel['webhook_url'] = expectedSelfWebhookUrl;
    const updateInboxPromise = cwReq('patch', `inboxes/${inboxId}`, updatePayload);
    if (cliConfig.forceUpdateCwWebhook)
        get_inbox = (yield updateInboxPromise).data;
    else
        proms.push(updateInboxPromise);
    /**
     * Get the inbox and test it.
     */
    if (!((get_inbox === null || get_inbox === void 0 ? void 0 : get_inbox.webhook_url) || "").includes("/chatwoot"))
        console.log("Please set the chatwoot inbox webhook to this sessions URL with path /chatwoot");
    /**
     * Check the webhook URL
     */
    const chatwootWebhookCheck = () => __awaiter(void 0, void 0, void 0, function* () {
        let checkCodePromise;
        const cancelCheckProm = () => (checkCodePromise.cancel && typeof checkCodePromise.cancel === "function") && checkCodePromise.cancel();
        try {
            const wUrl = get_inbox.webhook_url.split('?')[0].replace(/\/+$/, "").trim();
            const checkWhURL = `${wUrl}${wUrl.endsWith("/") ? '' : `/`}checkWebhook${cliConfig.key ? `?api_key=${cliConfig.key}` : ''}`;
            __1.log.info(`Verifying webhook url: ${checkWhURL}`);
            const checkCode = uuid_apikey_1.default.create().apiKey; //random generated string
            yield new Promise((resolve, reject) => __awaiter(void 0, void 0, void 0, function* () {
                var _a;
                checkCodePromise = __1.ev.waitFor(exports.chatwoot_webhook_check_event_name, 5000).catch(reject);
                yield axios_1.default.post(checkWhURL, {
                    checkCode
                }, { headers: { api_key: cliConfig.key || '' } }).catch(reject);
                const checkCodeResponse = yield checkCodePromise;
                if (checkCodeResponse && ((_a = checkCodeResponse[0]) === null || _a === void 0 ? void 0 : _a.checkCode) == checkCode)
                    resolve(true);
                else
                    reject(`Webhook check code is incorrect. Expected ${checkCode} - incoming ${((checkCodeResponse || [])[0] || {}).checkCode}`);
            }));
            __1.log.info('Chatwoot webhook verification successful');
        }
        catch (error) {
            cancelCheckProm();
            const e = `Unable to verify the chatwoot webhook URL on this inbox: ${error.message}`;
            console.error(e);
            __1.log.error(e);
        }
        finally {
            cancelCheckProm();
        }
    });
    proms.push(chatwootWebhookCheck());
    /**
     * Get Contacts and conversations
     */
    const searchContact = (number) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const n = number.replace('@c.us', '');
            const { data } = yield cwReq('get', `contacts/search?q=${n}&sort=phone_number`);
            if (data.payload.length) {
                return data.payload.find(x => (x.phone_number || "").includes(n)) || false;
            }
            else
                false;
        }
        catch (error) {
            return;
        }
    });
    const getContactConversation = (number) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { data } = yield cwReq('get', `contacts/${contactReg[number]}/conversations`);
            const allContactConversations = data.payload.filter(c => c.inbox_id === inboxId).sort((a, b) => a.id - b.id);
            const [opened, notOpen] = [allContactConversations.filter(c => c.status === 'open'), allContactConversations.filter(c => c.status != 'open')];
            const hasOpenConvo = opened[0] ? true : false;
            const resolvedConversation = opened[0] || notOpen[0];
            if (!hasOpenConvo) {
                //reopen convo
                yield openConversation(resolvedConversation.id);
            }
            return resolvedConversation;
        }
        catch (error) {
            return;
        }
    });
    const createConversation = (contact_id) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { data } = yield cwReq('post', `conversations`, {
                contact_id,
                "inbox_id": inboxId
            });
            return data;
        }
        catch (error) {
            return;
        }
    });
    const createContact = (contact) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { data } = yield cwReq('post', `contacts`, {
                "identifier": contact.id,
                "name": contact.formattedName || contact.id,
                "phone_number": `+${contact.id.replace('@c.us', '')}`,
                "avatar_url": contact.profilePicThumbObj.eurl
            });
            return data.payload.contact;
        }
        catch (error) {
            return;
        }
    });
    const openConversation = (conversationId, status = "opened") => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { data } = yield cwReq('post', `conversations/${conversationId}/messages`, {
                status
            });
            return data;
        }
        catch (error) {
            return;
        }
    });
    const sendConversationMessage = (content, contactId, message) => __awaiter(void 0, void 0, void 0, function* () {
        __1.log.info(`INCOMING MESSAGE ${contactId}: ${content} ${message.id}`);
        try {
            const { data } = yield cwReq('post', `conversations/${convoReg[contactId]}/messages`, {
                content,
                "message_type": message.fromMe ? "outgoing" : "incoming",
                "private": false
            });
            return data;
        }
        catch (error) {
            return;
        }
    });
    const sendAttachmentMessage = (content, contactId, message) => __awaiter(void 0, void 0, void 0, function* () {
        // decrypt message
        const file = yield client.decryptMedia(message);
        __1.log.info(`INCOMING MESSAGE ATTACHMENT ${contactId}: ${content} ${message.id}`);
        let formData = new form_data_1.default();
        formData.append('attachments[]', Buffer.from(file.split(',')[1], 'base64'), {
            knownLength: 1,
            filename: `${message.t}.${mime_types_1.default.extension(message.mimetype)}`,
            contentType: (file.match(/[^:\s*]\w+\/[\w-+\d.]+(?=[;| ])/) || ["application/octet-stream"])[0]
        });
        formData.append('content', content);
        formData.append('message_type', 'incoming');
        try {
            const { data } = yield cwReq('post', `conversations/${convoReg[contactId]}/messages`, formData, formData.getHeaders());
            return data;
        }
        catch (error) {
            return;
        }
    });
    const processWAMessage = (message) => __awaiter(void 0, void 0, void 0, function* () {
        var _b;
        if (message.chatId.includes('g')) {
            //chatwoot integration does not support group chats
            return;
        }
        /**
         * Does the contact exist in chatwoot?
         */
        if (!contactReg[message.chatId]) {
            const contact = yield searchContact(message.chatId);
            if (contact) {
                contactReg[message.chatId] = contact.id;
            }
            else {
                //create the contact
                contactReg[message.chatId] = (yield createContact(message.sender)).id;
            }
        }
        if (!convoReg[message.chatId]) {
            const conversation = yield getContactConversation(message.chatId);
            if (conversation) {
                convoReg[message.chatId] = conversation.id;
            }
            else {
                //create the conversation
                convoReg[message.chatId] = (yield createConversation(contactReg[message.chatId])).id;
            }
        }
        /**
         * Does the conversation exist in
         */
        let text = message.body;
        let hasAttachments = false;
        switch (message.type) {
            case 'location':
                text = `Location Message:\n\n${message.loc}\n\nhttps://www.google.com/maps?q=${message.lat},${message.lng}`;
                break;
            case 'buttons_response':
                text = message.selectedButtonId;
                break;
            case 'document':
            case 'image':
            case 'audio':
            case 'ptt':
            case 'video':
                if (message.cloudUrl) {
                    text = `FILE:\t${message.cloudUrl}\n\nMESSAGE:\t${message.text}`;
                }
                else {
                    text = message.text;
                    hasAttachments = true;
                }
                break;
            default:
                text = ((_b = message === null || message === void 0 ? void 0 : message.ctwaContext) === null || _b === void 0 ? void 0 : _b.sourceUrl) ? `${message.body}\n\n${message.ctwaContext.sourceUrl}` : message.body || "__UNHANDLED__";
                break;
        }
        if (hasAttachments)
            yield sendAttachmentMessage(text, message.chatId, message);
        else
            yield sendConversationMessage(text, message.chatId, message);
    });
    // const inboxId = s.match(/conversations\/\d*/g) && s.match(/conversations\/\d*/g)[0].replace('conversations/','')
    /**
     * Update the chatwoot contact and conversation registries
     */
    const setOnMessageProm = client.onMessage(processWAMessage);
    const setOnAckProm = client.onAck((ackEvent) => __awaiter(void 0, void 0, void 0, function* () {
        if (ackEvent.ack == 1 && ackEvent.isNewMsg && ackEvent.self === "in") {
            if (ignoreMap[ackEvent.id]) {
                delete ignoreMap[ackEvent.id];
                return;
            }
            const _message = yield client.getMessageById(ackEvent.id);
            return yield processWAMessage(_message);
        }
        return;
    }));
    proms.push(setOnMessageProm);
    proms.push(setOnAckProm);
    yield Promise.all(proms);
    return;
});
exports.setupChatwootOutgoingMessageHandler = setupChatwootOutgoingMessageHandler;
