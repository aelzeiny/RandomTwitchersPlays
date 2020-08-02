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
    new_whitelist = json.loads(event.get('body', '[]'))
    blacklisted = set(store.get_whitelist()) - set(new_whitelist)
    store.set_whitelist(new_whitelist)

    # goodbye unwhitelisted
    removed_conn_ids = store.conn_remove(*blacklisted)
    api_websocket.close_sockets(removed_conn_ids)

    api_websocket.broadcast_status()
