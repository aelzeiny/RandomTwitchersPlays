import './Queue.css';

import React from 'react';
import TwitchStream from "./TwitchStream";
import GamepadSelection from "./gamepad/GamepadSelection";
import GamepadDisplay from "./gamepad/GamepadDisplay";
import { updateController, switchObservable } from "./gamepad/gamepadApi";
import Navbar from "./Navbar";
import { leaveQueue } from "./apis";


function Queue(props) {
    const leave = () => {
        leaveQueue().then(props.history.push('/'));
    };
    return (
        <div>
            <Navbar buttonText='leave' callback={leave}/>
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
