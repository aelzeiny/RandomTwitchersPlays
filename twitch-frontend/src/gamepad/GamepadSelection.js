/**
 * This file is Reactified from the MDN's Gamepad API tutorial
 * ..seealso: https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API
 */

import React, { useEffect } from 'react';
import FA from 'react-fontawesome';
import useStateWithCallback from 'use-state-with-callback';


export default function GamepadSelection({ gamepadSelectedCallback }) {
    const [gamepads, setGamepads] = useStateWithCallback({
        connected: [],
        selected: null
    }, newGamepad => gamepadSelectedCallback(newGamepad.selected));

    // Init Gamepads
    useEffect(() => {
        const connectHandler = ({ gamepad }) => {
            setGamepads((prevGamepads) => ({
                connected: [gamepad, ...prevGamepads],
                selected: prevGamepads.selected
            }));
        };
        const disconnectHandler = ({ gamepad }) => {
            setGamepads((prevGamepads) => ({
                connected: gamepad.filter(pad => pad !== gamepad),
                // change selected gamepad if it's disconnected
                selected: (gamepad.connected.includes(prevGamepads.selected)) ? prevGamepads.selected : null
            }));
        };

        let connectEventName = null;
        let disconnectEventName = null;
        if ('GamepadEvent' in window) {
            connectEventName = 'gamepadconnected';
            disconnectEventName = 'gamepaddisconnected';
        } else if ('WebKitGamepadEvent' in window) {
            connectEventName = 'webkitgamepadconnected';
            disconnectEventName = 'webkitgamepaddisconnected';
        }
        if (connectEventName && disconnectEventName) {
            window.addEventListener("gamepadconnected", connectHandler);
            window.addEventListener("gamepaddisconnected", disconnectHandler);
            return () => {
                window.removeEventListener("gamepadconnected", connectHandler);
                window.removeEventListener("gamepaddisconnected", disconnectHandler);
            }
        } else {
            console.log('Gamepads not supported in this browser');
        }
    }, [gamepads, setGamepads]);

    const switchGamepad = (newGamePad) => {
        if (gamepads.selected === newGamePad)
            return;
        setGamepads({
            connected: gamepads.connected,
            selected: newGamePad
        });
    }

    return (
        <div className="gamepad-selection">
            <div className="btn-group">
                <button className="btn btn-secondary btn-lg dropdown-toggle" type="button" data-toggle="dropdown"
                        aria-haspopup="true" aria-expanded="false" style={{backgroundColor: 'transparent'}}>
                    <i className={`fas fa-${(gamepads.selected) ? 'gamepad' : 'keyboard'}`}/>
                    {(gamepads.selected) ? gamepads.selected.id : 'Keyboard'}
                </button>
                <div className="dropdown-menu" aria-labelledby="dropdownMenuLink">
                    <button className="dropdown-item"
                       active={!gamepads.selected ? 'true' : 'false'}
                       onClick={() => switchGamepad(null)}>
                        <FA name='keyboard'/> Keyboard
                    </button>
                    {gamepads.length && gamepads.map((gamepad) => (
                        <button className="dropdown-item"
                           active={gamepad === gamepads.selected}
                           onClick={() => switchGamepad(gamepad)}>
                            <FA name='gamepad'/> {gamepad.id}
                        </button>
                    ))}
                </div>
            </div>
            { !gamepads.length && (<p>Press any Gamepad button...</p>)}
        </div>
    );
}