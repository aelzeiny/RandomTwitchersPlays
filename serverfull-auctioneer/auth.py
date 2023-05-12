import os
from typing import Annotated, Optional
import aiohttp
from fastapi import Cookie, Depends, HTTPException, Response
from pydantic import BaseModel
import jwt
import json


class User(BaseModel):
    username: str
    token: Optional[str]
    refresh_token: Optional[str]


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
        algorithm=matched_key["alg"],
        options=dict(verify_aud=False),
    )
    assert (
        decoded_data["aud"] == os.environ["TWITCH_CLIENT_ID"]
    ), "This token is not meant for this client"
    return decoded_data


CookieType = Annotated[str | None, Cookie()]


def twitch_validate(session: aiohttp.ClientSession, token: str):
    return session.get(
        "https://id.twitch.tv/oauth2/validate",
        headers={"Authorization": f"Bearer {token}"},
    )


def twitch_refresh(session: aiohttp.ClientSession, refresh_token):
    return session.post(
        "https://id.twitch.tv/oauth2/token",
        params={
            "client_id": os.environ["TWITCH_CLIENT_ID"],
            "client_secret": os.environ["TWITCH_CLIENT_SECRET"],
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        },
    )


class UnauthorizedException(HTTPException):
    def __init__(self):
        super().__init__(
            401, dict(detail="UnAuthorized", clientId=os.environ["TWITCH_CLIENT_ID"])
        )


async def get_current_user(
    response: Response,
    username: CookieType = None,
    token: CookieType = None,
    refresh_token: CookieType = None,
) -> User:
    if not username or not token:
        raise UnauthorizedException()
    async with aiohttp.ClientSession() as session:
        challenge_req = await twitch_validate(session, token)
        if 200 <= challenge_req.status < 300:
            return User(username=username, token=token, refresh_token=refresh_token)
        if not refresh_token:
            raise UnauthorizedException()
        refresh_req = await twitch_refresh(session, refresh_token=refresh_token)
        if not (200 <= refresh_req.status < 300):
            raise UnauthorizedException()

        refresh_data = refresh_req.json()
        challenge_req = await twitch_validate(session, token)
        if not (200 <= challenge_req.status < 300):
            raise UnauthorizedException()

        response.set_cookie(key="token", value=refresh_data["access_token"])
        response.set_cookie(key="refresh", value=refresh_data["refresh_token"])
        response.set_cookie(key="username", value=username)

    return User(username=username, token=token, refresh_token=refresh_token)


RequiredUser = Annotated[User, Depends(get_current_user)]
