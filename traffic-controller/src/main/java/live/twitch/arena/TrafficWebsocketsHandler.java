package live.twitch.arena;

import java.io.IOException;
import java.net.URI;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

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
        URI endpoint = session.getUri();
        Room room = roomManager.getRoom();
        if (endpoint != null && endpoint.getQuery() != null) {
            Optional<String> userId = MessageHandler.getParamFromSession(session, "id");
            Optional<String> jwt = MessageHandler.getParamFromSession(session, "jwt");
            // Presenter must have a JWT in the connection URL
            if (jwt.isPresent()) {
                if (!JwtRequestFilter.verifyJwt(jwt.get())) {
                    session.close(CloseStatus.NOT_ACCEPTABLE);
                } else if (room.getPresenter().isPresent()) {
                    socketError(session, "PRESENTER has already connected");
                } else {
                    UserSession presenterSession = room.join(
                            UserRegistry.PRESENTER_ID,
                            UserRegistry.PRESENTER_ID,
                            session,
                            true
                    );
                    this.registry.register(presenterSession);
                }
            }
            // User must be whitelisted
            else if (userId.isPresent()) {
                if (registry.notWhitelisted(userId.get())) {
                    socketError(session, "User ID is not whitelisted for connection");
                } else if (registry.getById(userId.get()).isPresent()) {
                    socketError(session, "User ID is already connected");
                } else {
                    // Add to room & registry
                    UserSession userSession = room.join(
                        userId.get(),
                        registry.getTwitchTag(userId.get()),
                        session,
                        false
                    );
                    this.registry.register(userSession);

                    // Filter expired sessions
                    List<UserSession> expiredSessions = registry.getUsers().stream()
                        .filter(u -> registry.notWhitelisted(u))
                        .map(u -> registry.getById(u).orElseThrow(IllegalArgumentException::new))
                        .collect(Collectors.toList());
                    for (UserSession sess : expiredSessions) {
                        this.cleanupUser(sess.getSession());
                        sess.getSession().close(CloseStatus.NORMAL);
                    }
                }
            }
            // If not user or presenter, then close connection & save bandwidth.
            else {
                session.close(CloseStatus.NOT_ACCEPTABLE);
            }
        }
    }

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        final JsonObject jsonMessage = gson.fromJson(message.getPayload(), JsonObject.class);

        if (!session.isOpen())
            return;

        MessageHandler handler;
        if (MessageHandler.getParamFromSession(session, "jwt").isPresent())
            handler = new PresenterMessageHandler(session, registry, jsonMessage, roomManager);
        else
            handler = new UserMessageHandler(session, registry, jsonMessage, roomManager);

        handler.handleMessage();
    }

    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session,@NonNull CloseStatus status) {
        cleanupUser(session);
    }

    private void cleanupUser(WebSocketSession session) {
        Optional<UserSession> user = registry.removeBySession(session);
        Room room = this.roomManager.getRoom();
        if (user.isPresent()) {
            log.info("User {}@{}: has exited the room", user.get().getUserId(), user.get().getTwitchTag());
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