import React, { useRef, useState } from 'react';
import loadingScreen from './nook_loading.jpg';
import './Present.css';

import { WebRtcPeer } from 'kurento-utils';
import Base64 from 'crypto-js/enc-base64';
import HmacSHA256 from 'crypto-js/hmac-sha256';


const encodeBase64 = (value, padding) => {
    const encoded = window.btoa(window.unescape(window.encodeURIComponent(value)));
    if (!padding)
        return encoded.replace(/=+$/, '');
    return encoded;
};

const toJwt = (message, secret) => {
    const header = encodeBase64(JSON.stringify({alg: "HS256", typ: "JWT"}));
    const payload = encodeBase64(JSON.stringify(message));
    let signature = Base64.stringify(
        HmacSHA256(header + '.' + payload, secret)
    );
    // base64 -> base64URL
    signature = signature.split('+').join('-')
        .split('/').join('_')
        .replace(/(=+$)/g, "");
    return `${header}.${payload}.${signature}`;
}


export default function Present () {
    const [secret, setSecret] = useState('');
    const [proxy, setProxy] = useState('ws://localhost:9999');
    const vidRef = useRef();
    const name = '!PRESENTER';
    let rtcPeer;

    const connect = (e) => {
        const bttn = e.target;
        bttn.setAttribute('disabled', true);
        const jwt = toJwt({name: name}, secret);
        let ws = new WebSocket('ws://' + window.location.host + `/traffic?jwt=${jwt}`);
        // const wsProxy = new WebSocket(proxy);

        const receiveVideoResponse = ({ sdpAnswer }) => {
            rtcPeer.processAnswer (sdpAnswer, function (error) {
                if (error) return console.error (error);
            });
        };

        const addIceCandidate = ({ candidate }) => {
            rtcPeer.addIceCandidate(candidate, (error) => {
                if (error) {
                    console.error("Error adding candidate: " + error);
                }
            });
        };

        const onSwitchInput = ({ commonInput }) => {
            // wsProxy.sendMessage(commonInput);
        };

        const offerToReceiveVideo = (error, offerSdp) => {
            if (error)
                return console.error("sdp offer error " + error)
            ws.sendMessage({
                id: "receiveVideoFrom",
                sender: name,
                sdpOffer: offerSdp
            });
        };

	    ws.onmessage = (message) => {
            const parsedMessage = JSON.parse(message.data);
            console.info('Received message:', parsedMessage.id);
            const isPresenter = 'name' in parsedMessage && parsedMessage['name'] === name;

            switch (parsedMessage.id) {
                case 'receiveVideoAnswer':
                    if (isPresenter)
                        receiveVideoResponse(parsedMessage);
                    else
                        console.log("Message filtered: ", parsedMessage.id, parsedMessage.name);
                    break;
                case 'iceCandidate':
                    if (isPresenter)
                        addIceCandidate(parsedMessage);
                    else
                        console.log("Message filtered: ", parsedMessage.id, parsedMessage.name);
                    break;
                case 'switchInput':
                    onSwitchInput(parsedMessage);
                    break;
                default:
                    console.log('Message filtered: ', parsedMessage.id);
            }
	    }

	    ws.onclose = (err) => {
            bttn.removeAttribute('disabled');
	        console.error('we out', err);
        };

	    ws.onopen = () => {
	        console.log('we in', vidRef);
            const options = {
                localVideo: vidRef.current,
                mediaConstraints: {
                    audio: true,
                    video: {
                        mandatory: {
                            maxWidth: 320,
                            maxFrameRate: 15,
                            minFrameRate: 15
                        }
                    }
                },
                onicecandidate: (candidate) => {
                    ws.sendMessage({
                        id: 'onIceCandidate',
                        candidate: candidate,
                        name: name
                    });
                }
            };

            rtcPeer = new WebRtcPeer.WebRtcPeerSendonly(options, function offerCallback(err) {
                if (err)
                    return console.error(err);
                try {
                    this.generateOffer(offerToReceiveVideo)
                } catch (e) {
                    console.error(`Cannot generate offer because: ${e}`)
                }
            });
        };

    }
    return (
        <div className='container present-div'>
            <div className="row form-group">
                <div className="col-lg-5">
                    <label htmlFor="proxyInput">Proxy</label>
                    <input type="text"
                           className="form-control"
                           id="proxyInput"
                           placeholder="ws://localhost:9999"
                           value={proxy}
                           onChange={(e) => setProxy(e.target.value)}/>
                </div>
                <div className="col-lg-6">
                    <label htmlFor="secretInput">256-bit Secret Key</label>
                    <input type="password"
                           className="form-control"
                           id="secretInput"
                           placeholder="Super Secret Key"
                           value={secret}
                           onChange={(e) => setSecret(e.target.value)}/>
                </div>
                <div className="col-lg-1" id="connect-div">
                    <button type="button"
                            className="btn btn-dark"
                            onClick={connect}>Connect</button>
                </div>
            </div>
            <video key='presenter'
                   ref={vidRef}
                   className='player-vid'
                   autoPlay={true}
                   controls={false}
                   poster={loadingScreen}/>
        </div>
    )
}