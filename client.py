import socketio

# standard Python
sio = socketio.Client()
print('my sid is', sio.sid)

@sio.event
def connect():
    print("I'm connected!")
    sio.send('yeet')


@sio.event
def connect_error():
    print("The connection failed!")

@sio.event
def disconnect():
    print("I'm disconnected!")

@sio.event
def message(msg):
    print("MSG: ", msg)
    sio.send('yeet')

sio.connect('http://localhost:8443', transports='websocket')