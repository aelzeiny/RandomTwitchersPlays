import './Play.css';
import loadingScreen from './nook_loading.jpg';

import React, { useEffect, useRef, useState } from 'react';
import { WebRtcPeer } from 'kurento-utils'
import { useParams } from 'react-router-dom';


const STATE_LOADING = 'loading';
const STATE_ERROR = 'error';
const STATE_STOPPED = 'stopped';


function Play() {
    const uuid = useParams().uuid;
    const videoRef = useRef();
    const [loadState, setLoadState] = useState({state: STATE_LOADING});

    useEffect(() => {
        const ws = new WebSocket('wss://localhost:8443/handshake?id=lol');
        ws.sendMessage = (objMsg) => ws.send(JSON.stringify(objMsg));
        let webRtcPeer;

        function viewerResponse(message) {
            if (message.response !== 'accepted') {
                const errorMsg = message.message ? message.message : 'Unknow error';
                console.warn('Call not accepted for the following reason: ' + errorMsg);
                webRtcPeer.dispose();
                setLoadState({state: STATE_STOPPED});
            } else {
                webRtcPeer.processAnswer(message.sdpAnswer);
            }
        }
        ws.onopen = () => {
            if (!webRtcPeer) {
                const options = {
                    remoteVideo: videoRef.current,
                    onicecandidate: (candidate => {
                        ws.sendMessage({
                            id: 'onIceCandidate',
                            candidate: candidate
                        });
                    })
                }

                webRtcPeer = WebRtcPeer.WebRtcPeerRecvonly(options, function(error) {
                    if (error) {
                        console.error(error);
                        setLoadState({state: STATE_ERROR, error: error});
                        return;
                    }

                    this.generateOffer((error, offerSdp) => {
                        if (error) {
                            console.error(error);
                            setLoadState({state: STATE_ERROR, error: error});
                            return;
                        }

                        ws.sendMessage({
                            id: 'viewer',
                            sdpOffer: offerSdp
                        });
                    });
                });
            }
        };
        ws.onmessage = (message) => {
            const parsedMessage = JSON.parse(message.data);
            console.info('Received message: ' + message.data);

            switch (parsedMessage.id) {
                case 'viewerResponse':
                    viewerResponse(parsedMessage);
                    break;
                case 'stopCommunication':
                    webRtcPeer.dispose();
                    setLoadState({state: STATE_STOPPED});
                    break;
                case 'iceCandidate':
                    webRtcPeer.addIceCandidate(parsedMessage.candidate)
                    break;
                default:
                    console.error('Unrecognized message', parsedMessage);
            }
        };
        return () => {
            ws.close();
            webRtcPeer.dispose();
        }
    }, [uuid, loadState, setLoadState]);
    return (
        <div className='video-holder'>
            <video ref={videoRef} id='video' key='video-play' autoPlay width="940px" height="480px"
                   style={{backgroundColor: 'black'}}
                   poster={loadingScreen}/>
        </div>
    );
}

export default Play;
