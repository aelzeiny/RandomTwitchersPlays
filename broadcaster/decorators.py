from typing import Callable, Union, Tuple, Optional
from http.cookies import SimpleCookie

import os
import json
import functools
import traceback
import requests
import logging
import jwt


logger = logging.getLogger("handler_logger")
SECRET = os.environ['PRESENTER_SUPER_SECRET']


def jsonify(func: Callable[..., Union[Union[dict, str], Tuple[Union[dict, str], int, Optional[dict]]]])\
        -> Callable[..., dict]:
    """
    A function decorator that accepts 3 types of returns.
    A return type of a string will become a dictionary with the key of 'payload'.
    If the return type is a dictionary, then the status code is assumed to be 200
    If the return type is a tuple, then the first element must be the body, and the second must be the status code, the
        optional third element is a dictionary of kwargs that will be appended to the final result

    :return The response will be formatted as {'statusCode': [status], 'body': [dictionary], **kwargs}
    """
    @functools.wraps(func)
    def wrap(*args, **kwargs):
        try:
            answer = func(*args, **kwargs)
            status_code = 200
            kwargs = {}
            if isinstance(answer, tuple):
                if len(answer) == 2:
                    answer, status_code = answer
                else:
                    answer, status_code, kwargs = answer
            if isinstance(answer, str):
                answer = {'payload': answer}
            return {"statusCode": status_code, "body": json.dumps(answer), **kwargs}
        except Exception as e:
            logger.error(str(e))
            logger.debug(traceback.format_exc())
            return {"statusCode": 500, "body": json.dumps({'error': str(e)})}
    return wrap


def cors(func):
    """Serverless is CORs hell. I can't tell you how many hours I've lost to this."""
    allowed_origins = [
        'https://twitcharena.live',
        'https://localhost:3000',
        'https://127.0.0.1:3000'
    ]

    @functools.wraps(func)
    def wraps(event, *args, **kwargs):
        response = func(event, *args, **kwargs)
        if 'headers' in event and 'origin' in event['headers']:
            origin = event['headers']['origin']
            headers = {
                'Access-Control-Allow-Origin': origin if origin in allowed_origins else '*',
                'Access-Control-Allow-Credentials': True,
                'Access-Control-Expose-Headers': 'Access-Control-Allow-Origin',
            }
            if 'headers' in response:
                response['headers'] = {**response['headers'], **headers}
            else:
                response['headers'] = headers
        return response
    return wraps


def secret(func):
    """
    Super Secret JWT ONLY!
    """
    @functools.wraps(func)
    def wraps(event, *args, **kwargs):
        if 'headers' in event and 'Authorization' in event['headers']:
            event['headers']['authorization'] = event['headers']['Authorization']
        if not ('headers' in event and 'authorization' in event['headers']):
            return __unauthorized('Token not found')
        token = event['headers']['authorization'].lstrip('Bbearer').lstrip()
        try:
            jwt.decode(token, SECRET)
        except jwt.InvalidTokenError as e:
            return __unauthorized(str(e))
        if 'body' not in event:
            return __unauthorized('No username found')
        body = json.loads(event['body'])
        if 'username' not in body:
            return __unauthorized('No username found')
        return func(*args, **kwargs, user=body['username'], token=None)
    return wraps


def auth(func):
    """
    Twitch OAuth checker.
    There are 2 tokens in cookies: token and refresh.
    We get the user by verifying the token provided.
    If that challenge is rejected, we then try to refresh the cookie, and use that instead.
    """
    @functools.wraps(func)
    def wraps(event, *args, **kwargs):
        if 'headers' in event and 'Cookie' in event['headers']:
            event['headers']['cookie'] = event['headers']['Cookie']
        if not ('headers' in event and 'cookie' in event['headers']):
            return __unauthorized('Token not found')
        cookie = SimpleCookie()
        cookie.load(event['headers']['cookie'])
        if 'token' not in cookie:
            return __unauthorized('Token not found')
        # challenge the cookie
        challenge_req = requests.get(
            'https://id.twitch.tv/oauth2/validate',
            headers={'Authorization': f'Bearer {cookie["token"].value}'}
        )
        if 200 <= challenge_req.status_code < 300:
            return func(event, *args, **kwargs, user=challenge_req.json()['login'], token=cookie['token'].value)

        # if the first request didn't succeed; try-try again the refresh token
        if 'refresh' not in cookie:
            return __unauthorized('Cannot Authorize')
        refresh_req = requests.post(
            'https://id.twitch.tv/oauth2/token',
            params={
                'client_id': os.environ['TWITCH_CLIENT_ID'],
                'client_secret': os.environ['TWITCH_CLIENT_SECRET'],
                'grant_type': 'refresh_token',
                'refresh_token': cookie['refresh'].value,
            }
        )

        if not (200 <= refresh_req.status_code < 300):
            return __unauthorized('Unauthorized')

        refresh_data = refresh_req.json()
        # challenge the oauth token again
        challenge_req = requests.get(
            'https://id.twitch.tv/oauth2/validate',
            headers={'Authorization': f'Bearer {refresh_data["access_token"]}'}
        )
        if not (200 <= challenge_req.status_code < 300):
            return __unauthorized('Unauthorized with bad refresh token')

        answer = func(event, *args, **kwargs, user=challenge_req.json()['login'], token=refresh_data['access_token'])
        multi_headers = answer.pop('multiValueHeaders', {})
        set_cookies = multi_headers.pop('Set-Cookie', [])
        set_cookies.append(f'token="{refresh_data["access_token"]}"; Path=/; SameSite=None; Secure')
        set_cookies.append(f'refresh="{refresh_data["refresh_token"]}"; Path=/; SameSite=None; Secure')
        multi_headers['Set-Cookie'] = set_cookies
        answer['multiValueHeaders'] = multi_headers
        return answer
    return wraps


def auth_or_secret(func):
    @functools.wraps(func)
    def wraps(event, *args, **kwargs):
        if 'headers' in event and 'Authorization' in event['headers'] or 'authorization' in event['headers']:
            return secret(func)(event, *args, **kwargs)
        return auth(func)(event, *args, **kwargs)
    return wraps


def __unauthorized(message):
    return {
        'statusCode': 401,
        'body': json.dumps({'payload': message, 'clientId': os.environ['TWITCH_CLIENT_ID']})
    }