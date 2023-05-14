import asyncio
from typing import Literal
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from starlette.websockets import WebSocketState

import twitch_chatbot
from auth import RequiredUser
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


BOT = asyncio.Queue()


def status_response() -> StatusResponse:
    return StatusResponse(queue=store.queue_scan(1000), whitelist=[])


def maybe_remove_socket(username: str, socket: WebSocket):
    sockets = SOCKETS[username]
    try:
        sockets.remove(socket)
    except ValueError:
        pass


async def _broadcast(data: dict):
    async def send_or_del(username: str, socket: WebSocket):
        if socket.client_state == WebSocketState.DISCONNECTED:
            return
        try:
            await socket.send_json(data)
        except WebSocketDisconnect:
            maybe_remove_socket(username, socket)

    await asyncio.gather(
        *[
            send_or_del(username, socket)
            for username in list(SOCKETS)
            for socket in SOCKETS[username]
            if socket.client_state != WebSocketState.DISCONNECTED
        ],
        BOT.put(data)
    )


async def broadcast_status():
    status = status_response().dict()
    await _broadcast(status)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, user: RequiredUser):
    await websocket.accept()
    SOCKETS[user.username].append(websocket)
    async for data in websocket.iter_text():
        try:
            action: WebsocketMessage = WebsocketMessage.parse_raw(data)
            if action.action == "ping":
                await websocket.send_json(PingResponse(message="pong").dict())
            elif action.action == "status":
                await websocket.send_json(status_response().dict())
        except WebSocketDisconnect:
            maybe_remove_socket(user.username, websocket)
            break


@router.on_event("startup")
async def startup_event():
    loop = asyncio.get_event_loop()
    task = loop.create_task(twitch_chatbot.main(BOT))
