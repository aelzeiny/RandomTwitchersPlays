from typing import List, Tuple

import websockets
from requests import session

import os
import json
import hmac
import hashlib
from base64 import urlsafe_b64encode


SUPER_SECRET_KEY = os.environ['PRESENTER_SUPER_SECRET']
APP_EXTERNAL_URL = 'https://twitcharena.live'
APP_INTERNAL_URL = 'https://twitcharena.live/api/users'
WS_URL = 'wss://4tylj6rpwi.execute-api.us-east-1.amazonaws.com/dev'
API_URL = 'https://zei6n2gg47.execute-api.us-east-1.amazonaws.com/dev'


class AppApi:
    def __init__(self):
        self.app_session = session()
        header = urlsafe_b64encode(json.dumps({'alg': "HS256", 'typ': "JWT"}))
        payload = urlsafe_b64encode(json.dumps({'name': '!HEARTBEAT'}))
        signature = urlsafe_b64encode(hmac.new(SUPER_SECRET_KEY, f'{header}.{payload}', hashlib.sha256))
        self.app_session.headers['Authorization'] = f'Bearer {header}.{payload}.{signature}'
        self.app_session.headers['Content-Type'] = 'application/json'

        self.api_session = session()

    def stream_status(self) -> Tuple[List[Tuple[str, int]], List[Tuple[str, int]]]:
        """
        :return:
        Item 0: twitch tag and current play-time (in secs) of each user on the stream.
        Item 1: twitch tag and current queue-time (in secs) of each whitelisted user.
        """
        response = self.app_session.get(APP_INTERNAL_URL)
        response.raise_for_status()
        return response.json()

    def stream_update(self, *usernames: List[str]):
        response = self.app_session.post(APP_INTERNAL_URL, data=json.dumps(usernames))
        response.raise_for_status()
        return response.json()

    def queue_join(self, username) -> str:
        response = self.api_session.put(f'{API_URL}/queue', json={'username': username})
        response.raise_for_status()
        response_body = response.json()
        unique_id = response_body['uuid']
        return f"{APP_EXTERNAL_URL}/queue/{unique_id}"

    def queue_remove(self, username) -> None:
        response = self.api_session.delete(
            f'{API_URL}/queue',
            json={'username': username}
        )
        response.raise_for_status()

    def queue_position(self, username) -> int:
        response = self.api_session.get(f'{API_URL}/user/{username}')
        response.raise_for_status()
        data = response.json()
        return data['position']

    def queue_status(self) -> List[Tuple[str, bool]]:
        response = self.api_session.get(f'{API_URL}/queue')
        response.raise_for_status()
        data = response.json()
        return [(d['username'], d['is_connected']) for d in data]

    def queue_rotate(self) -> str:
        response = self.api_session.post(f'{API_URL}/queue')
        response.raise_for_status()
        data = response.json()
        return data['payload']

    def queue_broadcast(self):
        response = self.api_session.post(f'{API_URL}/broadcast')
        response.raise_for_status()

    @staticmethod
    def connect_ws():
        return websockets.connect(WS_URL)

