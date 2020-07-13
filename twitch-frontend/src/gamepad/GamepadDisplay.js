import React, { useEffect, useState } from 'react';
import { switchObservable } from './gamepadApi';
import { compressInput } from './switchApi';


export default function GamepadDisplay() {
    const [switchState, setSwitchState] = useState({});

    useEffect(() => {
        const yeetle = (inputObjState) => {
            console.log(compressInput(inputObjState));
            setSwitchState(inputObjState);
        }
        const subscription = switchObservable.subscribe(yeetle);
        return () => {
            subscription.unsubscribe();
        }
    }, [setSwitchState]);

    return (
        <div>
            <label htmlFor="comment">Comment:</label>
            <p>{Object.keys(switchState).toString()}</p>
        </div>
    );
}
