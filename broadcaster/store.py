import datetime as dt
from typing import List, Tuple, Optional, NoReturn

import requests
from redis import Redis
from os import getenv
import pickle

REDIS_QUEUE = '_queue'
REDIS_CONN_SET = '_open_conn'
REDIS_WHITELIST = '_whitelist'


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


def queue_remove(*usernames) -> int:
    return redis.zrem(REDIS_QUEUE, *usernames)


def queue_scan(number_of_people) -> List[str]:
    return [u.decode('utf8') for u in redis.zrange(REDIS_QUEUE, 0, number_of_people - 1)]


def queue_rank(username) -> int:
    return redis.zrank(REDIS_QUEUE, username)


def queue_contains(username) -> bool:
    return redis.zscore(REDIS_QUEUE, username) is not None


def conn_push(username, conn_id, rank: Optional[int] = None) -> NoReturn:
    """
    Add username to broadcast list, which is sorted by joined rank. We want users that are early in line
    to get queue updates first!
    """
    if rank is None:
        rank = redis.zrank(REDIS_QUEUE, username)
    with redis.pipeline() as pipe:
        pipe.sadd(__conn_sockets_key(username), conn_id)
        pipe.zadd(REDIS_CONN_SET, {conn_id: rank}, nx=True)
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


def conn_remove(*usernames: str) -> List[str]:
    sockets_keys = [__conn_sockets_key(u) for u in usernames]
    # get all open websocket connections from the user
    all_open_websocket_conn_ids = []
    for key in sockets_keys:
        all_open_websocket_conn_ids.extend(redis.smembers(key))
    with redis.pipeline() as pipe:
        # ask redis to forget all these connection ids from the broadcast
        if all_open_websocket_conn_ids:
            pipe.zrem(REDIS_CONN_SET, *all_open_websocket_conn_ids)
        # ask redis to forget all open websocket connections from the user
        pipe.delete(*sockets_keys)
        pipe.execute()

    return all_open_websocket_conn_ids


def conn_get(username: str) -> List[str]:
    return [x.decode('utf8') for x in redis.smembers(__conn_sockets_key(username))]


def conn_scan() -> List[str]:
    return [x.decode('utf8') for x in redis.zrange(REDIS_CONN_SET, 0, -1)]


def __conn_sockets_key(username: str) -> NoReturn:
    return f'{REDIS_CONN_SET}_{username}'


def oauth_cache_get(oauth) -> Optional[str]:
    answer = redis.get(oauth)
    if answer:
        return answer.decode('utf8')
    return None


def oauth_cache_update(oauth, username) -> NoReturn:
    redis.set(oauth, username, 60 * 15)


def get_whitelist() -> List[str]:
    binary_whitelist = redis.get(REDIS_WHITELIST)
    if not binary_whitelist:
        return []
    return pickle.loads(binary_whitelist)


def set_whitelist(usernames: List[str]) -> NoReturn:
    redis.set(REDIS_WHITELIST, pickle.dumps(usernames))


def oauth_to_user(oauth):
    cached_user = oauth_cache_get(oauth)
    if cached_user:
        return cached_user
    challenge_req = requests.get(
        'https://id.twitch.tv/oauth2/validate',
        headers={'Authorization': f'Bearer {oauth}'}
    )
    if not (200 <= challenge_req.status_code < 300):
        return None
    user_info = challenge_req.json()
    oauth_cache_update(oauth, user_info['login'])
    return user_info['login']


def oauth_to_picture(oauth):
    info_req = requests.get(
        'https://id.twitch.tv/oauth2/userinfo',
        headers={'Authorization': f'Bearer {oauth}'}
    )
    info_req.raise_for_status()
    user_info = info_req.json()
    # keys: aud, exp, iat, iss, sub, picture, preferred_username
    return user_info['picture']
