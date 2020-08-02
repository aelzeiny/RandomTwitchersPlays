import json
import os
import logging
from typing import Dict, Optional

import jwt
from jwt.algorithms import RSAAlgorithm
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
    try:
        oidc_token = _validate_oidc(data['id_token'])
    except (AssertionError, KeyError) as e:
        return str(e), 401
    # keys: access_token, expires_in, id_token, refresh_token, scope, token_type
    return 'success', 200, {
        'headers': {'Set-Cookie': f'token="{data["access_token"]}"; Path=/; Secure'},
        'multiValueHeaders': {
            "Set-Cookie": [
                f'token="{data["access_token"]}"; Path=/; Secure',
                f'refresh="{data["refresh_token"]}"; Path=/; Secure',
                f'username="{oidc_token["preferred_username"]}; Path=/; Secure"'
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
        print(store.get_whitelist())
        in_stream = username in store.get_whitelist()
        return {'position': None, 'in_stream': in_stream}
    return {'position': index + 1, 'in_stream': False}


def _validate_oidc(id_token: str) -> Optional[Dict[str, str]]:
    header = jwt.get_unverified_header(id_token)
    twitch_pub_res = requests.get('https://id.twitch.tv/oauth2/keys')
    twitch_pub_res.raise_for_status()
    twitch_pub_data = twitch_pub_res.json()
    assert 'keys' in twitch_pub_data, 'Twitch pubkey changed'
    twitch_pub_keys = {k['kid']: k for k in twitch_pub_data['keys']}
    assert 'kid' in header and header['kid'] in twitch_pub_keys, 'No matching Key ID from twitch. Check your id token.'
    matched_key = twitch_pub_keys[header['kid']]
    matched_rsa = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(matched_key))

    decoded_data = jwt.decode(id_token, matched_rsa, algorithm=matched_key['alg'], options=dict(verify_aud=False))
    assert decoded_data['aud'] == os.environ['TWITCH_CLIENT_ID'], 'This token is not meant for this client'
    return decoded_data
