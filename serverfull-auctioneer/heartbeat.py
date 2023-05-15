import asyncio

import store
import sockets
import logging

import traffic_api


logging.root.setLevel(logging.DEBUG)
log = logging.root.getChild(__name__)


SESSION_TIMEOUT_SECS = 5 * 60
JOIN_TIMEOUT_SECS = 60
HEARTBEAT_SECS = 5
NUM_SLOTS = 1


async def main():
    """
    This heartbeat is what pulls people from Q and puts them on Stream.
     * Users that have been playing for more than "SESSION_TIMEOUT_SECS" are taken off of the stream
     * Users that have been whitelist, but haven't joined for more than "QUEUE_TIMEOUT_SECS" are taken off the whitelist
       IF there are players in Q
    """
    while True:
        # sleep it out
        await asyncio.sleep(HEARTBEAT_SECS)
        traffic_status = await traffic_api.status()

        old_allowed = traffic_status.whitelist

        new_streamers = list(traffic_status.stream)
        new_allowed = list(traffic_status.whitelist)

        # STEP 1: remove the expired streamers
        new_streamers = [
            s for s in new_streamers
            if s.time <= SESSION_TIMEOUT_SECS
        ]

        # STEP 2: remove the expired allowed
        new_allowed = [
            s for s in new_allowed
            if s.time <= JOIN_TIMEOUT_SECS
        ]

        # STEP 3: fill up allowed from Q to the best of ability
        for _ in range(NUM_SLOTS - (len(new_streamers) + len(new_allowed))):
            user = store.queue_pop()
            if user is not None:
                new_allowed.append(traffic_api.TrafficStatusResponseUser(userId=user, time=0))
            else:
                break

        # STEP 4: fill up allowed from least expired allowed to the best of ability
        # sorted by time least spent waiting.
        old_allowed_iter = iter(sorted(old_allowed, key=lambda s: -s.time))
        for _ in range(NUM_SLOTS - (len(new_streamers) + len(new_allowed))):
            try:
                old_allowed_user = next(old_allowed_iter)
                new_allowed.append(old_allowed_user)
            except StopIteration:
                break

        # STEP 5: Update & announce new whitelisters
        new_ppl = set((w.user_id for w in new_allowed)) - set((w.user_id for w in old_allowed))
        if new_ppl:
            await traffic_api.set_allowed_streamers([u.user_id for u in new_allowed])
            await sockets.broadcast_status()
            log.info(f'Allowing Users: {new_allowed}')
            asyncio.ensure_future(asyncio.gather(*[
                sockets.BOT.put(f"@{new_allowed_user} You're up!")
                for new_allowed_user in new_ppl
            ]))
