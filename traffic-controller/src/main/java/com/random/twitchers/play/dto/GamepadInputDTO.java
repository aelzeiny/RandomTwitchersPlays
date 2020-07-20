package com.random.twitchers.play.dto;

import com.random.twitchers.play.MessageHandler;

public class GamepadInputDTO {
    private final String name;
    private final short[] input;
    private final short[] commonInput;
    private final String id;

    public GamepadInputDTO(String name, short[] input, short[] commonInput) {
        this.name = name;
        this.input = input;
        this.commonInput = commonInput;
        this.id = MessageHandler.ACTION_GAMEPAD_INPUT;
    }
    public String getName() { return this.name; }
    public String getId() { return this.id; }
    public short[] getInput() { return this.input; }
    public short[] getCommonInput() {
        return this.commonInput;
    }
}
