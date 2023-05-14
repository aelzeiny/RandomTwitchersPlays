import os


# mandatory
TWITCH_ACCESS_TOKEN = os.environ['TWITCH_ACCESS_TOKEN']
TWITCH_CLIENT_ID = os.environ['TWITCH_CLIENT_ID']
TWITCH_CLIENT_SECRET = os.environ['TWITCH_CLIENT_SECRET']
JWT_SECRET = os.environ['JWT_SECRET']


# optional
APP_EXTERNAL_URL = 'https://twitcharena.live'
TRAFFIC_INTERNAL_URL = 'http://localhost:8443/api'

TWITCH_CHANNEL = 'RandomTwitchersPlay'
BOT_NICK = 'RandomTwitchersPlay'


# environment vars can override any of the vars above
for var in dir():
    if var in os.environ:
        globals()[var] = os.environ[var]


# dependent & cannot be overwritten directly
TRAFFIC_USERS_ENDPOINT = TRAFFIC_INTERNAL_URL + '/users/'
APP_OAUTH_REDIRECT = f'https://id.twitch.tv/oauth2/authorize?client_id={TWITCH_CLIENT_ID}' \
                     f'&redirect_uri={APP_EXTERNAL_URL}/authorize' \
                      '&response_type=code&scope=openid'
