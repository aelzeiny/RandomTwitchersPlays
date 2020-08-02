import os
from typing import Optional, List, Union, NoReturn

import boto3
import json
import logging

import jwt

from decorators import jsonify, SECRET
import store


logger = logging.getLogger("websocket_logger")
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
        username = store.oauth_to_user(oauth)
        if not username or not store.queue_contains(username):
            return False
        store.conn_push(username, conn_id)
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


def broadcast_to_conns(conn_ids: List[str], data: Union[dict, str, int, float, list, bool]):
    data_msg = json.dumps(data).encode('utf8')
    gatewayapi = _get_api_gateway_client()
    bad_conns = []
    for conn_id in conn_ids:
        try:
            gatewayapi.post_to_connection(
                ConnectionId=conn_id,
                Data=data_msg
            )
        except:
            bad_conns.append(conn_id)
    if bad_conns:
        logger.debug(f'Failed to send to {len(bad_conns)} connections. Closing.')
        store.conn_pop(*bad_conns)
    return bad_conns


def broadcast_status(all_conn_ids: Optional[List[str]] = None) -> List[str]:
    if not all_conn_ids:
        all_conn_ids = store.conn_scan()
    data = {
        'queue': store.queue_scan(1000),
        'whitelist': store.get_whitelist()
    }
    logger.debug(f'sending: {data} to {len(all_conn_ids)} open connections')
    return broadcast_to_conns(all_conn_ids, data)


def close_sockets(all_conn_ids: Optional[List[str]] = None) -> NoReturn:
    if not all_conn_ids:
        all_conn_ids = store.conn_scan()
    gatewayapi = _get_api_gateway_client()
    for conn_id in all_conn_ids:
        try:
            gatewayapi.delete_connection(ConnectionId=conn_id)
        except:  # noqa
            pass


@jsonify
def get_status(event, *_, **__):
    conn_id = event["requestContext"]["connectionId"]
    broadcast_status([conn_id])
    return 'sent'


def _get_api_gateway_client():
    return boto3.client(
        "apigatewaymanagementapi",
        # endpoint_url=f'https://{event["requestContext"]["domainName"]}/{event["requestContext"]["stage"]}'
        endpoint_url='https://nq8v1ckz81.execute-api.us-east-1.amazonaws.com/dev'
    )
