import './Room.css';
import loadingScreen from './nook_loading.jpg';

import React from 'react';
import FA from 'react-fontawesome';
import { WebRtcPeer } from 'kurento-utils';
import GamepadDisplay from "./gamepad/GamepadDisplay";
import { switchObservable } from "./gamepad/gamepadApi";
import { decompressInput } from "./gamepad/switchApi";
import { Subject } from 'rxjs';


WebSocket.prototype.sendMessage = function (msg) {
    const jsonMessage = JSON.stringify(msg);
    console.debug('Sending message: ' + jsonMessage);
    this.send(jsonMessage);
}

/**
    See: https://doc-kurento.readthedocs.io/en/latest/features/kurento_utils_js.html
    [{"urls":"turn:turn.example.org","username":"user","credential":"myPassword"}]
    [{"urls":"stun:stun1.example.net"},{"urls":"stun:stun2.example.net"}]
*/

const iceServersConfig = [
    {"urls": "turn:45.79.88.189", "username": "turnunit", "credential": "foUvJHWBNQ4hHp77sk577o8"},
    {"urls":"stun:45.79.88.189"}
];


export default class Room extends React.Component {
    constructor(props) {
        super(props);

        this.id = props.id;
        this.isPresenter = props.isPresenter;
        this.onMessageCallback = props.onMessageCallback;

        this.state = {
            players: new Set(),
            presenter: null
        };
        this.webRtc = {};
        this.ws = props.ws;
        this.fullScreenVideo = this.fullScreenVideo.bind(this);
    }

    componentDidMount() {
	    this.ws.onmessage = (message) => {
            const parsedMessage = JSON.parse(message.data);
            console.log('Received message id:', parsedMessage.id);
            console.debug('Received message:', parsedMessage.id, parsedMessage);

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

            if (this.onMessageCallback) {
                this.onMessageCallback(parsedMessage);
            }
	    }
    }

    componentWillUnmount() {
        // dispose RTC Peer connections
        for (let player of this.state.players) {
            this.webRtc[player].rtcPeer.dispose();
        }
    }

    fullScreenVideo() {
        if (!this.webRtc[this.state.presenter] || !this.webRtc[this.state.presenter].video)
            return;
        const elem = this.webRtc[this.state.presenter].video;
        const fullScreenCompatibleFuncs = [
            'requestFullscreen', 'mozRequestFullScreen',
            'webkitRequestFullscreen', 'msRequestFullscreen'
        ];
        for (let reqFullScreen of fullScreenCompatibleFuncs) {
            if (elem[reqFullScreen]) {
                elem[reqFullScreen]().then(() => {
                    elem.requestPointerLock();
                });
                break;
            }
        }
    }

    componentDidUpdate(_, prevState, __) {
        console.log('Update component', Array.from(prevState.players), '->', Array.from(this.state.players));
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
                    let vidOptions;
                    if (!this.isPresenter) {
                        vidOptions = {
                            maxWidth: 100,
                            maxFrameRate: 15,
                            minFrameRate: 15
                        }
                    } else {
                        vidOptions = {
                            width: 1280,
                            // maxWidth: 1280,
                            framerate: 30,
                            // maxFrameRate: 30,
                        }
                    }

                    const options = {
                        localVideo: this.webRtc[player].video,
                        mediaConstraints: {
                            audio: true,
                            video: vidOptions
                        },
                        onicecandidate: this.onIceCandidate.bind(this, player),
                        configuration: {iceServers: iceServersConfig},
                    };
                    if (this.isPresenter) {
                        this.webRtc[player].rtcPeer = new WebRtcPeer.WebRtcPeerSendonly(options, offerCallback);
                    }
                } else {
                    const options = {
                        remoteVideo: this.webRtc[player].video,
                        onicecandidate: this.onIceCandidate.bind(this, player),
                        configuration: {iceServers: iceServersConfig},
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
		    return console.error("sdp offer error");
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
        if (this.state.players.has(name) && name in this.webRtc && name !== this.id) {
            const switchInput = decompressInput(input);
            this.webRtc[name].observable.next(switchInput);
        }
    }

    initWebRtc() {
        for (let player of this.state.players) {
            if (!(player in this.webRtc)) {
                this.webRtc[player] = {
                    video: React.createRef(),
                    rtcPeer: null,
                    observable: (player === this.id && !this.isPresenter) ? switchObservable : new Subject()
                };
            }
        }
    }s

    renderPlayer(player) {
        console.log('rip, rerendered the vid');
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

        return (
            <div className='presenter-div'>
                <video id='presenter'
                       key='presenter'
                       ref={assignRefIfExists}
                       autoPlay={true}
                       controls={false}
                       poster={loadingScreen}/>
                {
                    this.state.presenter &&
                    <button className='video-fullscreen btn btn-outline-primary' onClick={this.fullScreenVideo}>
                        <FA name='expand'/>
                    </button>
                }
            </div>
        );
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
                    {Array.from(this.state.players)
                        .filter(player => player !== this.state.presenter)
                        .map((player) => this.renderPlayer(player))}
                </div>
            </div>
        );
    }
}
