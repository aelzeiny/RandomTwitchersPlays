import './Play.css';
import loadingScreen from './nook_loading.jpg';

import React from 'react';
import { WebRtcPeer } from 'kurento-utils';
import GamepadSelection from "./gamepad/GamepadSelection";
import GamepadDisplay from "./gamepad/GamepadDisplay";
import {switchObservable, updateController} from "./gamepad/gamepadApi";
import { compressInput, decompressInput } from "./gamepad/switchApi";
import { Subject } from 'rxjs';

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
        this.switchInputSubscription = null;
    }

    componentDidMount() {
        this.ws = new WebSocket('ws://' + window.location.host + `/traffic?id=${this.id}`);
        this.switchInputSubscription = switchObservable.subscribe((input) => {
            this.ws.sendMessage({
                id: 'switchInput',
                input: compressInput(input)
            });
        });
	    this.ws.onmessage = (message) => {
            const parsedMessage = JSON.parse(message.data);
            console.info('Received message:', parsedMessage.id, parsedMessage);

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
                case 'switchInput':
                    this.onSwitchInput(parsedMessage);
                    break;
                default:
                    console.error('Unrecognized message', parsedMessage);
            }
	    }

	    this.ws.onclose = () => {
	        console.log('exiting');
	        this.props.history.push('/');
        };
    }

    componentWillUnmount() {
        this.switchInputSubscription.unsubscribe();
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

    receiveVideo({ name, isPresenter } ) {
        this.setState({
            players: new Set([...this.state.players, name]),
            presenter: isPresenter ? name : this.state.presenter
        });
    }

    onExistingParticipants({ data, presenter }) {
        this.setState({
            players: new Set([this.id, ...this.state.players, ...data]),
            presenter: presenter
        });
    }

    onParticipantLeft({ name, isPresenter }) {
        this.setState({
            players: new Set(Array.from(this.state.players).filter(el => el !== name)),
            presenter: isPresenter ? null : this.state.presenter
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

    onSwitchInput({ name, input, commonInput }) {
        if (this.state.presenter && this.webRtc[this.state.presenter]) {
            const switchCommonInput = decompressInput(commonInput);
            this.webRtc[this.state.presenter].observable.next(switchCommonInput);
        }
        if (name in this.state.players && this.webRtc[name] && name !== this.id) {
            const switchInput = decompressInput(input);
            this.webRtc[name].observable.next(switchInput);
        }
    }

    initWebRtc() {
        for (let player of this.state.players) {
            if (!(player in this.webRtc)) {
                console.log('yeeting', player);
                this.webRtc[player] = {
                    video: React.createRef(),
                    rtcPeer: null,
                    observable: (player === this.id) ? switchObservable : new Subject()
                };
            }
        }
    }s

    renderPlayer(player) {
        return (
            <div key={player} className='player-div'>
                <span>{player}</span>
                <GamepadDisplay observable={this.webRtc[player].observable}/>
                <video key={player}
                   className='player-vid'
                   ref={instance => { this.webRtc[player].video = instance }}
                   autoPlay={true}
                   controls={false}/>
            </div>
        );
    }

    renderPresenter() {
        const assignRefIfExists = (instance) => {
            if (this.state.presenter) {
                this.webRtc[this.state.presenter].video = instance;
            }
        }

        return <video id='presenter'
                      key='presenter'
                      ref={assignRefIfExists}
                      autoPlay={true}
                      controls={false}
                      poster={loadingScreen}/>
    }

    render() {
        this.initWebRtc();
        return (
            <div className='play-div row'>
                <div className='play-left-div col-lg-3'>
                    {this.state.presenter && <GamepadDisplay observable={this.webRtc[this.state.presenter].observable}/>}
                </div>
                <div className='col-lg-7'>
                    {this.renderPresenter()}
                </div>
                <div className='players-div col-lg-2'>
                    <GamepadSelection gamepadSelectedCallback={updateController}/>
                    {Array.from(this.state.players)
                        .filter(player => player !== this.state.presenter)
                        .map((player) => this.renderPlayer(player))}
                </div>
            </div>
        );
    }
}
