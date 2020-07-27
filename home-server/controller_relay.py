import asyncio
import binascii

import websockets
import json
import serial
import argparse


async def writer(websocket, path):
    ser = serial.Serial(
        args.port,
        args.baud_rate,
        bytesize=serial.EIGHTBITS,
        parity=serial.PARITY_NONE,
        stopbits=serial.STOPBITS_ONE,
        timeout=None
    )
    async for message in websocket:
        controller = json.dumps(message)
        hex_formatted = binascii.hexlify(controller) + b'\n'
        ser.write(hex_formatted)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('-b', '--baud-rate', type=int, default=115200, help='Baud rate. Default: 115200.')
    parser.add_argument('-p', '--port', type=str, default='/dev/ttyUSB0', help='Serial port. Default: /dev/ttyUSB0.')
    args = parser.parse_args()

    asyncio.get_event_loop().run_until_complete(
        websockets.serve(writer, 'localhost', 9999)
    )
    asyncio.get_event_loop().run_forever()
