from flask import Flask, Blueprint
from flask import session, redirect, request, url_for, jsonify
import requests
import json
from os import getenv
# from .auth import auth_blueprint
from sockets import socket_blueprint, socketio

TWITCH_CLIENT_ID = getenv('TWITCH_CLIENTID')
TWITCH_SECRET = getenv('TWITCH_SECRET')

app = Flask(__name__)
# app.register_blueprint(auth_blueprint, url_prefix='/auth')
app.register_blueprint(socket_blueprint)
socketio.init_app(app)


if __name__ == '__main__':
    app.run(port=8443, debug=True)
