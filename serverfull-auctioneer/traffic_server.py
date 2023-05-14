import aiohttp
import pydantic
from pydantic import BaseModel

import constants


class TrafficStatusResponseUser(BaseModel):
    user_id: pydantic.Field(alias="userId", type_=str)
    time: int


class TrafficStatusResponse(BaseModel):
    stream: list[str]
    whitelist: list[TrafficStatusResponseUser]
    has_presenter: bool


async def status() -> TrafficStatusResponse:
    """Gets the status of the traffic controller"""
    async with aiohttp.ClientSession() as session:
        response = await session.get(constants.TRAFFIC_USERS_ENDPOINT)
        return TrafficStatusResponse(**(await response.json()))


async def set_allowed_streamers(allowed_usernames: list[str]) -> None:
    """Sets the allowed usernames in the traffic controller"""
    async with aiohttp.ClientSession() as session:
        await session.post(constants.TRAFFIC_USERS_ENDPOINT, data=allowed_usernames)
