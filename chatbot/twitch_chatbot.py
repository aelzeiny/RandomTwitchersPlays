import os
from twitchio.ext import commands
from twitchio.dataclasses import Context
import requests
import json


TWITCH_CHANNEL = 'RandomTwitchersPlay'
BOT_NICK = 'RandomTwitchersPlay'
session = requests.session()
APP_URL = 'https://twitcharena.live'
API_URL = 'https://zei6n2gg47.execute-api.us-east-1.amazonaws.com/dev'


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


@bot.command(name='test')
async def test(ctx: Context):
    await ctx.send_me('test passed!')


@bot.command(name='join')
async def join(ctx: Context):
    username = ctx.author.name
    response = session.put(
        f'{API_URL}/queue',
        json={'username': username}
    )
    response.raise_for_status()
    response_body = response.json()
    unique_id = response_body['uuid']
    await ctx.send(f'Welcome @{username}! I sent you a private message. Please check your whispers for instructions.')
    await ctx.send_whisper(username, f"We made you a secret URL. Please don't share it with anyone, "
                           f"or someone else can take your spot in line.")
    await ctx.send_whisper(username, f"{APP_URL}/queue/{unique_id}")


@bot.command(name='leave', aliases=['quit', 'exit', 'remove'])
async def leave(ctx: Context):
    await ctx.send(f"@{ctx.author.name} Are you sure? You'll lose your spot in line. Type in !goodbye to confirm.")


@bot.command(name='goodbye')
async def goodbye(ctx: Context):
    response = session.delete(
        f'{API_URL}/queue',
        json={'username': ctx.author.name}
    )
    response.raise_for_status()
    await ctx.send(f'Goodbye, @{ctx.author.name}! We hope you can "!join" us again soon!')


@bot.command(name='queue', aliases=['line'])
async def queue(ctx):
    response = session.get(f'{API_URL}/queue')
    response.raise_for_status()
    data = response.json()
    up_next = [f"({i + 1}) @{d['username']}" for i, d in enumerate(data)]
    await ctx.send_me(','.join(up_next))
    for d in data:
        if not d['is_connected']:
            ctx.send(f"@{d['username']} you're not in the Arena. Please check your private messages (whispers).")


@bot.command(name='position', aliases=['where'])
async def position(ctx):
    response = session.get(f'{API_URL}/user/{ctx.author.name}')
    response.raise_for_status()
    data = response.json()
    position = data['position']
    if position < 0:
        await ctx.send(f'@{ctx.author.name} type "!join" to enter the queue')
    else:
        await ctx.send(f'@{ctx.author.name} is #{data["position"]} in the queue.')


async def __send_whisper(self, username: str, content: str):
    ws = self._get_socket
    channel, _ = self._get_channel()

    self.check_bucket(channel)
    self.check_content(channel, content)

    await ws.send_privmsg(channel, content=f'.w {username} {content}')
Context.send_whisper = __send_whisper


if __name__ == "__main__":
    bot.run()