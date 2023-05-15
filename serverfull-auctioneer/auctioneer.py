import asyncio
import logging
from typing import Generic, TypeVar
import aiohttp
from fastapi import APIRouter, FastAPI, HTTPException, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

from pydantic import BaseModel
from pydantic.generics import GenericModel

import constants
import heartbeat
import store
import sockets

import auth
import twitch_chatbot
from auth import RequiredUser
import uvicorn


log = logging.root.getChild(__name__)
app = FastAPI()


api = APIRouter(prefix="/api")


DataT = TypeVar("DataT")


class PayloadResponse(GenericModel, Generic[DataT]):
    payload: DataT


class OkResponse(PayloadResponse[str]):
    payload: str = "success"


class UserPayload(BaseModel):
    username: str


class PositionPayload(BaseModel):
    position: int


class PresenterRequest(BaseModel):
    token: str


@api.put("/user")
async def join(user: RequiredUser) -> PayloadResponse[UserPayload]:
    log.info(f'User {user.username} joined the Q')
    if store.queue_push(user.username):
        asyncio.ensure_future(sockets.broadcast_status())
    return PayloadResponse(payload=UserPayload(username=user.username))


@api.delete("/user")
async def leave(user: RequiredUser) -> OkResponse:
    log.info(f'User {user.username} left the Q')
    if store.queue_remove(user.username):
        asyncio.ensure_future(sockets.broadcast_status())
    return OkResponse()


@api.get("/login")
async def login(code: str, response: Response) -> PayloadResponse[UserPayload]:
    async with aiohttp.ClientSession() as session:
        auth_response = await session.post(
            "https://id.twitch.tv/oauth2/token",
            params={
                "client_id": constants.TWITCH_CLIENT_ID,
                "client_secret": constants.TWITCH_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": f"{constants.APP_EXTERNAL_URL}/authorize",
            },
        )
        data = await auth_response.json()
        if not (200 <= auth_response.status < 300):
            raise HTTPException(status_code=auth_response.status, detail=data)
    try:
        oidc_token = await auth.validate_oidc(data["id_token"])
    except (AssertionError, KeyError) as e:
        raise HTTPException(status_code=401, detail=str(e))
    user = auth.User(
        username=oidc_token["preferred_username"],
        token=data["access_token"],
        refresh=data["refresh_token"]
    )
    response.set_cookie(key="token", value=user.to_jwt(), httponly=True)
    return PayloadResponse(payload=UserPayload(username=user.username))


@api.post("/present")
async def present(token: PresenterRequest, response: Response) -> OkResponse:
    if token.token != constants.JWT_SECRET:
        raise auth.UnauthorizedException()
    user = auth.User(username=constants.PRESENTER)
    response.set_cookie(key="token", value=user.to_jwt(), httponly=True)
    return OkResponse()


app.include_router(api)
app.include_router(sockets.router)


with open("./static/index.html") as index_file:
    INDEX_HTML = index_file.read()


app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/{full_path:path}")
async def index(path: str = None):
    """HTML Response Catch all"""
    return HTMLResponse(content=INDEX_HTML, status_code=200)


@app.on_event("startup")
async def startup_event():
    """Register critical asyncio loops"""
    loop = asyncio.get_event_loop()
    loop.create_task(heartbeat.main())
    loop.create_task(twitch_chatbot.main(sockets.BOT))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5001, workers=1)
