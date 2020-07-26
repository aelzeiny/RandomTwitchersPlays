import json
import os
from twitchio.ext import commands
from twitchio.dataclasses import Context
from apis import AppApi, forever

TWITCH_CHANNEL = 'RandomTwitchersPlay'
BOT_NICK = 'RandomTwitchersPlay'
api = AppApi()


# set up the bot
bot = commands.Bot(
    irc_token=os.environ['TWITCH_IRC_TOKEN'],
    client_id='RandomTwitchersPlay',
    nick=BOT_NICK,
    prefix='!',
    initial_channels=[TWITCH_CHANNEL]
)


@bot.event
async def event_ready():
    """Called once when the bot goes online."""
    print(f"RandomTwitchersPlay is online!")
    await bot._ws.send_privmsg(TWITCH_CHANNEL, f"/me has landed!")  # noqa


@bot.event
async def event_message(ctx):
    """Runs every time a message is sent in chat."""

    # make sure the bot ignores itself and the streamer
    if ctx.author.name.lower() == BOT_NICK.lower():
        return

    await bot.handle_commands(ctx)

    # await ctx.channel.send(ctx.content)

    if 'hello' in ctx.content.lower():
        await ctx.channel.send(f"Hi, @{ctx.author.name}!")


@bot.command(name='join')
async def join(ctx: Context):
    username = ctx.author.name
    url = api.join(username)
    await ctx.send(f'Welcome @{username}! I sent you a private message. Please check your whispers for instructions.')
    await ctx.send_whisper(username, f"We made you a secret URL. Please don't share it with anyone, "
                           f"or someone else can take your spot in line.")
    await ctx.send_whisper(username, url)


@bot.command(name='leave', aliases=['quit', 'exit', 'remove'])
async def leave(ctx: Context):
    await ctx.send(f"@{ctx.author.name} Are you sure? You'll lose your spot in line. Type in !goodbye to confirm.")


@bot.command(name='goodbye')
async def goodbye(ctx: Context):
    api.remove(ctx.author.name)
    await ctx.send(f'Goodbye, @{ctx.author.name}! We hope you can "!join" us again soon!')


@bot.command(name='queue', aliases=['line'])
async def queue(ctx):
    usernames = api.queue_status()
    up_next = [f"({i + 1}) @{d[0]}" for i, d in enumerate(usernames)]
    await ctx.send_me(','.join(up_next))
    for username, is_connected in usernames:
        if not is_connected:
            ctx.send(f"@{username} you're not in the Arena. Please check your private messages (whispers).")


@bot.command(name='position', aliases=['where'])
async def position(ctx):
    if position < 0:
        await ctx.send(f'@{ctx.author.name} type "!join" to enter the queue')
    else:
        await ctx.send(f'@{ctx.author.name} is #{data["position"]} in the queue.')


@bot.command(name='help', aliases=['h', 'ayuda', 'halp'])
async def helper(ctx):
    await ctx.send_me("!join to enter the queue")
    await ctx.send_me("!queue to track your status")
    await ctx.send_me("!leave to exit the queue")
    await ctx.send_me("!cheer @<user> to add time")
    await ctx.send_me("!kick @<user> to kick")
    await ctx.send_me("!help to see this again")


@bot.command(name='ban', aliases=['kick', 'boot', 'kill'])
async def ban(ctx):
    # TODO Add banning abilities
    ctx.send('Not implemented yet. Sorry m8.')


@bot.command(name='cheer', aliases=['add', 'love' 'reward'])
async def cheer(ctx):
    # TODO Add cheering abilities
    ctx.send('Not implemented yet. Sorry m8.')


@forever
async def queue_listener():
    """
    This task just listens in on the app's websocket for changes in the Q, and posts them
    to the channel
    """
    async with api.connect_ws() as websocket:
        while True:
            queue_usernames = json.loads(await websocket.recv())[:5]
            up_next = ', '.join([f"#{i + 1} @{d}" for i, d in enumerate(queue_usernames)])
            await bot._ws.send_privmsg(  # noqa
                TWITCH_CHANNEL,
                f'Comming up: {up_next}'
            )


async def __send_whisper(self, username: str, content: str):
    ws = self._get_socket
    channel, _ = self._get_channel()

    self.check_bucket(channel)
    self.check_content(channel, content)

    await ws.send_privmsg(channel, content=f'.w {username} {content}')
Context.send_whisper = __send_whisper


if __name__ == "__main__":
    bot.loop.create_task(queue_listener())
    bot.run()
