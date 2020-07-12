package com.random.twitchers.play;


import com.google.gson.JsonObject;
import org.apache.http.NameValuePair;
import org.apache.http.client.utils.URLEncodedUtils;
import org.kurento.client.IceCandidate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

public abstract class MessageHandler {
    protected static final Logger log = LoggerFactory.getLogger(TrafficWebsocketsHandler.class);

    public static final String ACTION_RECEIVE_VID = "receiveVideoFrom";
    public static final String ACTION_ICE_CANDIDATE = "onIceCandidate";
    public static final String ACTION_LEAVE_ROOM = "leaveRoom";

    protected final WebSocketSession session;
    protected final JsonObject jsonMessage;
    protected final UserRegistry registry;
    protected final RoomManager rooms;

    public MessageHandler(WebSocketSession session, UserRegistry registry, JsonObject jsonMessage, RoomManager rooms) {
        this.session = session;
        this.registry = registry;
        this.jsonMessage = jsonMessage;
        this.rooms = rooms;
    }

    public void handleMessage() throws IOException {
        String action = this.jsonMessage.get("id").getAsString();
        switch (action) {
            case MessageHandler.ACTION_RECEIVE_VID:
                this.receiveVideoFrom();
                break;
            case MessageHandler.ACTION_LEAVE_ROOM:
                this.leaveRoom();
                break;
            case MessageHandler.ACTION_ICE_CANDIDATE:
                this.iceCandidate();
        }
    }

    protected void leaveRoom() throws IOException {
        session.close(CloseStatus.NORMAL);
    }

    protected void receiveVideoFrom() throws IOException {
        final String senderName = jsonMessage.get("sender").getAsString();
        final String sdpOffer = jsonMessage.get("sdpOffer").getAsString();

        final UserSession sender = registry.getById(senderName).orElseThrow(IllegalArgumentException::new);
        final UserSession user = registry.getBySession(session).orElseThrow(IllegalArgumentException::new);
        user.receiveVideoFrom(sender, sdpOffer);
    }

    protected void iceCandidate() {
        JsonObject candidate = jsonMessage.get("candidate").getAsJsonObject();
        final Optional<UserSession> user = registry.getBySession(session);

        if (user.isPresent()) {
            IceCandidate cand = new IceCandidate(candidate.get("candidate").getAsString(),
                    candidate.get("sdpMid").getAsString(), candidate.get("sdpMLineIndex").getAsInt());
            user.get().addCandidate(cand, jsonMessage.get("name").getAsString());
        }
    }

    public static Optional<String> getParamFromSession(WebSocketSession session, String param) {
        URI endpoint = session.getUri();
        if (endpoint == null || endpoint.getQuery() != null)
            return Optional.empty();
        List<NameValuePair> params = URLEncodedUtils.parse(endpoint, StandardCharsets.UTF_8);
        Optional<NameValuePair> tuple = params.stream().filter(el -> el.getName().equals(param)).findFirst();
        // User must identify themselves based off of connection url
        return tuple.map(NameValuePair::getValue);
    }
}


class UserMessageHandler extends MessageHandler {
    public UserMessageHandler(WebSocketSession session, UserRegistry registry, JsonObject jsonMessage,
                              RoomManager rooms) {
        super(session, registry, jsonMessage, rooms);
    }
}


class PresenterMessageHandler extends MessageHandler {
    public PresenterMessageHandler(WebSocketSession session, UserRegistry registry, JsonObject jsonMessage,
                              RoomManager rooms) {
        super(session, registry, jsonMessage, rooms);
    }
}