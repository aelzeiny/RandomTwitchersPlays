import './Play.css';
import loadingScreen from './nook_loading.jpg';

import React from 'react';
import { WebRtcPeer } from 'kurento-utils';
import GamepadSelection from "./gamepad/GamepadSelection";
import GamepadDisplay from "./gamepad/GamepadDisplay";
import {switchObservable, updateController} from "./gamepad/gamepadApi";

WebSocket.prototype.sendMessage = function (msg) {
    const jsonMessage = JSON.stringify(msg);
    console.log('Sending message: ' + jsonMessage);
    this.send(jsonMessage);
}


export default class Play extends React.Component {
    constructor(props) {
        super(props);
        this.id = this.props.match.params.uuid;

        this.state = {
            players: new Set(),
            presenter: null
        };
        this.webRtc = {};
        this.ws = null;
    }

    componentDidMount() {
        this.ws = new WebSocket('ws://' + window.location.host + `/traffic?id=${this.id}`);
	    this.ws.onmessage = (message) => {
            const parsedMessage = JSON.parse(message.data);
            console.info('Received message:', parsedMessage.id);

            switch (parsedMessage.id) {
                case 'newParticipantArrived':
                    this.receiveVideo(parsedMessage);
                    break;
                case 'existingParticipants':
                    this.onExistingParticipants(parsedMessage);
                    break;
                case 'participantLeft':
                    this.onParticipantLeft(parsedMessage);
                    break;
                case 'receiveVideoAnswer':
                    this.receiveVideoResponse(parsedMessage);
                    break;
                case 'iceCandidate':
                    this.addIceCandidate(parsedMessage);
                    break;
                default:
                    console.error('Unrecognized message', parsedMessage);
            }
	    }

	    this.ws.onclose = () => {
	        this.props.history.push('/');
        };
    }

    componentWillUnmount() {
        this.ws.sendMessage({
            id: 'leaveRoom'
        });

        // dispose RTC Peer connections
        for (let player of this.state.players) {
            this.webRtc[player].rtcPeer.dispose();
        }

        // close socket
        this.ws.close();
    }

    componentDidUpdate(_, prevState, __) {
        // check for connected players
        for (let player of this.state.players) {
            if (!prevState.players.has(player)) {
                const offerToReceiveVideo = this.offerToReceiveVideo.bind(this, player);
                function offerCallback(err) {
                    if (err) {
                        return console.error(err);
                    }
                    try {
                        this.generateOffer(offerToReceiveVideo)
                    } catch (e) {
                        console.error(`Cannot generate offer because: ${e}`)
                    }
                }
                console.log(`${this.id} sees another player: ${player}`);
                if (player === this.id) {
                    const options = {
                        localVideo: this.webRtc[player].video,
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
                        onicecandidate: this.onIceCandidate.bind(this, player)
                    };
                    this.webRtc[player].rtcPeer = new WebRtcPeer.WebRtcPeerSendonly(options, offerCallback);
                } else {
                    const options = {
                        remoteVideo: this.webRtc[player].video,
                        onicecandidate: this.onIceCandidate.bind(this, player)
                    };
                    this.webRtc[player].rtcPeer = new WebRtcPeer.WebRtcPeerRecvonly(options, offerCallback);
                }
            }
        }
        // Check for disconnected players
        for (let player of prevState.players) {
            if (!this.state.players.has(player)) {
                console.log(`${player} has left the room`)
                this.webRtc[player].rtcPeer.dispose();
                delete this.webRtc[player]
            }
        }
    }

    receiveVideo({ name } ) {
        this.setState({
            players: new Set([name, ...this.state.players])
        });
    }

    onExistingParticipants({ data }) {
        this.setState({
            players: new Set([this.id, ...data, ...this.state.players])
        });
    }

    onParticipantLeft({ name }) {
        this.setState({
            players: new Set(Array.from(this.state.players).filter(el => el !== name))
        });
    }

    receiveVideoResponse({ name, sdpAnswer }) {
        this.webRtc[name].rtcPeer.processAnswer (sdpAnswer, function (error) {
            if (error) return console.error (error);
        });
    }

    addIceCandidate({ name, candidate }) {
        this.webRtc[name].rtcPeer.addIceCandidate(candidate, function (error) {
            if (error) {
                console.error("Error adding candidate: " + error);
            }
        });
    }

    onIceCandidate(player, candidate) {
        this.ws.sendMessage({
            id: 'onIceCandidate',
            candidate: candidate,
            name: player
        });
    }

    offerToReceiveVideo(player, error, offerSdp) {
		if (error)
		    return console.error("sdp offer error")
		this.ws.sendMessage({
			id: "receiveVideoFrom",
			sender: player,
			sdpOffer: offerSdp
		});
    }

    renderPlayer(player) {
        if (!(player in this.webRtc)) {
            this.webRtc[player] = {
                video: React.createRef(),
                rtcPeer: null
            };
            console.log('webrtcing ' + player);
        }
        return (
            <div key={player} className='player-div'>
                <span>{player}</span>
                <video key={player}
                   className='player-vid'
                   ref={instance => { this.webRtc[player].video = instance }}
                   autoPlay={true}
                   controls={false}/>
            </div>
        );
    }

    renderPresenter() {
        if (this.state.presenter) {
            if (!(this.state.presenter in this.webRtc)) {
                this.webRtc[this.state.presenter] = {
                    video: React.createRef(),
                    rtcPeer: null
                }
            }
        }

        const assignRefIfExists = (instance) => {
            if (this.state.presenter)
                this.webRtc[this.state.presenter].video = instance;
        }

        return <video id='presenter'
                      key='presenter'
                      ref={assignRefIfExists}
                      autoPlay={true}
                      poster={loadingScreen}/>
    }

    render() {
        console.log('i rendered');
        return (
            <div className='play-div row'>
                <div className='gamepad-div col-lg-3'>
                    <GamepadSelection gamepadSelectedCallback={updateController}/>
                    <GamepadDisplay observable={switchObservable}/>
                </div>
                <div className='col-lg-7'>
                    {this.renderPresenter()}
                </div>
                <div className='players-div col-lg-2'>{
                    Array.from(this.state.players)
                        .filter(player => player !== this.state.presenter)
                        .map((player) => this.renderPlayer(player))
                }</div>
            </div>
        );
    }
}
