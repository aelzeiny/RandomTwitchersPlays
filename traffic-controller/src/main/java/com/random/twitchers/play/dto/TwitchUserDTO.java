package com.random.twitchers.play.dto;

public class TwitchUserDTO {
    private String userId;
    private String twitchTag;

    public String getTwitchTag() {
        return twitchTag;
    }

    public void setTwitchTag(String twitchTag) {
        this.twitchTag = twitchTag;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }
}
