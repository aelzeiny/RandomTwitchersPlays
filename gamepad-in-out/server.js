const path = require('path');
const url = require('url');
const express = require('express');
const minimist = require('minimist');
const ws = require('ws');
const kurento = require('kurento-client');
const fs    = require('fs');
const https = require('https');
const util = require('util');
const kurentoify = util.promisify(kurento);
const NO_PRESENTER_MSG = 'No active presenter. Try again later...';
const { presenterJWTSecret } = require('./configs');
const jwt = require('jsonwebtoken');


const argv = minimist(process.argv.slice(2), {
    default: {
        as_uri: 'https://localhost:8443/',
        ws_uri: 'ws://localhost:8888/kurento'
    }
});

const options = {
  key:  fs.readFileSync('keys/server.key'),
  cert: fs.readFileSync('keys/server.crt')
};

const app = express();

/*
 * Definition of global variables.
 */
let idCounter = 0;
const candidatesQueue = {};
let kurentoClient = null;
let presenter = null;
let viewers = [];

/*
 * Server startup
 */
var asUrl = url.parse(argv.as_uri);
var port = asUrl.port;
var server = https.createServer(options, app).listen(port, function() {
    console.log('Kurento Tutorial started');
    console.log('Open ' + url.format(asUrl) + ' with a WebRTC capable browser');
});

const wss = new ws.Server({
    server : server,
    path : '/handshake'
});

function nextUniqueId() {
	idCounter++;
	return idCounter.toString();
}

/*
 * Management of WebSocket messages
 */
wss.on('connection', (_ws) => {
	const sessionId = nextUniqueId();
	console.log('Connection received with sessionId ' + sessionId);
	_ws.sendJson = function(msg){
		this.send(JSON.stringify(msg));
	};

    _ws.on('error', (error) => {
        console.log('Connection ' + sessionId + ' error. ' + error.toString());
        stop(sessionId);
    });

    _ws.on('close', () => {
        console.log('Connection ' + sessionId + ' closed');
        stop(sessionId);
    });

    _ws.on('message', async (_message) => {
        let message = JSON.parse(_message);
        console.log('Connection ' + sessionId + ' received message ', message);

        if (message.user === 'presenter') {
        	message = await verifyPresenter(message);
        	if (!message)
        		return _ws.close(1003, 'Invalid Authentication as presenter');
		}

        switch (message.id) {
        case 'presenter':
			startPresenter(sessionId, _ws, message.sdpOffer).then(sdpAnswer => {
				_ws.sendJson({
					id : 'presenterResponse',
					response : 'accepted',
					sdpAnswer : sdpAnswer
				});
			}).catch(error => {
				_ws.sendJson({
					id : 'presenterResponse',
					response : 'rejected',
					message : error
				});
			});
			break;

        case 'viewer':
			startViewer(sessionId, _ws, message.sdpOffer).then(sdpAnswer => {
				_ws.sendJson({
					id : 'viewerResponse',
					response : 'accepted',
					sdpAnswer : sdpAnswer
				});
			}).catch(error => {
				return _ws.sendJson({
					id : 'viewerResponse',
					response : 'rejected',
					message : error
				});
			});
			break;

        case 'stop':
            stop(sessionId);
            break;

        case 'onIceCandidate':
            onIceCandidate(sessionId, message.candidate);
            break;

        default:
            _ws.sendJson({
                id : 'error',
                message : 'Invalid message ' + message
            });
            break;
        }
    });
});

/*
 * Definition of functions
 */

// Recover kurentoClient for the first time.
function getKurentoClient() {
	return new Promise(((resolve, reject) => {
		if (kurentoClient !== null) {
			return resolve(kurentoClient);
		}

		kurentoify(argv.ws_uri).then(_kurentoClient => {
			kurentoClient = _kurentoClient;
			_kurentoClient.creatify = util.promisify(_kurentoClient.create);
			resolve(_kurentoClient);
		}).catch(reject);
	}));
}

function startPresenter(sessionId, _ws, sdpOffer) {
	clearCandidatesQueue(sessionId);

	return new Promise(((resolve, reject) => {
		if (presenter) {
			stop(sessionId);
			return reject("Another user is currently acting as presenter. Try again later ...");
		}

		presenter = {
			id: sessionId,
			pipeline: null,
			webRtcEndpoint: null
		};

		const pipelinePromise = getKurentoClient().then(kurentoClient => {
			if (!presenter) {
				stop(sessionId);
				return reject(NO_PRESENTER_MSG);
			}
			return kurentoClient.creatify('MediaPipeline');
		});
		pipelinePromise.catch(reject);
		pipelinePromise.then(pipeline => {
			presenter.pipeline = pipeline;
			return util.promisify(pipeline.create)('WebRtcEndpoint');
		}).then(webRtcEndpoint => {
			if (!presenter){
				stop(sessionId);
				return reject(NO_PRESENTER_MSG);
			}

			presenter.webRtcEndpoint = webRtcEndpoint;

			if (candidatesQueue[sessionId]) {
				while(candidatesQueue[sessionId].length) {
					let candidate = candidatesQueue[sessionId].shift();
					webRtcEndpoint.addIceCandidate(candidate);
				}
			}

			webRtcEndpoint.on('OnIceCandidate', (event) => {
				var candidate = kurento.getComplexType('IceCandidate')(event.candidate);
				_ws.sendJson({
					id : 'iceCandidate',
					candidate : candidate
				});
			});

			const processOfferify = util.promisify((...args) => webRtcEndpoint.processOffer(...args));
			processOfferify(sdpOffer).then(sdpAnswer => {
				if (!presenter) {
					stop(sessionId);
					return reject(NO_PRESENTER_MSG);
				}
				return resolve(sdpAnswer);
			}).catch(err => {
				stop(sessionId);
				return reject(err);
			})

			webRtcEndpoint.gatherCandidates((error) => {
				if (error) {
					stop(sessionId);
					return reject(error);
				}
			});
		}).catch(reject);
	}));
}

function startViewer(sessionId, _ws, sdpOffer) {
	const startViewerPromise = new Promise((resolve, reject) => {
		clearCandidatesQueue(sessionId);
		if (!presenter) {
			return reject(NO_PRESENTER_MSG);
		}
		util.promisify(presenter.pipeline.create)('WebRtcEndpoint').then(webRtcEndpoint => {
			viewers[sessionId] = {
				webRtcEndpoint: webRtcEndpoint,
				ws: _ws
			};
			if (!presenter)
				return reject(NO_PRESENTER_MSG);

			console.log('yeet', sessionId, candidatesQueue[sessionId]);
			if (candidatesQueue[sessionId]) {
				while(candidatesQueue[sessionId].length) {
					let candidate = candidatesQueue[sessionId].shift();
					webRtcEndpoint.addIceCandidate(candidate);
				}
			}

			webRtcEndpoint.on('OnIceCandidate', event => {
				let candidate = kurento.getComplexType('IceCandidate')(event.candidate);
				_ws.sendJson({
					id: 'iceCandidate',
					candidate: candidate
				});
			});

			const processOfferify = util.promisify((...args) => webRtcEndpoint.processOffer(...args));
			const endpointConnectify = util.promisify((...args) => presenter.webRtcEndpoint.connect(...args));
			processOfferify(sdpOffer).then(sdpAnswer => {
				if (!presenter)
					return reject(NO_PRESENTER_MSG);

				endpointConnectify(webRtcEndpoint).then(() => {
					if (!presenter)
						return reject(NO_PRESENTER_MSG);
					webRtcEndpoint.gatherCandidates(function(error) {
						if (error)  return reject(error);
					});

					resolve(sdpAnswer);
				}).catch(reject);
			});
        });
	});
	startViewerPromise.catch(() => {
		stop(sessionId);
	});
	return startViewerPromise;
}

function clearCandidatesQueue(sessionId) {
	if (candidatesQueue[sessionId]) {
		delete candidatesQueue[sessionId];
	}
}

function stop(sessionId) {
	if (presenter && presenter.id == sessionId) {
		for (let i in viewers) {
			let viewer = viewers[i];
			if (viewer.ws) {
				viewer.ws.send(JSON.stringify({
					id : 'stopCommunication'
				}));
			}
		}
		presenter.pipeline.release();
		presenter = null;
		viewers = [];

	} else if (viewers[sessionId]) {
		viewers[sessionId].webRtcEndpoint.release();
		delete viewers[sessionId];
	}

	clearCandidatesQueue(sessionId);

	if (viewers.length < 1 && !presenter) {
        console.log('Closing kurento client');
        kurentoClient.close();
        kurentoClient = null;
    }
}

function onIceCandidate(sessionId, _candidate) {
    let candidate = kurento.getComplexType('IceCandidate')(_candidate);

    if (presenter && presenter.id === sessionId && presenter.webRtcEndpoint) {
        console.info('Sending presenter candidate');
        presenter.webRtcEndpoint.addIceCandidate(candidate);
    }
    else if (viewers[sessionId] && viewers[sessionId].webRtcEndpoint) {
        console.info('Sending viewer candidate');
        viewers[sessionId].webRtcEndpoint.addIceCandidate(candidate);
    }
    else {
        console.info('Queueing candidate');
        if (!candidatesQueue[sessionId]) {
            candidatesQueue[sessionId] = [];
        }
        candidatesQueue[sessionId].push(candidate);
    }
}

function verifyPresenter(message) {
	return new Promise(((resolve) => {
		return jwt.verify(message.jwt, presenterJWTSecret, (err, decoded) => {
			if (err) {
				console.log('Invalid credentials to be a presenter: ', err);
				return resolve(null);
			}
			resolve(decoded);
		});
	}))
}

app.use(express.static(path.join(__dirname, 'static')));
