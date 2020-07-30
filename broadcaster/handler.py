import os
import boto3
import json
import logging
import requests

from decorators import jsonify, cors, auth
import store


logger = logging.getLogger("handler_logger")
logger.setLevel(logging.DEBUG)


@jsonify
def connection_manager(event, _):
    """
    Handles Websocket connection/disconnects
    """
    connection_id = event["requestContext"].get("connectionId")
    event_type = event["requestContext"]["eventType"]
    query_params = event['queryStringParameters'] if 'queryStringParameters' in event else {}
    oauth = query_params.get('oauth')
    if event_type == "CONNECT":
        can_connect = _open_conn(connection_id, oauth)
        if not can_connect:
            return 'Unauthorized', 404
        return 'Connected'

    elif event_type == "DISCONNECT":
        _close_conn(connection_id, oauth)
        return 'Disconnected'

    logger.error(f"Connection manager received unrecognized eventType '{event_type}")
    return 'Unrecognized eventType.', 500


def _open_conn(conn_id, oauth: str) -> bool:
    """
    Asks Redis to remember to open websocket for broadcasting events later.
    :param conn_id API Gateway websocket id
    :param oauth if provided will also add connection to the appropriate user
    :return return True if UUID provided is valid.
    """
    username = __oauth_to_user(oauth)
    if not username or not store.queue_contains(username):
        return False
    store.conn_push(username, conn_id)
    return True


def _close_conn(conn_id, _: str):
    """
    Closes Websocket connection.
    :param conn_id API Gateway websocket id
    :param _ if provided, will also delete connection from appropriate user
    """
    store.conn_pop(conn_id)


@cors
@auth
@jsonify
def join_queue(_, __, user, token):
    picture_url = __oauth_to_picture(token)
    was_added = store.queue_push(user, picture_url)
    _broadcast_status()  # Notify listeners that Q has changed
    return 'ADDED' if was_added else 'IN_QUEUE'


@cors
@auth
@jsonify
def leave_queue(_, __, user, ___):
    was_removed = _leave_queue(user)
    # broadcast to remaining users that the status has changed
    _broadcast_status()  # Notify listeners that Q has changed
    return 'REMOVED' if was_removed else 'NOT_IN_QUEUE'


def _leave_queue(user):
    was_removed = store.queue_remove(user)
    store.conn_remove(user)
    return was_removed


@jsonify
def next_queue(*_, **__):
    username, joined_dttm = store.queue_pop()
    if not username:
        return {'username': None, 'joined': None}
    # notify user that they're up in the Q
    gatewayapi = _get_api_gateway_client()
    all_open_connections = store.conn_get(username)
    for conn_id in all_open_connections:
        gatewayapi.post_to_connection(
            ConnectionId=conn_id,
            Data=json.dumps({'id': 'stream'})
        )
    store.queue_remove(username)
    store.conn_remove(username)
    _broadcast_status()  # Notify listeners that Q has changed
    return {'username': username, 'joined': joined_dttm}


@jsonify
def broadcast_status(*_, **__):
    """
    Return the 10 most recent chat messages.
    """
    _broadcast_status()


def _broadcast_status():
    gatewayapi = _get_api_gateway_client()
    all_conn_ids = store.conn_scan()
    data = json.dumps(store.queue_scan(10)).encode('utf8')
    logger.debug(f'sending: {data} to {len(all_conn_ids)} open connections')
    bad_conns = []
    for conn_id_bytes in all_conn_ids:
        try:
            gatewayapi.post_to_connection(
                ConnectionId=conn_id_bytes,
                Data=data
            )
        except:
            bad_conns.append(conn_id_bytes)
    if bad_conns:
        logger.debug(f'Failed to send to {len(bad_conns)} connections. Closing.')
        store.conn_pop(*bad_conns)
    return data


@jsonify
def position_queue(event, _):
    """Get the index of the given username."""
    if 'pathParameters' not in event or 'username' not in event['pathParameters']:
        return 'No username provided', 400
    username = event['pathParameters']['username']
    index = store.queue_rank(username)
    if not index:
        return {'position': -1}
    return {'position': index + 1}


@cors
@jsonify
def authorize(event, context):
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
        'multiValueHeaders': {
            "Set-Cookie": [
                f'token="{data["access_token"]}"; Path=/; SameSite=None; Secure',
                f'refresh="{data["refresh_token"]}"; Path=/; SameSite=None; Secure'
            ]
        }
    }


@jsonify
def default_message(*_, **__):
    logger.info("Unknown Action.")
    return "Unrecognized Endpoint.", 404


def _get_api_gateway_client():
    return boto3.client(
        "apigatewaymanagementapi",
        # endpoint_url=f'https://{event["requestContext"]["domainName"]}/{event["requestContext"]["stage"]}'
        endpoint_url='https://4tylj6rpwi.execute-api.us-east-1.amazonaws.com/dev'
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
