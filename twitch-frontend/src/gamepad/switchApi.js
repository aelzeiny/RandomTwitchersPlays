import struct from 'python-struct';

export const BUTTON_Y = 'X';
export const BUTTON_B = 'B';
export const BUTTON_A = 'A';
export const BUTTON_X = 'X';
export const BUTTON_LB = 'LB';
export const BUTTON_RB = 'RB';
export const BUTTON_LTRIGGER = 'ZL';
export const BUTTON_RTRIGGER = 'ZR';
export const BUTTON_SELECT = '<';
export const BUTTON_START = '>';
export const BUTTON_LSTICK = 'LS';
export const BUTTON_RSTICK = 'RS';
export const BUTTON_HOME = 'H';  // (Will never be supported. Filtered out server-side)
export const BUTTON_CAPTURE = '*';

export const AXIS_LX = 'LX';
export const AXIS_LY = 'LY';
export const AXIS_RX = 'RX';
export const AXIS_RY = 'RY';

export const HAT_UP = 'HU';
export const HAT_DOWN = 'HD';
export const HAT_LEFT = 'HL';
export const HAT_RIGHT = 'HR';

const buttonMapping = [
    BUTTON_Y,
    BUTTON_B,
    BUTTON_A,
    BUTTON_X,
    BUTTON_LB,
    BUTTON_RB,
    BUTTON_LTRIGGER,
    BUTTON_RTRIGGER,
    BUTTON_SELECT,
    BUTTON_START,
    BUTTON_LSTICK,
    BUTTON_RSTICK,
    BUTTON_HOME,
    BUTTON_CAPTURE
];

const axisMapping = [
    AXIS_LX,
    AXIS_LY,
    AXIS_RX,
    AXIS_RY
];

const hatMapping = [
    HAT_UP,
    HAT_RIGHT,
    HAT_DOWN,
    HAT_LEFT
];

// Map hatcode sums to one of these unsigned nums. This is an underlying implementation detail.
const hatCodeMapping = [8, 0, 2, 1, 4, 8, 3, 8, 6, 7, 8, 8, 5, 8, 8];

/**
 * Take GamePad API button inputs & compress into a BigEndian Struct. Works like this:
 * STRUCT is a byte array of 6, where B is an unsigned char and H is an unsigned short
 * -----------
 * 0 1 2 3 4 5
 * B H B B B B
 * | | | | | +-> RY Axis
 * | | | | +---> RX Axis
 * | | | +-----> LY Axis
 * | | +-------> LX Axis
 * | +---------> Button Sums
 * +-----------> HatCode to HatCodeMapping
 */
export function compressInput(inputObj) {
    const button = compressButtons(inputObj);
    const hat = compressHats(inputObj);
    const axes = compressAxes(inputObj);
    return struct.pack('>BHBBBB', [hat, button, ...axes]);
}

/**
 * Given an input object with BUTTON_* keys, return a number that indicates
 * its pressed values.
 * @param inputObj object containing pressed controller inputs
 * @returns {number} An unsigned int mapping
 */
function compressButtons(inputObj) {
    let buttonSum = 0;
    for (let i = 0; i < buttonMapping.length; i++) {
        const button = buttonMapping[i];
        if (inputObj[button])
            buttonSum += 1 << i;
    }
    return buttonSum;
}

/**
 * Given an input object with HAT_* keys, return a number that indicates
 * its pressed values.
 * @param inputObj object containing pressed controller inputs
 * @returns {number} A hat-code mapping
 */
function compressHats(inputObj) {
    let hatSum = 0;
    for (let i = 0; i < hatMapping.length; i++) {
        const hat = hatMapping[i];
        if (inputObj[hat])
            hatSum += 1 << i;
    }
    return hatCodeMapping[hatSum];
}

/**
 * Given an input object with AXIS_* keys, return an array of numbers
 * indicating which axes are moved.
 * @param inputObj object containing mapped values
 * @returns {number[]} 128 is neutral, 0 and 256 are the extreme ranges
 */
function compressAxes(inputObj) {
    return axisMapping.map((key) => Math.round(inputObj[key] * 256));
}