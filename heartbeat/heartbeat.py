import asyncio
from typing import Set
from apis import AppApi, forever, APP_EXTERNAL_URL
from twitch_chatbot import bot, queue_listener, spam_help, TWITCH_CHANNEL
import logging


logging.root.setLevel(logging.DEBUG)
log = logging.root.getChild(__name__)


SESSION_TIMEOUT_SECS = 300
QUEUE_TIMEOUT_SECS = 30
HEARTBEAT_SECS = 5
NUM_SLOTS = 3
api = AppApi()


@forever
async def init_heartbeat():
    """
    This heartbeat is what pulls people from Q and puts them on Stream.
     * Users that have been playing for more than "SESSION_TIMEOUT_SECS" are taken off of the whitelist
     * Users that have been whitelist, but haven't joined for more than "QUEUE_TIMEOUT_SECS" are taken off the whitelist
       IF there are players in Q
    """
    while True:
        # sleep it out
        await asyncio.sleep(HEARTBEAT_SECS)

        stream_user_sessions, whitelisted_user_sessions = api.stream_status()
        stream_user_sessions = sorted(stream_user_sessions, key=lambda x: -x[2])
        whitelisted_user_sessions = sorted(whitelisted_user_sessions, key=lambda x: x[2])
        stream_users: Set[str] = set([u for u, _, _ in stream_user_sessions])

        # Different types of users:
        # Those that have joined but their time is up
        # Those that are whitelisted but haven't yet joined
        # Those that whitelisted but haven't yet
        expired_users = [
            (u, t) for u, t, playtime_secs in stream_user_sessions
            if playtime_secs >= SESSION_TIMEOUT_SECS
        ]
        next_users = [
            (u, t) for u, t, _ in whitelisted_user_sessions
            if u not in stream_users
        ]
        expired_next_users = [
            (u, t) for u, t, queuetime_secs in whitelisted_user_sessions
            if u not in stream_users and queuetime_secs >= QUEUE_TIMEOUT_SECS
        ]

        # The number of empty slots is how many people should be pulled from the Q
        num_empty_slots = NUM_SLOTS - len(stream_users) + len(expired_users) - len(next_users) + len(expired_next_users)
        if num_empty_slots > 0:
            new_whitelisted_users = []
            expired_iter = iter(expired_next_users)
            added_user = False
            for _ in range(num_empty_slots):
                up_next = api.queue_rotate()
                if up_next:
                    added_user = True
                    new_whitelisted_users.append(up_next)
                    await bot._ws.send_privmsg(TWITCH_CHANNEL, f"@{up_next} You're up!")
                else:  # Nobody in Q. Just use the least-expired user until queue fills back up
                    try:
                        new_whitelisted_users.append(next(expired_iter))
                    except StopIteration:
                        break

            new_whitelisted_users.extend([
                u for u, _ in whitelisted_user_sessions
                if u not in expired_next_users
            ])
            log.debug('users: ' + str(new_whitelisted_users))
            api.stream_update(new_whitelisted_users)
            api.queue_whitelist(new_whitelisted_users)
            if added_user:
                new_whitelisted = ', '.join([f'@{u}' for _, u in new_whitelisted_users])
                await bot._ws.send_privmsg(TWITCH_CHANNEL, f"On Stream: {new_whitelisted}")


if __name__ == "__main__":
    # bot.loop.create_task(queue_listener())
    bot.loop.create_task(init_heartbeat())
    # bot.loop.create_task(spam_help())
    bot.run()
