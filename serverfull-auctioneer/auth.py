from typing import Annotated, Optional
import aiohttp
from fastapi import Cookie, Depends, HTTPException, Response
from pydantic import BaseModel
import jwt
import json

import constants

CookieType = Annotated[str | None, Cookie()]


class User(BaseModel):
    username: str
    token: Optional[str]
    refresh_token: Optional[str]

    def to_jwt(self) -> str:
        answer = jwt.encode(self.dict(), constants.JWT_SECRET, algorithm="HS256")
        if isinstance(answer, bytes):
            answer = answer.decode('utf8')
        return answer


async def validate_oidc(id_token: str) -> Optional[dict[str, str]]:
    header = jwt.get_unverified_header(id_token)

    async with aiohttp.ClientSession() as session:
        twitch_pub_res = await session.get("https://id.twitch.tv/oauth2/keys")

    twitch_pub_res.raise_for_status()
    twitch_pub_data = await twitch_pub_res.json()
    assert "keys" in twitch_pub_data, "Twitch pubkey changed"
    twitch_pub_keys = {k["kid"]: k for k in twitch_pub_data["keys"]}
    assert (
        "kid" in header and header["kid"] in twitch_pub_keys
    ), "No matching Key ID from twitch. Check your id token."
    matched_key = twitch_pub_keys[header["kid"]]
    matched_rsa = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(matched_key))

    decoded_data = jwt.decode(
        id_token,
        matched_rsa,
        algorithms=[matched_key["alg"]],
        options=dict(verify_aud=False),
    )
    assert (
        decoded_data["aud"] == constants.TWITCH_CLIENT_ID
    ), "This token is not meant for this client"
    return decoded_data


async def refresh_token(_refresh_token: str) -> tuple[str, str]:
    async with aiohttp.ClientSession() as session:
        req = await session.post('https://id.twitch.tv/oauth2/token', data=dict(
            client_id=constants.TWITCH_CLIENT_ID,
            client_secret=constants.TWITCH_CLIENT_SECRET,
            grant_type='refresh_token',
            refresh_token=_refresh_token,
        ))
        resp = await req.json()
        return resp['access_token'], resp['refresh_token']


class UnauthorizedException(HTTPException):
    def __init__(self):
        super().__init__(
            401, dict(detail="Unauthorized", redirect=constants.APP_OAUTH_REDIRECT)
        )


def get_current_user(token: CookieType = None) -> User:
    if not token:
        raise UnauthorizedException()
    try:
        decoded = jwt.decode(token, constants.JWT_SECRET, algorithms=["HS256"])
    except jwt.exceptions.PyJWTError:
        raise UnauthorizedException()
    if decoded['username'] == constants.PRESENTER:  # by user we don't mean presenter!
        raise UnauthorizedException()
    return User(username=decoded['username'], token=decoded['token'], refresh_token=decoded['refresh_token'])


RequiredUser = Annotated[User, Depends(get_current_user)]
