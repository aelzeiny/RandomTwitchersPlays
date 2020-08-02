import asyncio
import functools
import traceback
from typing import List, Tuple, Optional

import websockets
from requests import session

import os
import json
import jwt


SUPER_SECRET_KEY = os.environ['PRESENTER_SUPER_SECRET']
APP_EXTERNAL_URL = 'https://twitcharena.live'
APP_INTERNAL_URL = 'https://twitcharena.live/api/users'
WS_URL = 'wss://nq8v1ckz81.execute-api.us-east-1.amazonaws.com/dev'
API_URL = 'https://hvpdl44jfl.execute-api.us-east-1.amazonaws.com/dev'


class AppApi:
    def __init__(self):
        self.jwt = jwt.encode({'name': '!HEARTBEAT'}, SUPER_SECRET_KEY).decode('utf8')

        self.app_session = session()
        self.app_session.headers['Authorization'] = f'Bearer {self.jwt}'
        self.app_session.headers['Content-Type'] = 'application/json'

        self.api_session = session()
        self.api_session.headers['Authorization'] = f'Bearer {self.jwt}'
        self.api_session.headers['Content-Type'] = 'application/json'

    def stream_status(self) -> Tuple[List[Tuple[str, int]], List[Tuple[str, int]]]:
        """
        :return:
        Item 0: user id, twitch tag, and current play-time (in secs) of each user on the stream.
        Item 1: user id, twitch tag, and current queue-time (in secs) of each whitelisted user.
        """
        response = self.app_session.get(APP_INTERNAL_URL)
        response.raise_for_status()
        data = response.json()
        stream = [(d['userId'], d['time']) for d in data['stream']]
        whitelist = [(d['userId'], d['time']) for d in data['whitelist']]
        return stream, whitelist

    def stream_update(self, usernames: List[str]):
        user_data = [{'username': u} for u in usernames]
        response = self.app_session.post(APP_INTERNAL_URL, data=json.dumps(user_data))
        response.raise_for_status()
        return response.json()

    def user_join(self, username) -> str:
        response = self.api_session.put(f'{API_URL}/user', json={'username': username})
        response.raise_for_status()
        return f"{APP_EXTERNAL_URL}/queue"

    def user_remove(self, username) -> bool:
        response = self.api_session.delete(f'{API_URL}/user', json={'username': username})
        response.raise_for_status()
        return response.json()['payload'] == 'REMOVED'

    def user_position(self, username) -> Tuple[Optional[int], bool]:
        response = self.api_session.get(f'{API_URL}/user/{username}')
        response.raise_for_status()
        data = response.json()
        return data['position'], data['in_stream']

    def queue_rotate(self) -> Optional[Tuple[str, str]]:
        response = self.api_session.post(f'{API_URL}/queue')
        response.raise_for_status()
        data = response.json()
        return data['username']

    def queue_broadcast(self):
        response = self.api_session.get(f'{API_URL}/queue')
        response.raise_for_status()

    def queue_whitelist(self, usernames: List[str]) -> List[str]:
        response = self.api_session.put(f'{API_URL}/queue', json=usernames)
        response.raise_for_status()
        return response.json()

    def connect_ws(self):
        return websockets.connect(f'{WS_URL}?jwt={self.jwt}')


def forever(func):
    """Async loop runs forever; resiliently never exiting"""
    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        while True:
            try:
                await func(*args, **kwargs)
            except KeyboardInterrupt:
                break
            except:  # noqa E722
                print(traceback.format_exc())
                await asyncio.sleep(30)
    return wrapper
