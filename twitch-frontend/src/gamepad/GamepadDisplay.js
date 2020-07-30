import controllerImg from '../img/controller_transp.png';
import './GamepadDisplay.css';

import React, {useEffect, useState} from 'react';
import * as switchApi from './switchApi';


export default function GamepadDisplay({ observable }) {
    const [switchState, setSwitchState] = useState({});

    useEffect(() => {
        const subscription = observable.subscribe((inputObjState) => {
            setSwitchState(inputObjState);
        });
        return () => {
            subscription.unsubscribe();
        }
    }, [setSwitchState, observable]);

    const leftStickX = `${24 + (switchState[switchApi.AXIS_LX] || 0) * 2}%`;
    const rightStickX = `${62.5 + (switchState[switchApi.AXIS_RX] || 0) * 2}%`;

    const leftStickY = `${31 + (switchState[switchApi.AXIS_LY] || 0) * 3}%`;
    const rightStickY = `${50 + (switchState[switchApi.AXIS_RY] || 0) * 3}%`;
    const color = 'magenta';

    return (
        <div className='gamepad-display-div'>
            <div className='gamepad-background'>
                <svg>
                    <circle cx={leftStickX} cy={leftStickY} r="5%" fill={color} />
                    <circle cx={rightStickX} cy={rightStickY} r="5%" fill={color} />
                    {switchState[switchApi.HAT_LEFT] && <rect key={switchApi.HAT_LEFT} x="27.7%" y="47%" width="5%" height="6%" fill={color}/>}
                    {switchState[switchApi.HAT_RIGHT] && <rect key={switchApi.HAT_RIGHT} x="36.7%" y="47%" width="5%" height="6%" fill={color}/>}
                    {switchState[switchApi.HAT_UP] && <rect key={switchApi.HAT_UP} x="32.7%" y="40%" width="4%" height="8%" fill={color}/>}
                    {switchState[switchApi.HAT_DOWN] && <rect key={switchApi.HAT_DOWN} x="32.7%" y="53%" width="4%" height="8%" fill={color}/>}
                    {switchState[switchApi.BUTTON_SELECT] && <rect key={switchApi.BUTTON_SELECT} x="35%" y="17%" width="5%" height="7%" fill={color}/>}
                    {switchState[switchApi.BUTTON_CAPTURE] && <rect key={switchApi.BUTTON_CAPTURE} x="41%" y="27%" width="5%" height="7%" fill={color}/>}
                    {switchState[switchApi.BUTTON_HOME] && <rect key={switchApi.BUTTON_HOME} x="54%" y="27%" width="5%" height="7%" fill={color}/>}
                    {switchState[switchApi.BUTTON_START] && <rect key={switchApi.BUTTON_START} x="59%" y="16%" width="5%" height="7%" fill={color}/>}
                    {switchState[switchApi.BUTTON_X] && <rect key={switchApi.BUTTON_X} x="72%" y="16%" width="7%" height="10%" fill={color}/>}
                    {switchState[switchApi.BUTTON_B] && <rect key={switchApi.BUTTON_B} x="72%" y="33%" width="7%" height="10%" fill={color}/>}
                    {switchState[switchApi.BUTTON_Y] && <rect key={switchApi.BUTTON_Y} x="66%" y="24%" width="7%" height="10%" fill={color}/>}
                    {switchState[switchApi.BUTTON_A] && <rect key={switchApi.BUTTON_A} x="78%" y="24%" width="7%" height="10%" fill={color}/>}
                    {switchState[switchApi.BUTTON_LTRIGGER] && <rect key={switchApi.BUTTON_LTRIGGER} x="10%" y="0%" width="20%" height="15%" rx="5%"  fill={color}/>}
                    {switchState[switchApi.BUTTON_RTRIGGER] && <rect key={switchApi.BUTTON_RTRIGGER} x="70%" y="0%" width="20%" height="15%" rx="5%"  fill={color}/>}
                    {switchState[switchApi.BUTTON_LB] && <line key={switchApi.BUTTON_LB} x1="11%" y1="12%" x2="30%" y2="0%" stroke={color} strokeWidth="5%" strokeLinecap='round'/>}
                    {switchState[switchApi.BUTTON_RB] && <line key={switchApi.BUTTON_RB} x1="70%" y1="0%" x2="89%" y2="12%" stroke={color} strokeWidth="5%" strokeLinecap='round'/>}
                </svg>
                <img src={controllerImg} alt='switch controller'/>
            </div>
        </div>
    );
}
