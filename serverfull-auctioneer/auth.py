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
        return jwt.encode(self.dict(), constants.JWT_SECRET).decode('utf8')


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
        decoded_data["aud"] == constants.TWITCH_CLIENT_ID
    ), "This token is not meant for this client"
    return decoded_data


class UnauthorizedException(HTTPException):
    def __init__(self):
        super().__init__(
            401, dict(detail="UnAuthorized", clientId=constants.TWITCH_CLIENT_ID)
        )


def get_current_user(token: CookieType = None) -> User:
    if not token:
        raise UnauthorizedException()
    try:
        decoded = jwt.decode(token, constants.JWT_SECRET)
    except jwt.exceptions.PyJWTError:
        raise UnauthorizedException()
    return User(username=decoded['username'], token=decoded['token'], refresh_token=decoded['refresh_token'])


RequiredUser = Annotated[User, Depends(get_current_user)]
