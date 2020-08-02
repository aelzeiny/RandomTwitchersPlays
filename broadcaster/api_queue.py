import json
import logging

import api_websocket
from decorators import jsonify, secret
import store


logger = logging.getLogger("websocket_logger")
logger.setLevel(logging.DEBUG)


@secret
@jsonify
def rotate_queue(*_, **__):
    username, joined_dttm = store.queue_pop()
    if not username:
        return {'username': None, 'joined': None, 'is_notified': False}
    store.queue_remove(username)
    return {'username': username, 'joined': joined_dttm}


@secret
@jsonify
def broadcast_status(*_, **__):
    api_websocket.broadcast_status()


@secret
@jsonify
def whitelist(event, *_, **__):
    body = json.loads(event.get('body', '{}'))
    new_whitelist = body['usernames']
    unwhitelisted = set(store.get_whitelist()) - set(new_whitelist)
    if body and 'usernames' in body:
        store.set_whitelist(body['usernames'])

    # goodbye unwhitelisted
    removed_conn_ids = store.conn_remove(*unwhitelisted)
    api_websocket.close_sockets(removed_conn_ids)

    api_websocket.broadcast_status()
