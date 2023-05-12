import asyncio
from typing import Literal
from fastapi import APIRouter, WebSocket
from pydantic import BaseModel
from auth import RequiredUser
from websockets.exceptions import ConnectionClosedError
from collections import defaultdict

import store


router = APIRouter()

SOCKETS: dict[str, list[WebSocket]] = defaultdict(list)


class WebsocketMessage(BaseModel):
    action: Literal["status", "ping"]


class PingResponse(BaseModel):
    id: str = "ping"
    message: str


class StatusResponse(BaseModel):
    id: str = "status"
    queue: list[str]
    whitelist: list[str]


def status_response() -> StatusResponse:
    return StatusResponse(queue=store.queue_scan(1000), whitelist=[])


def maybe_remove_socket(username: str, socket: WebSocket):
    sockets = SOCKETS[username]
    try:
        sockets.remove(socket)
    except ValueError:
        pass


async def broadcast():
    status = status_response()

    async def send_or_del(username: str, socket: WebSocket):
        try:
            await socket.send_json(status.dict())
        except ConnectionClosedError:
            maybe_remove_socket(username, socket)

    await asyncio.gather(
        *[
            send_or_del(username, socket)
            for username in list(SOCKETS)
            for socket in SOCKETS[username]
        ]
    )


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, user: RequiredUser):
    await websocket.accept()
    SOCKETS[user.username].append(websocket)
    while True:
        try:
            data = await websocket.receive_text()
            action: WebsocketMessage = WebsocketMessage.parse_raw(data)
            if action.action == "ping":
                await websocket.send_json(PingResponse(message="pong").dict())
            elif action.action == "status":
                await websocket.send_json(status_response().dict())
        except ConnectionClosedError:
            maybe_remove_socket(user.username, websocket)
