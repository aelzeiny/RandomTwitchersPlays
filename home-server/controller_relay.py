import asyncio
import binascii

import websockets
import json
import serial
import argparse


async def writer(websocket, path):
    print('we in')
    ser = serial.Serial(
        args.port,
        args.baud_rate,
        bytesize=serial.EIGHTBITS,
        parity=serial.PARITY_NONE,
        stopbits=serial.STOPBITS_ONE,
        timeout=None
    )
    async for message in websocket:
        controller = json.loads(message)
        if controller['id'].lower() == 'ping':
            await websocket.send(json.dumps({'id': 'pong'}))
        elif controller['id'] == 'switchInput':
            # await websocket.send(json.dumps(controller))
            hex_formatted = binascii.hexlify(bytes(controller['input'])) + b'\n'
            # print('sending', hex_formatted)
            ser.write(hex_formatted)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('-b', '--baud-rate', type=int, default=115200, help='Baud rate. Default: 115200.')
    parser.add_argument('-p', '--port', type=str, default='/dev/ttyUSB0', help='Serial port. Default: /dev/ttyUSB0.')
    args = parser.parse_args()

    websocket_server = websockets.serve(writer, '127.0.0.1', 9999)
    asyncio.get_event_loop().run_until_complete(websocket_server)
    asyncio.get_event_loop().run_forever()
