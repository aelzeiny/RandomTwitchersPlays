from flask import Flask, Blueprint
from flask import session, redirect, request, url_for, jsonify
import requests
import json
from os import getenv

import werkzeug
from werkzeug.urls import url_quote, url_decode, url_encode
from werkzeug.http import parse_options_header
from werkzeug.utils import cached_property

# needed for flask_oauth to be compatible with werkzeug > 1.0
werkzeug.url_quote = url_quote
werkzeug.url_decode = url_decode
werkzeug.url_encode = url_encode
werkzeug.parse_options_header = parse_options_header
werkzeug.cached_property = cached_property
from flask_oauthlib.client import OAuth

TWITCH_CLIENT_ID = getenv('TWITCH_CLIENTID')
TWITCH_SECRET = getenv('TWITCH_SECRET')

auth_blueprint = Blueprint('auth')
auth_blueprint.secret_key = "development"

oauth = OAuth()

twitch = oauth.remote_app(
    'twitch',
    base_url='https://api.twitch.tv/kraken/',
    request_token_url=None,
    access_token_method='POST',
    access_token_url='https://api.twitch.tv/kraken/oauth2/token',
    authorize_url='https://api.twitch.tv/kraken/oauth2/authorize',
    consumer_key=TWITCH_CLIENT_ID,
    consumer_secret=TWITCH_SECRET,
    request_token_params={'scope': ["user_read", "channel_check_subscription"]}
)


@auth_blueprint.route('/')
def index():
    if 'twitch_token' in session:
        headers = {'Authorization': ("OAuth " + session['twitch_token'][0])}
        r = requests.get(twitch.base_url, headers=headers)
        return jsonify(json.loads(r.text))
    return redirect(url_for('login'))


@twitch.tokengetter
def get_twitch_token(token=None):
    return session.get('twitch_token')


@auth_blueprint.route('/login')
def login():
    return twitch.authorize(callback=url_for('authorized', _external=True))


@auth_blueprint.route('/login/authorized')
def authorized():
    resp = twitch.authorized_response()
    if resp is None:
        return 'Access denied: reason=%s error=%s' % (
            request.args['error'],
            request.args['error_description']
        )
    session['twitch_token'] = (resp['access_token'], '')
    print(resp)
    me = twitch.get('/')
    return jsonify(me.data)


@auth_blueprint.route('/logout')
def logout():
    session.pop('twitch_token', None)
    return redirect(url_for('index'))