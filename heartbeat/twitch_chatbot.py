import asyncio
import json
import os
import logging
from twitchio.ext import commands
from twitchio.dataclasses import Context
from apis import AppApi, forever

log = logging.root.getChild(__name__)
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
    log.info("RandomTwitchersPlay is online!")
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
    url = api.queue_join(username)
    log.info(f'{ctx.author.name} joining queue @{url}')
    await ctx.send(f'Welcome @{username}! Please wait in line here: {url}.')


@bot.command(name='leave', aliases=['quit', 'exit', 'remove'])
async def leave(ctx: Context):
    await ctx.send(f"@{ctx.author.name} Are you sure? You'll lose your spot in line. Type in !goodbye to confirm.")


@bot.command(name='goodbye')
async def goodbye(ctx: Context):
    log.info(f'{ctx.author.name} leaving queue')
    api.queue_remove(ctx.author.name)
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
    username = ctx.author.name
    api.queue_position(username)
    if position < 0:
        await ctx.send(f'@{username} type "!join" to enter the queue')
    else:
        await ctx.send(f'@{username} is #{username} in the queue.')


@bot.command(name='help', aliases=['h', 'ayuda', 'halp'])
async def helper(ctx):
    await ctx.send_me("!join to enter the queue")
    await ctx.send_me("!queue to track your status")
    await ctx.send_me("!leave to exit the queue")
    await ctx.send_me("!cheer @<user> adds time")
    await ctx.send_me("!kick @<user> to kick")
    await ctx.send_me("!help to see this again")


@bot.command(name='ban', aliases=['kick', 'boot', 'kill'])
async def ban(ctx):
    # TODO Add banning abilities
    await ctx.send('Not implemented yet. Sorry m8.')


@bot.command(name='cheer', aliases=['add', 'love' 'reward'])
async def cheer(ctx):
    # TODO Add cheering abilities
    await ctx.send('Not implemented yet. Sorry m8.')


@forever
async def queue_listener():
    """
    This task just listens in on the app's websocket for changes in the Q, and posts them
    to the channel
    """
    async with api.connect_ws() as websocket:
        while True:
            queue_usernames = json.loads(await websocket.recv())[:5]
            if queue_usernames:
                up_next = ', '.join([f"#{i + 1} @{d}" for i, d in enumerate(queue_usernames)])
                log.info(f'Next: {queue_usernames}')
                await bot._ws.send_privmsg(  # noqa
                    TWITCH_CHANNEL,
                    f'Coming up: {up_next}'
                )
            else:
                await bot._ws.send_privmsg(
                    TWITCH_CHANNEL,
                    f'Queue is empty. Type "!join" to enter!'
                )


@forever
async def spam_help():
    while True:
        await asyncio.sleep(300)
        await bot._ws.send_privmsg(
            TWITCH_CHANNEL,
            'Welcome to Twitch Arena. Type "!join" to enter queue, or "!help" for more options'
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
