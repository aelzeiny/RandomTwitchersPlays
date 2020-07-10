import isEqual from 'lodash.isequal';
const switchApi = require('./switchApi');

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
    }
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
    'a': switchApi.BUTTON_Y,
    's': switchApi.BUTTON_B,
    'd': switchApi.BUTTON_A,
    'w': switchApi.BUTTON_X,
    'q': switchApi.BUTTON_LB,
    'e': switchApi.BUTTON_RB,
    'z': switchApi.BUTTON_LTRIGGER,
    'c': switchApi.BUTTON_RTRIGGER,
    'tab': switchApi.BUTTON_CAPTURE,
};

function getKeyboardEvents() {
    let lastInput = {};

    const newKeyDown = (e) => {
        if (e.defaultPrevented || e.repeat)
            return;

        switch (e.key.toLowerCase()) {
            case "down": // IE/Edge
            case "arrowdown":
                lastInput[switchApi.AXIS_LY] = -1;
                break;
            case "up": // IE/Edge
            case "arrowup":
                lastInput[switchApi.AXIS_LY] = 1;
                break;
            case "left": // IE/Edge
            case "arrowleft":
                lastInput[switchApi.AXIS_LX] = -1;
                break;
            case "right": // IE/Edge
            case "arrowright":
                lastInput[switchApi.AXIS_LX] = 1;
                break;
            default:
                if (e.key in switchKeyboardMapping)
                    lastInput[switchKeyboardMapping[e.key]] = true;
                return;
        }
        const switchEvent = new CustomEvent('switchMessage', lastInput);
        document.dispatchEvent(switchEvent);
    };

    const newKeyUp = (e) => {
        if (e.defaultPrevented || e.repeat)
            return;

        switch (e.key.toLowerCase()) {
            case "down": // IE/Edge
            case "arrowdown":
            case "up": // IE/Edge
            case "arrowup":
                lastInput[switchApi.AXIS_LY] = 0;
                break;
            case "left": // IE/Edge
            case "arrowleft":
            case "right": // IE/Edge
            case "arrowright":
                lastInput[switchApi.AXIS_LX] = 0;
                break;
            default:
                if (e.key in switchKeyboardMapping && e.key in lastInput)
                    delete lastInput[switchKeyboardMapping[e.key]];
                return;
        }
        const switchEvent = new CustomEvent('switchMessage', lastInput);
        document.dispatchEvent(switchEvent);
    };

    return [newKeyDown, newKeyUp];
}