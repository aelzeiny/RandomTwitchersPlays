import React from "react";
import Room from "./Room";
import Navbar from "./Navbar";
import { openStreamerConnection } from "./apis";
import cookie from "cookie";
import { switchObservable } from "./gamepad/gamepadApi";
import { compressInput } from "./gamepad/switchApi";
import ControlsModal from "./gamepad/ControlsModal";


export default class Play extends React.Component {
    constructor(props) {
        super(props);

        this.username = cookie.parse(document.cookie).username;
        this.ws = openStreamerConnection(this.username);
        this.ws.onclose = () => props.history.push('/');

        this.switchInputSubscription = null;
    }

    componentDidMount() {
        this.switchInputSubscription = switchObservable.subscribe((input) => {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.sendMessage({
                    id: 'switchInput',
                    input: compressInput(input)
                });
            }
        });
    }

    componentWillUnmount() {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.sendMessage({id: 'leaveRoom'});
            this.ws.close();
        }

        if (this.switchInputSubscription)
            this.switchInputSubscription.unsubscribe();
    }

    render() {
        return (
            <div>
                <Navbar/>
                <Room
                    id={this.username}
                    isPresenter={false}
                    ws={this.ws}/>
                <ControlsModal/>
            </div>
        );
    }
}
