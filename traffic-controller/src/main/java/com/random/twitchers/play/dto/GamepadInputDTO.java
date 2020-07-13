package com.random.twitchers.play.dto;

public class GamepadInputDTO {
    private String key;
    private short[] buffer;

    public GamepadInputDTO(String key, short[] buffer) {
        this.key = key;
        this.buffer = buffer;
    }

    public short[] getBuffer() {
        return this.buffer;
    }

    public String getKey() { return this.key; }
}
