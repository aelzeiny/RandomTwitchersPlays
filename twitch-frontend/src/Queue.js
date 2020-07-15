import './Queue.css';

import React from 'react';
import TwitchStream from "./TwitchStream";
import GamepadSelection from "./gamepad/GamepadSelection";
import GamepadDisplay from "./gamepad/GamepadDisplay";
import { updateController, switchObservable } from "./gamepad/gamepadApi";


function Queue() {
    return (
        <div className='queue-div row'>
            <div className='gamepad-div col-lg-3'>
                <GamepadSelection gamepadSelectedCallback={updateController}/>
                <GamepadDisplay observable={switchObservable}/>
            </div>
            <div className='col-lg-9'>
                <TwitchStream chat={true}/>
            </div>
        </div>
    );
}

export default Queue;
