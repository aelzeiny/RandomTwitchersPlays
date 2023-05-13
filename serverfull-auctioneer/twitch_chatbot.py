import asyncio
import os
import logging

import aiohttp
from twitchio.ext import commands
from twitchio.ext.commands import Context
from asyncio import Queue

import store

log = logging.root.getChild(__name__)
TWITCH_CHANNEL = 'RandomTwitchersPlay'
BOT_NICK = 'RandomTwitchersPlay'

APP_EXTERNAL_URL = 'https://twitcharena.live'


class Bot(commands.Bot):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._http.client_id = os.environ['TWITCH_CLIENT_ID']

    async def event_ready(self):
        for chan in self.connected_channels:
            await chan.send('/me has landed!')

    @commands.command(name='join')
    async def join(self, ctx: Context):
        username = ctx.author.name
        log.info(f'{ctx.author.name} joining queue @{APP_EXTERNAL_URL}')
        await ctx.send(f'Welcome @{username}! Please wait in line here: {APP_EXTERNAL_URL}')

    @commands.command(name='leave', aliases=['quit', 'exit', 'remove'])
    async def leave(self, ctx: Context):
        await ctx.send(f"@{ctx.author.name} Are you sure? You'll lose your spot in line. Type in !goodbye to confirm.")

    @commands.command(name='goodbye')
    async def goodbye(self, ctx: Context):
        log.info(f'{ctx.author.name} leaving queue')
        store.queue_remove(ctx.author.name)
        await ctx.send(f'Goodbye, @{ctx.author.name}! We hope you can "!join" us again soon!')

    @commands.command(name='position', aliases=['where', 'status'])
    async def position(self, ctx: Context):
        username = ctx.author.name
        pos, in_stream = store.queue_rank(username)
        if pos:
            await ctx.send(f'@{username} is #{pos} in the queue.')
        elif in_stream:
            await ctx.send(f"@{username} you're supposed to be on stream! {APP_EXTERNAL_URL}/queue")
        else:
            await ctx.send(f'@{username} type "!join" to enter the queue')

    @commands.command(name='help', aliases=['h', 'ayuda', 'halp'])
    async def helper(self, ctx: Context):
        await ctx.send("!join to enter the queue")
        await ctx.send("!queue to track your status")
        await ctx.send("!leave to exit the queue")
        await ctx.send("!cheer @<user> adds time")
        await ctx.send("!kick @<user> to kick")
        await ctx.send("!help to see this again")

    @commands.command(name='kick', aliases=['ban', 'boot', 'kill'])
    async def kick(self, ctx):
        # TODO Add banning abilities
        await ctx.send('Not implemented yet. Sorry m8.')

    @commands.command(name='cheer', aliases=['add', 'love' 'reward'])
    async def cheer(self, ctx):
        # TODO Add cheering abilities
        await ctx.send('Not implemented yet. Sorry m8.')


async def main(queue: Queue):
    """
    This task just listens in on the app's websocket for changes in the Q, and posts them
    to the channel
    """
    # TODO: in the long term stop relying on https://twitchtokengenerator.com/ to populate ACCESS TOKEN
    bot = Bot(
        os.environ['TWITCH_ACCESS_TOKEN'],
        prefix='!',
        client_secret=os.environ['TWITCH_CLIENT_SECRET'],
        initial_channels=[TWITCH_CHANNEL]
    )
    await bot.connect()
    while True:
        data = await queue.get()
        queue_usernames = data['queue'][:5]
        whitelist_usernames = data['whitelist']
        if queue_usernames:
            up_next = ', '.join([f"#{i + 1} @{u}" for i, u in enumerate(queue_usernames)])
            on_now = ', '.join([f"@{u}" for u in whitelist_usernames])
            log.info(f'Next: {queue_usernames}')
            log.info(f'On Stream: {on_now}')
            for chan in bot.connected_channels:
                await chan.send(f'Coming up: {up_next}')
            for chan in bot.connected_channels:
                await chan.send(f'On Stream: {on_now}')
        else:
            for chan in bot.connected_channels:
                await chan.send(f'Queue is empty. Type "!join" to enter!')


if __name__ == '__main__':
    q = asyncio.Queue()
    asyncio.run(main(q))
