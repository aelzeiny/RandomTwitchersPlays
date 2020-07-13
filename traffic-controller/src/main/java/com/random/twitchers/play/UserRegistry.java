package com.random.twitchers.play;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import com.random.twitchers.play.dto.TwitchUserDTO;
import org.springframework.web.socket.WebSocketSession;

public class UserRegistry {
    public static final String PRESENTER_ID = "!PRESENTER";

    private final ConcurrentHashMap<String, UserSession> usersById = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, UserSession> usersBySessionId = new ConcurrentHashMap<>();
    private final Map<String, String> whitelist = new ConcurrentHashMap<>();
    private UserSession presenter;

    public void register(UserSession user) {
        usersById.put(user.getUserId(), user);
        usersBySessionId.put(user.getSession().getId(), user);
    }

    public void registerPresenter(UserSession presenter) {
        this.presenter = presenter;
        this.register(presenter);
    }

    public Optional<UserSession> getPresenter() {
        return Optional.ofNullable(this.presenter);
    }

    public List<String> getUsers() {
        return Collections.list(usersById.keys()).stream()
                .filter(el -> !el.equals(PRESENTER_ID))
                .collect(Collectors.toList());
    }

    public Optional<UserSession> getById(String id) {
        if (id.equals(UserRegistry.PRESENTER_ID))
            return Optional.ofNullable(presenter);
        return Optional.ofNullable(usersById.get(id));
    }

    public Optional<UserSession> getBySession(WebSocketSession session) {
        String sessId = session.getId();
        if (!usersBySessionId.containsKey(sessId))
            return Optional.empty();
        return Optional.ofNullable(usersBySessionId.get(sessId));
    }

    public Optional<UserSession> removeBySession(WebSocketSession session) {
        Optional<UserSession> user = getBySession(session);
        if (user.isPresent()) {
            usersById.remove(user.get().getUserId());
            usersBySessionId.remove(session.getId());
            if (presenter != null && session == presenter.getSession()) {
                this.presenter = null;
            }
        }
        return user;
    }

    public boolean notWhitelisted(String userId) {
        return !this.whitelist.containsKey(userId);
    }

    public String getTwitchTag(String userId) {
        return this.whitelist.get(userId);
    }

    public void setWhitelist(List<TwitchUserDTO> names) {
        this.whitelist.clear();
        this.whitelist.putAll(
                names.stream().collect(Collectors.toConcurrentMap(
                        TwitchUserDTO::getUserId,
                        TwitchUserDTO::getTwitchTag
                ))
        );
    }
}
