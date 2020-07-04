"""
Purpose: Create a flask websocket server that can take in a controller input & relay it to my PC which relays it to my
switch. Basically, I got tired of having to be home to work on this project.
"""
import os
from flask import Blueprint, Flask
from flask_socketio import SocketIO

# socket_blueprint = Blueprint(
#     'sockets',
#     __name__,
#     static_folder='kurento-tutorial-node/kurento-hello-world/static/',
# )

socket_blueprint = Flask(
    __name__,
    static_url_path='',
    static_folder='kurento-tutorial-node/kurento-hello-world/static'
)
socket_blueprint.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(socket_blueprint)


@socket_blueprint.route('/')
def index():
    return socket_blueprint.send_static_file('index.html')


@socketio.on('connection', namespace='/helloworld')
def socket_connect(*args, **kwargs):
    print('Connected!')


@socketio.on('close', namespace='/helloworld')
def socket_disconnect(*args, **kwargs):
    print('Disconnected!')


@socketio.on('error', namespace='/helloworld')
def socket_error(*args, **kwargs):
    print('Errored out!')


@socketio.on('message', namespace='/helloworld')
def socket_message(message):
    print(message)
    socketio.send('yoot')


if __name__ == '__main__':
    context = ('server.crt', 'server.key')
    # socketio.run(socket_blueprint, port=8443)
    socket_blueprint.run(port=8443)
