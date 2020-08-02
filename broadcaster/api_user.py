import os
import logging

import requests

from decorators import jsonify, auth_or_secret
import store
import api_websocket


logger = logging.getLogger("handler_logger")
logger.setLevel(logging.DEBUG)


@jsonify
def login(event, *_, **__):
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


@auth_or_secret
@jsonify
def join_queue(*_, user, token, **__):
    picture_url = store.oauth_to_picture(token) if token else None
    store.queue_push(user, picture_url)
    api_websocket.broadcast_status()  # Notify listeners that Q has changed
    return {'payload': 'ADDED', 'token': token}


@auth_or_secret
@jsonify
def leave_queue(*_, user, **__):
    was_removed = _leave_queue(user)
    # broadcast to remaining users that the status has changed
    api_websocket.broadcast_status()  # Notify listeners that Q has changed
    return 'REMOVED' if was_removed else 'NOT_IN_QUEUE'


def _leave_queue(user):
    was_removed = store.queue_remove(user)
    removed_conn_ids = store.conn_remove(user)
    api_websocket.close_sockets(removed_conn_ids)
    return was_removed


@auth_or_secret
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
