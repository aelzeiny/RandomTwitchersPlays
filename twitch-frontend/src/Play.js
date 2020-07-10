import React, {useEffect, useRef, useState} from 'react';

import { WebRtcPeer } from 'kurento-utils'
import './App.css';
import { useParams } from 'react-router-dom';
import loadingScreen from './nook_loading.jpg';


const STATE_LOADING = 'loading';
const STATE_ERROR = 'error';
const STATE_STOPPED = 'stopped';


function Play() {
    const videoRef = useRef(null);
    const uuid = useParams().uuid;
    const [loadState, setLoadState] = useState({state: STATE_LOADING});

    useEffect(() => {
        // Load websocket connection to this host. The UUID authenticates.
        const ws = new WebSocket('ws://' + window.location.host + `/in?uuid=${uuid}`);
        let webRtcPeer = null;
        ws.sendMessage = (message) => ws.send(JSON.stringify(message));

        ws.onopen = () => {
            // Load the WebRTC Connection
            const webRtcOptions = {
                remoteVideo: videoRef.current,
                onicecandidate: (candidate) => {
                   console.log('Local candidate' + JSON.stringify(candidate));
                   ws.sendMessage({id: 'onIceCandidate', candidate: candidate});
                }
            };
            webRtcPeer = WebRtcPeer.WebRtcPeerRecvonly(webRtcOptions, function(error) {
			if(error)
			    return setLoadState({state: STATE_ERROR, error: error});

			this.generateOffer((error, offserSdp) => {
			    if (error)
			        return setLoadState({state: STATE_ERROR, error: error});
			    ws.sendMessage({
                    id: 'offer',
                    sdpOffer: offserSdp
                });
            });
		});
        };
        const viewerResponse = (message) => {
            if (message.response !== 'accepted') {
                const errorMsg = message.message ? message.message : 'Unknow error';
                console.warn('Call not accepted for the following reason: ' + errorMsg);
                setLoadState({state: STATE_ERROR, error: message});
            } else {
                webRtcPeer.processAnswer(message.sdpAnswer);
            }
        };
        ws.onmessage = (message) => {
            const parsedMessage = JSON.parse(message.data);

            switch (parsedMessage.id) {
            case 'viewerResponse':
                viewerResponse(parsedMessage);
                break;
            case 'stopCommunication':
                setLoadState({state: STATE_STOPPED});
                break;
            case 'iceCandidate':
                webRtcPeer.addIceCandidate(parsedMessage.candidate)
                break;
            default:
                console.error('Unrecognized message', parsedMessage);
            }
        }
        return () => {
            ws.close();
            if (webRtcPeer)
                webRtcPeer.dispose();
        };
    }, [uuid, setLoadState]);
    return (
        <div>
            <h3>{loadState.state}</h3>
            <video ref={videoRef} autoPlay width="640px" height="480px" poster={loadingScreen}/>
        </div>
    );
}

export default Play;
