import './Queue.css';

import React, { useEffect, useState } from 'react';
import TwitchStream from "./TwitchStream";
import GamepadDisplay from "./gamepad/GamepadDisplay";
import { switchObservable } from "./gamepad/gamepadApi";
import Navbar from "./Navbar";
import { joinQueue, leaveQueue, openQueueConnection, redirectToOauth } from "./apis";
import cookie from 'cookie';
import ControlsModal from './gamepad/ControlsModal';
import FA from "react-fontawesome";


function JoinPrompt({ callback }) {
    return (
        <div id='join-prompt'>
            <p>You're Up!</p>
            <button className='btn btn-outline-light' onClick={callback}>
                Start Streaming
            </button>
        </div>
    );
}

function Queue(props) {
    // position is index in Q. If < 0 then the user is whitelisted.
    const [position, setPosition] = useState(null);
    useEffect(() => {
        joinQueue().then(() => {
            const { token, username } = cookie.parse(document.cookie);
            if (!token) {
                props.history.push('/');
                return;
            }

            const ws = openQueueConnection(token);
            let interval;
            ws.onopen = () => {
                // request status to get position
                console.log('open 4 business');
                // AWS API Gateway has idle connection timeouts of 10 min.
                interval = setInterval(() => ws.send(JSON.stringify({action: 'ping'})), 5 * 60 * 1000);
                ws.send(JSON.stringify({action: 'status'}));
            };

            ws.onmessage = (raw) => {
                const message = JSON.parse(raw.data);
                if (message.id === 'status') {
                    if (message.whitelist.includes(username)) {
                        setPosition(-1);
                        return;
                    }
                    const pos = message.queue.indexOf(username);
                    setPosition(pos >= 0 ? pos + 1 : null);
                }
            };

            // ws.onerror = () => props.history.push('/queue');  // Refresh the page as a backup

            return () => {
                clearInterval(interval);
                if (ws && ws.readyState === WebSocket.OPEN)
                    ws.close();
            };
        }).catch(redirectToOauth);
    }, [props.history, position, setPosition]);

    const leave = () => {
        leaveQueue().then(props.history.push('/'));
    };

    if (position === null) {
        return (
            <div>
                <Navbar/>
                <FA spin={true} pulse={true} size='5x' name='spinner' className='loading'/>
            </div>
        );
    }


    return (
        <div>
            <Navbar buttonText='leave' callback={leave}/>
            {position < 0 && <JoinPrompt callback={() => props.history.push('/play')}/>}
            <div className='queue-div row'>
                <div className='gamepad-div col-sm-3'>
                    <h3>{position >= 0 ? (`#${position} In Queue` || '') : 'On Stream'}</h3>
                    <GamepadDisplay observable={switchObservable}/>
                    <ControlsModal/>
                </div>
                <div className='queue-twitch-container col-sm-9'>
                    <TwitchStream chat={true} width='100%'/>
                </div>
            </div>
        </div>
    );
}

export default Queue;
