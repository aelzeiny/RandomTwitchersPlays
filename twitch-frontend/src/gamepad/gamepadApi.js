import isEqual from 'lodash.isequal';
import { Subject } from 'rxjs';

const switchApi = require('./switchApi');

export const switchObservable = new Subject();

let keyboardDownEvent = null;
let keyboardUpEvent = null;
let mouseMoveEvent = null;
let mouseDownEvent = null;
let mouseUpEvent = null;

let _SENSITIVITY = 5;

window.sensitivity = {
    get: () => _SENSITIVITY,
    set: (x) => _SENSITIVITY = x,
};


export function updateController() {
    if (keyboardUpEvent || keyboardDownEvent || mouseMoveEvent) {
        document.removeEventListener('keydown', keyboardDownEvent);
        document.removeEventListener('keyup', keyboardUpEvent);
        document.removeEventListener('mousemove', mouseMoveEvent);
        document.removeEventListener("mousedown", mouseDownEvent);
        document.removeEventListener("mouseup", mouseUpEvent);
    } 

    else {
        [keyboardDownEvent, keyboardUpEvent, mouseMoveEvent, mouseDownEvent, mouseUpEvent] = getKeyboardEvents();
        document.addEventListener('keydown', keyboardDownEvent);
        document.addEventListener('keyup', keyboardUpEvent);
        document.addEventListener("mousemove", mouseMoveEvent);
        document.addEventListener("mousedown", mouseDownEvent);
        document.addEventListener("mouseup", mouseUpEvent);
    }
}

const switchKeyboardMapping = {
    'enter': switchApi.BUTTON_START,
    'esc': switchApi.BUTTON_SELECT,

    // TotK Button Mapping
    'shift': switchApi.BUTTON_B, // put away + sprint
    ' ': switchApi.BUTTON_X, // space -> jump


    'i': switchApi.BUTTON_X,
    'j': switchApi.BUTTON_Y,
    'k': switchApi.BUTTON_B,
    'l': switchApi.BUTTON_A,

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
    let clearMouseTimeout = null;

    const newKeyDown = (e) => {
        const newInput = {...lastInput};
        const eKey = e.key.toLowerCase();
        switch (eKey) {
            case "w": // IE/Edge
                newInput[switchApi.AXIS_LY] = -1;
                break;
            case "a": // IE/Edge
                newInput[switchApi.AXIS_LX] = -1;
                break;
            case "s": // IE/Edge
                newInput[switchApi.AXIS_LY] = 1;
                break;
            case "d": // IE/Edge
                newInput[switchApi.AXIS_LX] = 1;
                break;

            case "up": // IE/Edge
            case "arrowup":
                newInput[switchApi.AXIS_RY] = -1;
                break;
            case "left": // IE/Edge
            case "arrowleft":
                newInput[switchApi.AXIS_RX] = -1;
                break;
            case "down": // IE/Edge
            case "arrowdown":
                newInput[switchApi.AXIS_RY] = 1;
                break;
            case "right": // IE/Edge
            case "arrowright":
                newInput[switchApi.AXIS_RX] = 1;
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
                newInput[switchApi.AXIS_RY] = 0;
                break;
            case "left": // IE/Edge
            case "arrowleft":
            case "right": // IE/Edge
            case "arrowright":
                newInput[switchApi.AXIS_RX] = 0;
                break;

            case "w":
            case "s":
                newInput[switchApi.AXIS_LY] = 0;
                break;
            case "a":
            case "d":
                newInput[switchApi.AXIS_LX] = 0;
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

    const mouseMove = (e) => {
        const newInput = {...lastInput};

        if (e.movementX) {
            newInput[switchApi.AXIS_RX] = Math.min(Math.max(e.movementX / _SENSITIVITY, -1), 1);
        }
        if (e.movementY) {
            newInput[switchApi.AXIS_RY] = Math.min(Math.max(e.movementY / _SENSITIVITY, -1), 1);
        }

        if (!isEqual(newInput, lastInput)) {
            lastInput = newInput;
            if (clearMouseTimeout) {
                clearTimeout(clearMouseTimeout);
            }
            clearMouseTimeout = setTimeout(() => {
                clearMouseTimeout = null;
                const clearInput = {...lastInput};
                clearInput[switchApi.AXIS_RX] = 0;
                clearInput[switchApi.AXIS_RY] = 0;
                if (clearInput !== lastInput) {
                    lastInput = clearInput;
                    switchObservable.next(clearInput);
                }
            }, 100);
            switchObservable.next(newInput);
        }
    };

    const mouseDown = (e) => {
        const newInput = {...lastInput};
        const btn = (e.which === 3) ? switchApi.BUTTON_A : switchApi.BUTTON_Y;
        newInput[btn] = true;
        switchObservable.next(newInput);
        lastInput = newInput;
    };

    const mouseUp = (e) => {
        const newInput = {...lastInput};
        const btn = (e.which === 3) ? switchApi.BUTTON_A : switchApi.BUTTON_Y;
        if (btn in newInput) {
            delete newInput[btn];
            switchObservable.next(newInput);
            lastInput = newInput;
        }
    };

    return [newKeyDown, newKeyUp, mouseMove, mouseDown, mouseUp];
}

updateController();