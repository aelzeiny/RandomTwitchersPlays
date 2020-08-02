package live.twitch.arena;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import org.springframework.web.socket.WebSocketSession;

public class UserRegistry {
    public static final String PRESENTER_ID = "!PRESENTER";

    private final ConcurrentHashMap<String, UserSession> usersById = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, UserSession> usersBySessionId = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, LocalDateTime> whitelist = new ConcurrentHashMap<>();

    public void register(UserSession user) {
        usersById.put(user.getUserId(), user);
        usersBySessionId.put(user.getSession().getId(), user);
    }

    public List<String> getUsers() {
        return Collections.list(usersById.keys()).stream()
                .filter(el -> !el.equals(PRESENTER_ID))
                .collect(Collectors.toList());
    }

    public Map<String, Long> getUserTimeouts() {
        final long rightNow = LocalDateTime.now().toEpochSecond(ZoneOffset.UTC);
        return Collections.list(usersById.keys()).stream()
                .filter(el -> !el.equals(PRESENTER_ID))
                .collect(Collectors.toMap(
                    el -> el,
                    el -> rightNow - usersById.get(el).getCreatedDttm().toEpochSecond(ZoneOffset.UTC),
                    (first, second) -> first,
                    ConcurrentHashMap::new
                ));
    }

    public Map<String, Long> getWhitelistTimeouts() {
        final long rightNow = LocalDateTime.now().toEpochSecond(ZoneOffset.UTC);
        return Collections.list(whitelist.keys()).stream()
                .filter(el -> !el.equals(PRESENTER_ID))
                .collect(Collectors.toMap(
                        el -> el,
                        el -> rightNow - whitelist.get(el).toEpochSecond(ZoneOffset.UTC),
                        (first, second) -> first,
                        ConcurrentHashMap::new
                ));
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

    public void setWhitelist(List<String> names) {
        // remove the old items
        for (String name : this.whitelist.keySet()) {
            if (!names.contains(name))
                this.whitelist.remove(name);
        }
        // add new items
        for (String u : names) {
            if (!this.whitelist.containsKey(u)) {
                this.whitelist.put(u, LocalDateTime.now());
            }
        }
    }
}
