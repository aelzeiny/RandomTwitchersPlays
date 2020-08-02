import './Queue.css';

import React, { useEffect, useState } from 'react';
import TwitchStream from "./TwitchStream";
import GamepadSelection from "./gamepad/GamepadSelection";
import GamepadDisplay from "./gamepad/GamepadDisplay";
import { updateController, switchObservable } from "./gamepad/gamepadApi";
import Navbar from "./Navbar";
import { leaveQueue, openQueueConnection } from "./apis";
import cookie from 'cookie';


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
    const [inQueue, setInQueue] = useState(false);
    useEffect(() => {
        const { token } = cookie.parse(document.cookie);
        if (!token) {
            props.history.push('/');
            return;
        }
        const ws = openQueueConnection(token);
        ws.onclose = () => {
            props.history.push('/');
        }
        ws.onmessage = (raw) => {
            const message = JSON.parse(raw.data);
            console.log(message);
            if (message.id === 'play')
                setInQueue(true);
        };

        let interval;
        ws.onopen = () => {
            // AWS API Gateway has idle connection timeouts of 10 min.
            interval = setInterval(() => ws.send(JSON.stringify({action: 'ping'})), 5 * 60 * 1000);
        }

        return () => {
            clearInterval(interval);
            ws.close();
        };
    }, [props.history, setInQueue]);

    const leave = () => {
        leaveQueue().then(props.history.push('/'));
    };
    return (
        <div>
            <Navbar buttonText='leave' callback={leave}/>
            {inQueue && <JoinPrompt callback={() => props.history.push('/play')}/>}
            <div className='queue-div row'>
                <div className='gamepad-div col-sm-3'>
                    <GamepadSelection gamepadSelectedCallback={updateController}/>
                    <GamepadDisplay observable={switchObservable}/>
                </div>
                <div className='queue-twitch-container col-sm-9'>
                    <TwitchStream chat={true} width='100%'/>
                </div>
            </div>
        </div>
    );
}

export default Queue;
