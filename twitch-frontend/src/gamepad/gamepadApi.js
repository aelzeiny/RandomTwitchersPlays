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
    'shift': switchApi.BUTTON_SELECT,

    'a': switchApi.BUTTON_Y,
    's': switchApi.BUTTON_B,
    'd': switchApi.BUTTON_A,
    'w': switchApi.BUTTON_X,

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
            case "down": // IE/Edge
            case "arrowdown":
                newInput[switchApi.AXIS_LY] = 1;
                break;
            case "up": // IE/Edge
            case "arrowup":
                newInput[switchApi.AXIS_LY] = -1;
                break;
            case "left": // IE/Edge
            case "arrowleft":
                newInput[switchApi.AXIS_LX] = -1;
                break;
            case "right": // IE/Edge
            case "arrowright":
                newInput[switchApi.AXIS_LX] = 1;
                break;

            case "j":
                newInput[switchApi.AXIS_RX] = -1;
                break;
            case "l":
                newInput[switchApi.AXIS_RX] = 1;
                break;
            case "i":
                newInput[switchApi.AXIS_RY] = -1;
                break;
            case "k":
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
            case "down": // IE/Edge
            case "arrowdown":
            case "up": // IE/Edge
            case "arrowup":
                newInput[switchApi.AXIS_LY] = 0;
                break;
            case "left": // IE/Edge
            case "arrowleft":
            case "right": // IE/Edge
            case "arrowright":
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