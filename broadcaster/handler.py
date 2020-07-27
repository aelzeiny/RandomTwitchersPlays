from json import JSONDecodeError
from typing import Callable, Any, Union, Tuple

import boto3
import json
import logging
import functools
import traceback
import datetime as dt

import botocore
from redis import Redis
from uuid import uuid4, UUID

logger = logging.getLogger("handler_logger")
logger.setLevel(logging.DEBUG)


REDIS_QUEUE = 'queue'
REDIS_CHANNEL = 'queue_chan'
REDIS_CONN_SET = 'open_conn'
redis = Redis(
    host="myredis.jsemzk.0001.use1.cache.amazonaws.com",
    port=6379,
    db=0
)


def jsonify(func: Callable[..., Union[Union[dict, str], Tuple[Union[dict, str], int]]]) -> Callable[..., dict]:
    """
    A function decorator that accepts 2 types of returns.
    A return type of a string will become a dictionary with the key of 'payload'.
    If the return type is a dictionary, then the status code is assumed to be 200
    If the return type is a tuple, then the first element must be the body, and the second must be the status code

    :return The response will be formatted as {'statusCode': [status], 'body': [dictionary]}
    """
    @functools.wraps(func)
    def wrap(*args, **kwargs):
        try:
            answer = func(*args, **kwargs)
            status_code = 200
            if isinstance(answer, tuple):
                answer, status_code = answer
            if isinstance(answer, str):
                answer = {'payload': answer}
            return {"statusCode": status_code, "body": json.dumps(answer)}
        except Exception as e:
            logger.error(str(e))
            logger.debug(traceback.format_exc())
            return {"statusCode": 500, "body": json.dumps({'error': str(e)})}
    return wrap


@jsonify
def connection_manager(event, _):
    """
    Handles Websocket connection/disconnects
    """
    connection_id = event["requestContext"].get("connectionId")
    event_type = event["requestContext"]["eventType"]
    query_params = event['queryStringParameters'] if 'queryStringParameters' in event else {}
    uuid_str = query_params.get('uuid')
    uuid = UUID(uuid_str) if uuid_str else None
    if event_type == "CONNECT":
        can_connect = _open_conn(connection_id, uuid)
        if not can_connect:
            return 'Endpoint not found.', 404
        return 'Connected'

    elif event_type == "DISCONNECT":
        _close_conn(connection_id, uuid)
        return 'Disconnected'

    logger.error(f"Connection manager received unrecognized eventType '{event_type}")
    return 'Unrecognized eventType.', 500


def _open_conn(conn_id, uuid: UUID = None) -> bool:
    """
    Asks Redis to remember to open websocket for broadcasting events later.
    :param conn_id API Gateway websocket id
    :param uuid if provided will also add connection to the appropriate user
    :return return True if UUID provided is valid.
    """
    if uuid:
        if not redis.get(uuid.bytes):
            return False
        redis.sadd(_redis_open_sockets_key(uuid), conn_id)
    redis.zadd(REDIS_CONN_SET, {conn_id: dt.datetime.now().timestamp()}, nx=True)
    return True


def _close_conn(conn_id, uuid: UUID = None):
    """
    Closes Websocket connection.
    :param conn_id API Gateway websocket id
    :param uuid if provided, will also delete connection from appropriate user
    """
    if uuid:
        redis.srem(_redis_open_sockets_key(uuid), conn_id)
    redis.zrem(REDIS_CONN_SET, conn_id)


@jsonify
def join_queue(event, _):
    body = json.loads(event['body']) if 'body' in event else {}
    username = body['username']
    uuid = _join_queue(username)
    return {'uuid': str(uuid)}


def _join_queue(username) -> UUID:
    """
    Adds a user to the queue. If a user is already in Q then the existing UUID is returned.
    Joining the Game Queue has the following operations:
    * Joining the Game Q
    * Adding UUID -> User Mapping
    * Update Pub/Sub Channel
    """
    new_user_id = uuid4()
    added = redis.setnx(username, new_user_id.bytes)  # User -> UUID
    if not added:
        return UUID(bytes=redis.get(username))

    redis.set(new_user_id.bytes, username)  # UUID -> User
    redis.rpush(REDIS_QUEUE, username)  # ADD to Queue
    _broadcast_status()  # Notify listeners that Q has changed
    return new_user_id


@jsonify
def leave_queue(event, _):
    body = json.loads(event['body']) if 'body' in event else {}
    username = body['username']
    exists = _leave_queue(username)
    if not exists:
        return 'User not part of queue', 400
    return 'REMOVED'


def _leave_queue(username):
    """
    If a user DNE then nothing happens.
    Leaving the Game Queue has the following operations:
    * Leaving the Game Q
    * Delete UUID -> User mapping
    * Delete User -> UUID mapping
    * delete any/all open websockets associated with the user
    * Update Pub/Sub Channel
    """
    uuid_bytes = redis.get(username)
    if not uuid_bytes:
        return False
    uuid = UUID(bytes=uuid_bytes)
    open_socket_key = _redis_open_sockets_key(uuid)
    open_socket_conn_ids = redis.smembers(open_socket_key)

    redis.delete(username, uuid_bytes, open_socket_key)  # UUID -> User & User -> UUID & open sockets
    redis.lrem(REDIS_QUEUE, 1, username)  # REMOVE from Queue
    if open_socket_conn_ids:  # Remove from open connections
        redis.zrem(REDIS_CONN_SET, *open_socket_conn_ids)
    _broadcast_status()
    return True


@jsonify
def next_queue(*_, **__):
    username = redis.lindex(REDIS_QUEUE, 0)
    if not username:
        return {'uuid': None, 'username': None}
    user_id = UUID(bytes=redis.get(username))
    _leave_queue(username)
    return {'uuid': str(user_id), 'username': username.decode('utf8')}


@jsonify
def default_message(*_, **__):
    logger.info("Unknown Action.")
    return "Unrecognized Endpoint.", 404


@jsonify
def broadcast_status(*_, **__):
    """
    Return the 10 most recent chat messages.
    """
    _broadcast_status()


def _broadcast_status():
    all_conn_ids = redis.zrange(REDIS_CONN_SET, 0, -1)
    gatewayapi = _get_api_gateway_client()
    data = [username.decode('utf8') for username in redis.lrange(REDIS_QUEUE, 0, 15)]
    logger.debug(f'sending: {data} to {len(all_conn_ids)} open connections')
    to_rem = []
    for conn_id_bytes in all_conn_ids:
        try:
            gatewayapi.post_to_connection(
                ConnectionId=conn_id_bytes.decode('utf8'),
                Data=json.dumps(data).encode('utf8')
            )
        except:
            to_rem.append(conn_id_bytes)
    if to_rem:
        logger.debug(f'Failed to send to {len(to_rem)} connections. Closing.')
        redis.zrem(REDIS_CONN_SET, *to_rem)
    return data


@jsonify
def status_queue(*_, **__):
    """
    Return the 10 most recent chat messages.
    """
    def is_connected(username: bytes):
        uuid = redis.get(username).decode('utf8')
        num_conn = redis.scard(_redis_open_sockets_key(uuid))
        return num_conn != 0

    data = [
        {
            'username': username.decode('utf8'),
            'is_connected': is_connected(username)
        }
        for username in redis.lrange(REDIS_QUEUE, 0, 5)
    ]
    return data


@jsonify
def position_queue(event, _):
    """Get the index of the given username."""
    if 'pathParameters' not in event or 'username' not in event['pathParameters']:
        return 'No username provided', 400
    username = event['pathParameters']['username']
    if not redis.get(username):
        return {'position': -1}
    index = list(redis.lrange(REDIS_QUEUE, 0, -1)).index(username.encode('utf8'))
    return {'position': index + 1}


def _redis_open_sockets_key(uuid: UUID):
    return f'{REDIS_CONN_SET}_{uuid}'


def _get_api_gateway_client():
    return boto3.client(
        "apigatewaymanagementapi",
        # endpoint_url=f'https://{event["requestContext"]["domainName"]}/{event["requestContext"]["stage"]}'
        endpoint_url='https://4tylj6rpwi.execute-api.us-east-1.amazonaws.com/dev'
    )
