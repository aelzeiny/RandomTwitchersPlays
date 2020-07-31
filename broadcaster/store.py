import datetime as dt
from typing import List, Tuple, Optional, NoReturn

from redis import Redis
REDIS_QUEUE = 'queue'
REDIS_CONN_SET = 'open_conn'
from os import getenv


redis = Redis(
    host=getenv('REDIS_HOST', 'myredis.jsemzk.0001.use1.cache.amazonaws.com'),
    port=6379,
    db=0
)


def queue_push(username, picture) -> NoReturn:
    with redis.pipeline() as pipe:
        pipe.zadd(REDIS_QUEUE, {username: dt.datetime.now().timestamp()}, nx=True)
        if picture:
            pipe.set(username, picture)
        pipe.execute()


def queue_pop() -> Tuple[Optional[str], Optional[int]]:
    tup = redis.zpopmin(REDIS_QUEUE, 1)
    if not tup:
        return None, None
    username_bytes, joined_dttm = tup[0]
    return username_bytes.decode('utf8'), joined_dttm


def queue_remove(username) -> int:
    return redis.zrem(REDIS_QUEUE, username)


def queue_scan(number_of_people) -> List[str]:
    return [u.decode('utf8') for u in redis.zrange(REDIS_QUEUE, 0, number_of_people - 1)]


def queue_rank(username) -> int:
    return redis.zrank(REDIS_QUEUE, username)


def queue_contains(username) -> bool:
    return redis.zscore(REDIS_QUEUE, username) is not None


def conn_push(username, conn_id) -> NoReturn:
    """
    Add username to broadcast list, which is sorted by joined rank. We want users that are early in line
    to get queue updates first!
    """
    with redis.pipeline() as pipe:
        pipe.sadd(__conn_sockets_key(username), conn_id)
        pipe.zadd(REDIS_CONN_SET, {conn_id: redis.zrank(REDIS_QUEUE, username)}, nx=True)
        pipe.set(conn_id, username)
        pipe.execute()


def conn_pop(*conn_ids: List[str]) -> NoReturn:
    usernames = redis.mget(conn_ids)

    with redis.pipeline() as pipe:
        pipe.zrem(REDIS_CONN_SET, *conn_ids)  # remove from broadcast set
        pipe.delete(*conn_ids)  # remove conn_id -> username mapping
        for username, conn_id in zip(usernames, conn_ids):
            pipe.srem(__conn_sockets_key(username), conn_id)  # remove conn_id from user's set
        pipe.execute()


def conn_remove(username) -> NoReturn:
    sockets_key = __conn_sockets_key(username)
    # get all open websocket connections from the user
    all_open_websocket_conn_ids = redis.srem(sockets_key, 0, -1)
    # ask redis to forget all these connection ids from the broadcast
    if all_open_websocket_conn_ids:
        redis.zrem(REDIS_CONN_SET, *all_open_websocket_conn_ids)
    # ask redis to forget all open websocket connections from the user
    redis.delete(sockets_key)


def conn_get(username) -> List[str]:
    return [x.decode('utf8') for x in redis.smembers(__conn_sockets_key(username))]


def conn_scan() -> List[str]:
    return [x.decode('utf8') for x in redis.zrange(REDIS_CONN_SET, 0, -1)]


def __conn_sockets_key(username: str):
    return f'{REDIS_CONN_SET}_{username}'


def oauth_cache_get(oauth):
    answer = redis.get(oauth)
    if answer:
        return answer.decode('utf8')
    return None


def oauth_cache_update(oauth, username):
    answer = redis.set(oauth, username, 60 * 15)
    if answer:
        return answer.decode('utf8')
    return None
