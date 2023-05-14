import os

APP_EXTERNAL_URL = 'https://twitcharena.live'
TRAFFIC_INTERNAL_URL = 'http://localhost:8443/api'
TRAFFIC_STREAM_ENDPOINT = TRAFFIC_INTERNAL_URL + '/users/'

TWITCH_CHANNEL = 'RandomTwitchersPlay'
BOT_NICK = 'RandomTwitchersPlay'

# mandatory
TWITCH_ACCESS_TOKEN = os.environ['TWITCH_ACCESS_TOKEN']
TWITCH_CLIENT_ID = os.environ['TWITCH_CLIENT_ID']
TWITCH_CLIENT_SECRET = os.environ['TWITCH_CLIENT_SECRET']
JWT_SECRET = os.environ['JWT_SECRET']

# environment vars can override any of the vars above
for var in dir():
    if var in os.environ:
        globals()[var] = os.environ
