import os
from typing import Optional, List, Union

import boto3
import json
import logging

import jwt
import requests

from decorators import jsonify, cors, auth_or_secret, secret, SECRET
import store


logger = logging.getLogger("handler_logger")
logger.setLevel(logging.DEBUG)


@jsonify
def connection_manager(event, *_, **__):
    """
    Handles Websocket connection/disconnects
    """
    connection_id = event["requestContext"].get("connectionId")
    event_type = event["requestContext"]["eventType"]
    query_params = event['queryStringParameters'] if 'queryStringParameters' in event else {}
    oauth = query_params.get('token')
    jwt_token = query_params.get('jwt')
    if event_type == "CONNECT":
        if not oauth and not jwt_token:
            return 'Unauthorized', 1003
        can_connect = _open_conn(connection_id, oauth, jwt_token)
        if not can_connect:
            return 'Unauthorized', 1003
        return 'Connected'

    elif event_type == "DISCONNECT":
        _close_conn(connection_id, oauth)
        return 'Disconnected'

    logger.error(f"Connection manager received unrecognized eventType '{event_type}")
    return 'Unrecognized eventType.', 1003


def _open_conn(conn_id, oauth: Optional[str], jwt_token: Optional[str]) -> bool:
    """
    Asks Redis to remember to open websocket for broadcasting events later.
    :param conn_id API Gateway websocket id
    :param oauth if provided will also add connection to the appropriate user
    :return return True if oauth provided is valid.
    """
    if not oauth and not jwt_token:
        raise ValueError('specify at least one')
    if oauth:
        username = __oauth_to_user(oauth)
        if not username or not store.queue_contains(username):
            return False
    else:
        try:
            decoded_data = jwt.decode(jwt_token, SECRET)
            username = decoded_data['name']
        except jwt.InvalidTokenError:
            return False
    store.conn_push(username, conn_id, rank=0)
    return True


def _close_conn(conn_id, _: str):
    """
    Closes Websocket connection.
    :param conn_id API Gateway websocket id
    :param _ if provided, will also delete connection from appropriate user
    """
    store.conn_pop(conn_id)


@jsonify
def default_message(*_, **__):
    logger.info("Unknown Action.")
    return "Unrecognized Endpoint.", 404


@cors
@auth_or_secret
@jsonify
def join_queue(*_, user, token, **__):
    picture_url = __oauth_to_picture(token) if token else None
    store.queue_push(user, picture_url)
    _broadcast_status()  # Notify listeners that Q has changed
    return {'payload': 'ADDED', 'token': token}


@cors
@auth_or_secret
@jsonify
def leave_queue(*_, user, **__):
    was_removed = _leave_queue(user)
    # broadcast to remaining users that the status has changed
    _broadcast_status()  # Notify listeners that Q has changed
    return 'REMOVED' if was_removed else 'NOT_IN_QUEUE'


def _leave_queue(user):
    was_removed = store.queue_remove(user)
    store.conn_remove(user)
    return was_removed


@secret
@jsonify
def next_queue(*_, **__):
    username, joined_dttm = store.queue_pop()
    if not username:
        return {'username': None, 'joined': None, 'is_notified': False}
    # notify user that they're up in the Q
    all_open_connections = store.conn_get(username)
    bad_conns = _broadcast_to_conns(all_open_connections, {'id': 'play'})
    is_notified = bool(not not all_open_connections and len(bad_conns) == len(all_open_connections))

    store.queue_remove(username)
    store.conn_remove(username)
    _broadcast_status()  # Notify listeners that Q has changed
    return {'username': username, 'joined': joined_dttm, 'is_notified': is_notified}


@secret
@jsonify
def broadcast_status(*_, **__):
    """
    Return the 10 most recent chat messages.
    """
    _broadcast_status()


def _broadcast_status():
    all_conn_ids = store.conn_scan()
    data = store.queue_scan(10)
    logger.debug(f'sending: {data} to {len(all_conn_ids)} open connections')
    _broadcast_to_conns(all_conn_ids, data)
    return data


def _broadcast_to_conns(conn_ids: List[str], data: Union[dict, str, int, float, list, bool]):
    data_msg = json.dumps(data).encode('utf8')
    gatewayapi = _get_api_gateway_client()
    bad_conns = []
    for conn_id_bytes in conn_ids:
        try:
            gatewayapi.post_to_connection(
                ConnectionId=conn_id_bytes,
                Data=data_msg
            )
        except:
            bad_conns.append(conn_id_bytes)
    if bad_conns:
        logger.debug(f'Failed to send to {len(bad_conns)} connections. Closing.')
        store.conn_pop(*bad_conns)
    return bad_conns


@secret
@jsonify
def position_queue(event, *_, **__):
    """Get the index of the given username."""
    if 'pathParameters' not in event or 'username' not in event['pathParameters']:
        return 'No username provided', 400
    username = event['pathParameters']['username']
    index = store.queue_rank(username)
    if index is None:
        return {'position': None}
    return {'position': index + 1}


@cors
@jsonify
def authorize(event, *_, **__):
    if 'pathParameters' not in event or 'code' not in event['pathParameters']:
        return 'No code provided', 400
    code = event['pathParameters']['code']
    response = requests.post(
        'https://id.twitch.tv/oauth2/token',
        params={
            'client_id': os.environ['TWITCH_CLIENT_ID'],
            'client_secret': os.environ['TWITCH_CLIENT_SECRET'],
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': 'https://twitcharena.live/authorize'
        }
    )
    if not (200 <= response.status_code < 300):
        return response.json(), response.status_code

    data = response.json()
    # keys: access_token, expires_in, id_token, refresh_token, scope, token_type
    return 'success', 200, {
        'headers': {'Set-Cookie': f'token="{data["access_token"]}"; Path=/; SameSite=None; Secure'},
        'multiValueHeaders': {
            "Set-Cookie": [
                f'token="{data["access_token"]}"; Path=/; SameSite=None; Secure',
                f'refresh="{data["refresh_token"]}"; Path=/; SameSite=None; Secure'
            ]
        }
    }


def _get_api_gateway_client():
    return boto3.client(
        "apigatewaymanagementapi",
        # endpoint_url=f'https://{event["requestContext"]["domainName"]}/{event["requestContext"]["stage"]}'
        endpoint_url='https://nq8v1ckz81.execute-api.us-east-1.amazonaws.com/dev'
    )


def __oauth_to_user(oauth):
    cached_user = store.oauth_cache_get(oauth)
    if cached_user:
        return cached_user
    challenge_req = requests.get(
        'https://id.twitch.tv/oauth2/validate',
        headers={'Authorization': f'Bearer {oauth}'}
    )
    if not (200 <= challenge_req.status_code < 300):
        return None
    user_info = challenge_req.json()
    store.oauth_cache_update(oauth, user_info['login'])
    return user_info['login']


def __oauth_to_picture(oauth):
    info_req = requests.get(
        'https://id.twitch.tv/oauth2/userinfo',
        headers={'Authorization': f'Bearer {oauth}'}
    )
    info_req.raise_for_status()
    user_info = info_req.json()
    # keys: aud, exp, iat, iss, sub, picture, preferred_username
    return user_info['picture']
