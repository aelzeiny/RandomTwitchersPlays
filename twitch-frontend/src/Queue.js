import './Queue.css';

import React from 'react';
import TwitchStream from "./TwitchStream";
import GamepadSelection from "./gamepad/GamepadSelection";
import GamepadDisplay from "./gamepad/GamepadDisplay";
import { updateController, switchObservable } from "./gamepad/gamepadApi";


function Queue() {
    return (
        <div className='queue-div'>
            <div className='gamepad-div container'>
                <GamepadSelection gamepadSelectedCallback={updateController}/>
                <GamepadDisplay observable={switchObservable}/>
            </div>
            <TwitchStream chat={true}/>
        </div>
    );
}

export default Queue;
