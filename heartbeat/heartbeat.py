import asyncio
from typing import Set
from apis import AppApi


SESSION_TIMEOUT_SECS = 300
QUEUE_TIMEOUT_SECS = 30
HEARTBEAT_SECS = 5
api = AppApi()


async def init_heartbeat():
    while True:
        stream_user_sessions, whitelisted_user_sessions = api.stream_status()
        stream_users: Set[str] = set([u for u, _, _ in stream_user_sessions])
        whitelisted_users: Set[str] = set([u for u, _, _ in whitelisted_user_sessions])

        expired_users = [
            u for u, _, playtime_secs in stream_user_sessions
            if playtime_secs >= SESSION_TIMEOUT_SECS
        ]

        next_users = whitelisted_users - stream_users
        expired_next_users = set([
            u for u, _, queuetime_secs in whitelisted_users
            if queuetime_secs >= QUEUE_TIMEOUT_SECS and u in next_users
        ])

        # Fill up users from queue
        if len(next_users) < len(expired_users) + len(expired_next_users):
            users_to_fill = len(expired_users) - len(next_users) + len(expired_next_users)
            to_add = [api.queue_rotate() for _ in range(users_to_fill)]
            new_whitelisted_users = [
                (u, twitch_id)
                for u, twitch_id, _ in whitelisted_user_sessions
                if u not in expired_next_users
            ]

            api.stream_update(*to_add, *new_whitelisted_users)

        # sleep it out
        await asyncio.sleep(HEARTBEAT_SECS)
