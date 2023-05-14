from typing import Generic, TypeVar
import aiohttp
import jwt
from fastapi import APIRouter, FastAPI, HTTPException, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import os

from pydantic import BaseModel
from pydantic.generics import GenericModel
import store
import sockets
import twitch_chatbot

import auth
from auth import RequiredUser
import uvicorn

app = FastAPI()


api = APIRouter(prefix="/api")


DataT = TypeVar("DataT")


class PayloadResponse(GenericModel, Generic[DataT]):
    payload: DataT


class OkResponse(PayloadResponse[str]):
    payload: str = "success"


class PositionPayload(BaseModel):
    position: int


# http://localhost:5001/api/login/y5b5nw8x6067jddrvr0h2wrrw42u02


@api.get("/queue")
async def broadcast() -> OkResponse:
    await sockets.broadcast()
    return OkResponse()


@api.post("/queue")
def rotate():
    pass


@api.put("/queue")
def allowlist():
    pass


@api.put("/user")
async def join(user: RequiredUser) -> OkResponse:
    store.queue_push(user.username)
    await sockets.broadcast_status()
    return OkResponse()


@api.delete("/user")
async def leave(user: RequiredUser) -> OkResponse:
    store.queue_remove(user.username)
    await sockets.broadcast_status()
    return OkResponse()


@api.get("/user/{_username}")
def position(_username: str, user: RequiredUser) -> PayloadResponse[PositionPayload]:
    if _username != user.username:
        raise HTTPException(402, detail="Unauthorized User")
    pos = store.queue_rank(_username)
    return PayloadResponse(payload=PositionPayload(position=pos))


@api.get("/login/{code}")
async def login(code: str, response: Response) -> OkResponse:
    async with aiohttp.ClientSession() as session:
        auth_response = await session.post(
            "https://id.twitch.tv/oauth2/token",
            params={
                "client_id": os.environ["TWITCH_CLIENT_ID"],
                "client_secret": os.environ["TWITCH_CLIENT_SECRET"],
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": "https://localhost:3000/authorize",
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
        name=oidc_token["preferred_username"],
        token=data["access_token"],
        refresh=data["refresh_token"]
    )
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


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5001, workers=1)