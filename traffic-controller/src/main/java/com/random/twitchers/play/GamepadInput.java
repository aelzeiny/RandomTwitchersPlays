package com.random.twitchers.play;

public class GamepadInput {
    private static final short BUTTON_HOME_MASK = 1 << 12;
    private static final short BUTTON_CAPTURE_MASK = 1 << 13;
    /**
     * There are 13 buttons supported on the Nintendo Switch. We need to make sure the user doesn't overflow
     * the allocated buffer, and doesn't press certain forbidden buttons.
     * This will return a binary of 13 1s to represent the permissable range. The 0s are places where buttons
     * are not allowed.
     */
    private static final short allowedButtonMask = (short) (
            ((short) Math.floor(Math.pow(2, 13)) - 1) ^ // This gives a mask of 13 1s in binary. 8191 in decimal.
                    BUTTON_HOME_MASK ^ // XOR operation to set the HOME button to 0
                    BUTTON_CAPTURE_MASK // XOR operation to set the CAPTURE button to 0
    );
    private static final short[] hatMapping = new short[] {8, 0, 2, 1, 4, 8, 3, 8, 6, 7, 8, 8, 5, 8, 8};
    public short hatMask;
    private short buttonMask;
    private short[] axes;

    protected GamepadInput(short hatMask, short buttonMask, short[] axes) {
        this.hatMask = hatMask;
        this.buttonMask = buttonMask;
        this.axes = axes;
    }

    /**
     * Compresses given input down to BigEndian "B H B B B B" byte array. Represented as short because
     * in Java bytes are signed.
     * STRUCT is a byte array of 7, where B is an unsigned char (1 byte) and H is an unsigned short (2 bytes)
     * -----------
     * 0 1 2 3 4 5
     * B H B B B B
     * | | | | | +-> RY Axis
     * | | | | +---> RX Axis
     * | | | +-----> LY Axis
     * | | +-------> LX Axis
     * | +---------> Button Sums
     * +-----------> HatCodeMapping to HatMask
     */
    public short[] compress() {
        short major = (short) (this.buttonMask / 256);
        short minor = (short) (this.buttonMask - major * 256);
        return new short[] {
                this.getHatMapping(),
                major,
                minor,
                axes[0],
                axes[1],
                axes[2],
                axes[3]
        };
    }

    /**
     * Parses compressed Gamepad inputs from a BigEndian Struct. Works like this:
     * STRUCT is a byte array of 7, where B is an unsigned char and H is an unsigned short
     * -----------
     * 0 1 2 3 4 5
     * B H B B B B
     * | | | | | +-> RY Axis
     * | | | | +---> RX Axis
     * | | | +-----> LY Axis
     * | | +-------> LX Axis
     * | +---------> Button Sums
     * +-----------> HatCodeMapping to HatMask
     */
    public static GamepadInput parse(short[] buffer) throws IllegalArgumentException {
        if (buffer.length != 7)
            throw new IllegalArgumentException("Invalid Controller Input");
        for (short s : buffer)
            if (s < 0 || s >= 256)
                throw new IllegalArgumentException("Invalid Controller Input");
        if (buffer[0] > 8)
            throw new IllegalArgumentException("Invalid Controller Input");

        // first byte is the the hatmask. Should be within the range of 0-8.
        short hatMask = GamepadInput.getHatMask(buffer[0]);

        // the next 2 unsigned bytes are the button masks. Should be in the range of 0-256.
        short buttonMask = (short) (buffer[2] + buffer[1] * 256);
        buttonMask &= GamepadInput.allowedButtonMask;

        // the next 4 unsigned bytes are controller axes
        short[] axes = new short[] {
                buffer[3], buffer[4], buffer[5], buffer[6]
        };
        return new GamepadInput(hatMask, buttonMask, axes);
    }

    /**
     * The following format into a bitmask.
     * 0/2/4/6 represent the Up, Right, Down, and Left button on the DPAD. 8 is unpressed.
     * 7 0 1
     * 6 8 2
     * 5 4 3
     *
     * The bitmask represents a number where if converted to binary should show 0 for pressed and 1 for unpressed
     * in the order of "RDLU"
     * example: Mapping: 3 -> Down & Right button pressed. Output is the binary number 1100 in the order of RDLU;
     * which is a bitmask of 12.
     * @param mapping object containing pressed controller inputs
     * @return A hat-code mapping
     */
    private static short getHatMask(short mapping) {
        short mask = 0;
        if (mapping % 2 != 0) {
            mask |= 1 << (mapping - 1) / 2;
            mask |= 1 << (mapping + 1) % 8 / 2;
        } else {
            mask |= 1 << mapping / 2;
        }
        return mask;
    }

    /**
     * Given a button mask of format RDLU; convert back into a hat-code mapping of the format below.
     * 7 0 1
     * 6 8 2
     * 5 4 3
     */
    private short getHatMapping() {
        return hatMapping[this.hatMask];
    }
}
