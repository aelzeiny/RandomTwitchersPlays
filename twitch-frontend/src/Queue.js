import './Queue.css';

import React, { useEffect, useState } from 'react';
import TwitchStream from "./TwitchStream";
import GamepadSelection from "./gamepad/GamepadSelection";
import GamepadDisplay from "./gamepad/GamepadDisplay";
import { updateController, switchObservable } from "./gamepad/gamepadApi";
import Navbar from "./Navbar";
import { leaveQueue, openQueueConnection } from "./apis";


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
       const ws = openQueueConnection();
       ws.onmessage = (raw) => {
           const message = JSON.parse(raw.data);
           if (message.id === 'stream')
               setInQueue(true);
       };

       return ws.close;
    }, [setInQueue]);

    const leave = () => {
        leaveQueue().then(props.history.push('/'));
    };
    return (
        <div>
            <Navbar buttonText='leave' callback={leave}/>
            {inQueue && <JoinPrompt callback={() => props.history.push('/stream')}/>}
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
