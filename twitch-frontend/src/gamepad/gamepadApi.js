import isEqual from 'lodash.isequal';
import { Subject } from 'rxjs';

const switchApi = require('./switchApi');

export const switchObservable = new Subject();

let gamepadInterval = null;
let keyboardDownEvent = null;
let keyboardUpEvent = null;


export function updateController(newGamepad) {
    if(gamepadInterval)
        clearInterval(gamepadInterval);
    if (keyboardUpEvent || keyboardDownEvent) {
        document.removeEventListener('keydown', keyboardDownEvent);
        document.removeEventListener('keyup', keyboardUpEvent);
    }

    if (newGamepad)
        setInterval(() => getGamepadLoop(newGamepad),1);
    else {
        [keyboardDownEvent, keyboardUpEvent] = getKeyboardEvents();
        document.addEventListener('keydown', keyboardDownEvent);
        document.addEventListener('keyup', keyboardUpEvent);
    }
}

function getGamepadLoop(gamepad) {
    let lastInput = null;
    return () => {
        let newInput = getGamepadInput(gamepad);
        if (!isEqual(gamepad, lastInput)) {
            const switchEvent = new CustomEvent('switchMessage', newInput);
            document.dispatchEvent(switchEvent);
        }
        lastInput = newInput;
    };
}

/**
 * TODO: ADD GAMEPAD INPUT MAPPING
 */
function getGamepadInput() {
    // for (i = 0; i < controller.buttons.length; i++) {
    //     var b = buttons[i];
    //     var val = controller.buttons[i];
    //     var pressed = val == 1.0;
    //     if (typeof (val) == "object") {
    //         pressed = val.pressed;
    //         val = val.value;
    //     }
    //
    //     if (pressed) {
    //         b.className = "button pressed";
    //     } else {
    //         b.className = "button";
    //     }
    // }
    //
    // for (i = 0; i < controller.axes.length; i++) {
    //     var a = axes[i];
    // }
}

const switchKeyboardMapping = {
    'enter': switchApi.BUTTON_START,
    'esc': switchApi.BUTTON_SELECT,
    'escape': switchApi.BUTTON_SELECT,

    'up': switchApi.BUTTON_X,
    'arrowup': switchApi.BUTTON_X, // IE/Edge
    'left': switchApi.BUTTON_Y,
    'arrowleft': switchApi.BUTTON_Y, // IE/Edge
    'down': switchApi.BUTTON_B,
    'arrowdown': switchApi.BUTTON_B, // IE/Edge
    'right': switchApi.BUTTON_A,
    'arrowright': switchApi.BUTTON_A, // IE/Edge

    'q': switchApi.BUTTON_LB,
    'e': switchApi.BUTTON_RB,
    'z': switchApi.BUTTON_LTRIGGER,
    'c': switchApi.BUTTON_RTRIGGER,
    '`': switchApi.BUTTON_CAPTURE,
    '1': switchApi.HAT_UP,
    '2': switchApi.HAT_RIGHT,
    '3': switchApi.HAT_DOWN,
    '4': switchApi.HAT_LEFT,
};

function getKeyboardEvents() {
    let lastInput = {};
    lastInput[switchApi.AXIS_LX] = 0;
    lastInput[switchApi.AXIS_LY] = 0;
    lastInput[switchApi.AXIS_RX] = 0;
    lastInput[switchApi.AXIS_RY] = 0;

    const newKeyDown = (e) => {
        const newInput = {...lastInput};
        const eKey = e.key.toLowerCase();
        switch (eKey) {
            case "s":
                newInput[switchApi.AXIS_LY] = -1;
                break;
            case "w":
                newInput[switchApi.AXIS_LY] = 1;
                break;
            case "a":
                newInput[switchApi.AXIS_LX] = -1;
                break;
            case "d":
                newInput[switchApi.AXIS_LX] = 1;
                break;
            case "j":
                newInput[switchApi.AXIS_RX] = -1;
                break;
            case "l":
                newInput[switchApi.AXIS_RX] = 1;
                break;
            case "k":
                newInput[switchApi.AXIS_RY] = -1;
                break;
            case "i":
                newInput[switchApi.AXIS_RY] = 1;
                break;
            default:
                if (eKey in switchKeyboardMapping) {
                    newInput[switchKeyboardMapping[eKey]] = true;
                }
        }
        if (!isEqual(newInput, lastInput)) {
            lastInput = newInput;
            switchObservable.next(newInput);
        }
    };

    const newKeyUp = (e) => {
        const newInput = {...lastInput};
        const eKey = e.key.toLowerCase();
        switch (eKey) {
            case "w":
            case "s":
                newInput[switchApi.AXIS_LY] = 0;
                break;
            case "a":
            case "d":
                newInput[switchApi.AXIS_LX] = 0;
                break;

            case "j":
            case "l":
                newInput[switchApi.AXIS_RX] = 0;
                break;
            case "k":
            case "i":
                newInput[switchApi.AXIS_RY] = 0;
                break;
            default:
                if (eKey in switchKeyboardMapping && switchKeyboardMapping[eKey] in newInput)
                    delete newInput[switchKeyboardMapping[eKey]];
        }
        if (!isEqual(newInput, lastInput)) {
            lastInput = newInput;
            switchObservable.next(newInput);
        }
    };

    return [newKeyDown, newKeyUp];
}

updateController(null);