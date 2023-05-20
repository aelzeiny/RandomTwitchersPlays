import asyncio
import logging

from twitchio import AuthenticationError
from twitchio.ext import commands
from twitchio.ext.commands import Context
from asyncio import Queue

import auth
import constants
import store
import traffic_api
from constants import TWITCH_CHANNEL

log = logging.root.getChild(__name__)


class Bot(commands.Bot):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._http.client_id = constants.TWITCH_CLIENT_ID

    async def event_ready(self):
        for chan in self.connected_channels:
            await chan.send('/me has landed!')

    @commands.command(name='join')
    async def join(self, ctx: Context):
        username = ctx.author.name
        log.info(f'{ctx.author.name} joining queue @{constants.APP_EXTERNAL_URL}')
        await ctx.send(f'Welcome @{username}! Please wait in line here: {constants.APP_EXTERNAL_URL}')

    @commands.command(name='leave', aliases=['quit', 'exit', 'remove'])
    async def leave(self, ctx: Context):
        await ctx.send(f"@{ctx.author.name} Are you sure? You'll lose your spot in line. Type in !goodbye to confirm.")

    @commands.command(name='goodbye')
    async def goodbye(self, ctx: Context):
        log.info(f'{ctx.author.name} leaving queue')
        store.queue_remove(ctx.author.name)
        await ctx.send(f'Goodbye, @{ctx.author.name}! We hope you can "!join" us again soon!')

    @commands.command(name='position', aliases=['where', 'status', 'queue'])
    async def position(self, ctx: Context):
        username = ctx.author.name
        pos = store.queue_rank(username)
        if pos:
            await ctx.send(f'@{username} is #{pos} in the queue.')
        else:
            # check if in stream
            status = await traffic_api.status()
            if username in status.whitelist:
                await ctx.send(f"@{username} you're supposed to be on stream! {constants.APP_EXTERNAL_URL}/queue")
            else:
                await ctx.send(f'@{username} type "!join" to enter the queue')

    @commands.command(name='help', aliases=['h', 'ayuda', 'halp'])
    async def helper(self, ctx: Context):
        await ctx.send("!join to enter the queue")
        await ctx.send("!queue to track your status")
        await ctx.send("!leave to exit the queue")
        # await ctx.send("!cheer @<user> adds time")
        # await ctx.send("!kick @<user> to kick")
        await ctx.send("!help to see this again")

    @commands.command(name='kick', aliases=['ban', 'boot', 'kill'])
    async def kick(self, ctx):
        # TODO Add banning abilities
        await ctx.send('Not implemented yet. Sorry m8.')

    @commands.command(name='cheer', aliases=['add', 'love' 'reward'])
    async def cheer(self, ctx):
        # TODO Add cheering abilities
        await ctx.send('Not implemented yet. Sorry m8.')

    @classmethod
    async def new(cls, access_token):
        _bot = cls(
            access_token,
            prefix='!',
            client_secret=constants.TWITCH_CLIENT_SECRET,
            initial_channels=[TWITCH_CHANNEL]
        )
        await _bot.connect()
        return _bot


async def main(queue: Queue):
    """
    This task just listens in on the app's websocket for changes in the Q, and posts them
    to the channel
    """
    # TODO: in the long term stop relying on https://twitchtokengenerator.com/ to populate ACCESS TOKEN

    curr_access_token = constants.TWITCH_ACCESS_TOKEN
    curr_refresh_token = constants.TWITCH_REFRESH_TOKEN

    try:
        bot = await Bot.new(curr_access_token)
    except AuthenticationError:
        curr_access_token, curr_refresh_token = await auth.refresh_token(curr_refresh_token)
        bot = await Bot.new(curr_access_token)
    while True:
        data = await queue.get()
        try:
            for chan in bot.connected_channels:
                await chan.send(data)
        except AuthenticationError:
            await queue.put(data)
            curr_access_token, curr_refresh_token = await auth.refresh_token(curr_refresh_token)
            bot = await Bot.new(curr_access_token)


if __name__ == '__main__':
    q = asyncio.Queue()
    asyncio.run(main(q))
