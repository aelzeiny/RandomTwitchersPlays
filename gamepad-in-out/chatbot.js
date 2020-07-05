const tmi = require('tmi.js');
const db = require('./db');
const { host, twitchChannel, twitchBotPassword } = require('./configs');


const client = new tmi.client({
    options: { debug: true },
    connection: {
		secure: true,
		reconnect: true
	},
    identity: {
        username: twitchChannel,
        password: twitchBotPassword
    },
    channels: [twitchChannel]
});

const cmds = {
    '!join': async (username) => {
        const uuid = await db.enqueue(username);
        return [
            `Welcome ${username}! I sent you a private message. Please check your whispers for instructions.`,
            `/w @${username} We made you a secret URL. Please don't share it with anyone, or someone else can take your spot in line.`,
            `/w @${username} Follow me to the URL below for further instructions.`,
            `/w @${username} ${host}/${uuid}`
        ];
    },
    '!leave': async (username) => {
        return `@${username} Are you sure? You'll lose your spot in line. Type in !goodbye to confirm.`
    },
    '!goodbye': async (username) => {
        await db.dequeueUser(username);
        return `Goodbye, ${username}! We hope you can "!join" us again soon!`
    },
    '!queue': async (_) => {
        const usernames = await db.getQueueUsernames();
        return usernames.map((el, idx) => `(${idx + 1}) @${el}`).join(', ');
    },
    '!line': async (_) => {
        const usernames = await db.getQueueUsernames();
        return usernames.map((el, idx) => `${idx + 1}: @${el}`).join(', ');
    },
    '!help': async (_) => [
        "!join to enter the queue",
        "!queue to track your status",
        "!leave to exit the queue",
        "!help to see this menu again"
    ]
};

client.on('connected', (addr, port) => {
    console.log(`* Connected to ${addr}:${port}`);

    // Register our event handlers (defined below)
    client.on('message', async (target, context, msg, isMe) => {
        if (isMe)
            return;
        const cmd = msg.trim();
        if (cmd.startsWith('!') && cmd in cmds) {
            const func = cmds[cmd];
            const chatStrings = await func(context.username);
            if (chatStrings instanceof Array)
                chatStrings.forEach((msg) => client.say(twitchChannel, msg));
            else
                client.say(twitchChannel, chatStrings);
        }
    });
});

client.connect();