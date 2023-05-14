package live.twitch.arena;

import java.io.IOException;
import java.net.HttpCookie;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import live.twitch.arena.security.JwtRequestFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.NonNull;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;

public class TrafficWebsocketsHandler extends TextWebSocketHandler {
    private static final Logger log = LoggerFactory.getLogger(TrafficWebsocketsHandler.class);

    private static final Gson gson = new GsonBuilder().create();

    @Autowired
    private RoomManager roomManager;

    @Autowired
    private UserRegistry registry;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws IOException {
        Room room = roomManager.getRoom();
        List<String> cookieHeader = session.getHandshakeHeaders().get("cookie");
        if (cookieHeader == null || cookieHeader.isEmpty()) {
            session.close(CloseStatus.NOT_ACCEPTABLE);
            return;
        }
        Optional<HttpCookie> tokenCookie = HttpCookie
                .parse(cookieHeader.get(0))
                .stream()
                .filter(x -> x.getName().equals("token"))
                .findFirst();
        if (!tokenCookie.isPresent()) {
            session.close(CloseStatus.NOT_ACCEPTABLE);
            return;
        }
        String jwt = tokenCookie.get().getValue();

        if (!JwtRequestFilter.verifyJwt(jwt)) {
            session.close(CloseStatus.NOT_ACCEPTABLE);
            return;
        }

        Jws<Claims> yee = JwtRequestFilter.parseJwt(jwt);
        String username = yee.getBody().get("username", String.class);

        // Presenter just joined
        if (username.equals(UserRegistry.PRESENTER_ID)) {
            if (!room.getPresenter().isPresent()) {
                UserSession presenterSession = room.join(UserRegistry.PRESENTER_ID, session, true);
                this.registry.register(presenterSession);
            } else {
                socketError(session, "PRESENTER has already connected");
            }
            return;
        }

        // User just joined
        if (registry.notWhitelisted(username)) {
            socketError(session, "User ID is not whitelisted for connection");
            return;
        }
        if (registry.getById(username).isPresent()) {
            // If the user already exists. Clear them out & create a new client.
            UserSession oldUserSession = room.getParticipant(username);
            oldUserSession.close();
            // Add to room & registry
            UserSession newUserSession = room.join(username, session, false);
            this.registry.register(newUserSession);
        } else {
            // Add to room & registry
            UserSession userSession = room.join(username, session, false);
            this.registry.register(userSession);

            // Filter expired sessions
            List<UserSession> expiredSessions = registry
                    .getUsers()
                    .stream()
                    .filter(u -> registry.notWhitelisted(u))
                    .map(u -> registry.getById(u).orElseThrow(IllegalArgumentException::new))
                    .collect(Collectors.toList());
            for (UserSession sess : expiredSessions) {
                this.cleanupUser(sess.getSession());
                sess.getSession().close(CloseStatus.NORMAL);
            }
        }
    }

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        final JsonObject jsonMessage = gson.fromJson(message.getPayload(), JsonObject.class);

        if (!session.isOpen()) return;

        MessageHandler handler;
        if (MessageHandler.getParamFromSession(session, "jwt").isPresent())
            handler = new PresenterMessageHandler(session, registry, jsonMessage, roomManager);
        else handler = new UserMessageHandler(session, registry, jsonMessage, roomManager);

        handler.handleMessage();
    }

    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session, @NonNull CloseStatus status) {
        cleanupUser(session);
    }

    private void cleanupUser(WebSocketSession session) {
        Optional<UserSession> user = registry.removeBySession(session);
        Room room = this.roomManager.getRoom();
        if (user.isPresent()) {
            log.info("User {}: has exited the room", user.get().getUserId());
            room.leave(user.get());
        }
    }

    private void socketError(WebSocketSession session, String errorString) throws IOException {
        log.info(errorString);
        JsonObject duplicateError = new JsonObject();
        duplicateError.addProperty("status", "error");
        duplicateError.addProperty("error", errorString);
        TextMessage errorMsg = new TextMessage(duplicateError.toString());
        session.sendMessage(errorMsg);
        session.close(CloseStatus.NOT_ACCEPTABLE);
    }
}