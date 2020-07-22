package live.twitch.arena;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import live.twitch.arena.dto.TwitchUserDTO;
import org.springframework.web.socket.WebSocketSession;

public class UserRegistry {
    public static final String PRESENTER_ID = "!PRESENTER";

    private final ConcurrentHashMap<String, UserSession> usersById = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, UserSession> usersBySessionId = new ConcurrentHashMap<>();
    private final Map<String, String> whitelist = new ConcurrentHashMap<>();

    public void register(UserSession user) {
        usersById.put(user.getUserId(), user);
        usersBySessionId.put(user.getSession().getId(), user);
    }

    public List<String> getUsers() {
        return Collections.list(usersById.keys()).stream()
                .filter(el -> !el.equals(PRESENTER_ID))
                .collect(Collectors.toList());
    }

    public Optional<UserSession> getById(String id) {
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
