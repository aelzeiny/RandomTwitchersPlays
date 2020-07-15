package com.random.twitchers.play;


import com.google.gson.*;
import com.google.gson.reflect.TypeToken;
import com.random.twitchers.play.dto.GamepadInputDTO;
import org.apache.http.NameValuePair;
import org.apache.http.client.utils.URLEncodedUtils;
import org.kurento.client.IceCandidate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import sun.reflect.generics.reflectiveObjects.NotImplementedException;

import java.io.IOException;
import java.lang.reflect.Type;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

public abstract class MessageHandler {
    protected static final Logger log = LoggerFactory.getLogger(TrafficWebsocketsHandler.class);

    public static final String ACTION_RECEIVE_VID = "receiveVideoFrom";
    public static final String ACTION_ICE_CANDIDATE = "onIceCandidate";
    public static final String ACTION_LEAVE_ROOM = "leaveRoom";
    public static final String ACTION_GAMEPAD_INPUT = "gamepad";

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
                break;
            case MessageHandler.ACTION_GAMEPAD_INPUT:
                this.gamepadInput();
                break;
        }
    }

    /**
     * Deregistration is handled down-stream
     */
    protected void leaveRoom() throws IOException {
        session.close(CloseStatus.NORMAL);
    }

    protected void receiveVideoFrom() throws IOException {
        final String senderName = jsonMessage.get("sender").getAsString();
        final String sdpOffer = jsonMessage.get("sdpOffer").getAsString();

        final Optional<UserSession> nullableSender = registry.getById(senderName);
        final Optional<UserSession> nullableUser = registry.getBySession(session);

        if (nullableUser.isPresent() && nullableSender.isPresent())
            nullableUser.get().receiveVideoFrom(nullableSender.get(), sdpOffer);
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

    protected void gamepadInput() throws IOException {
        Type oneThiccShortyType = new TypeToken<short[]>() {}.getType();
        short[] byteBuffer = new Gson().fromJson(jsonMessage.get("input"), oneThiccShortyType);
        GamepadInput userInput = GamepadInput.parse(byteBuffer);
        Optional<UserSession> nullableUser = registry.getBySession(session);
        Optional<UserSession> nullablePresenter = registry.getPresenter();
        if (nullableUser.isPresent() && nullablePresenter.isPresent()) {
            nullableUser.get().setGamepadInput(userInput);
            Room room = rooms.getRoom();
            List<GamepadInput> allInputs = room.getParticipants().stream()
                    .map(UserSession::getGamepadInput)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());

            GamepadInput majorityInput;
            if (allInputs.isEmpty())
                return;
            if (allInputs.size() == 1)
                majorityInput = allInputs.get(0);
            else if (allInputs.size() == 2)
                majorityInput = GamepadInput.majorityFactory(allInputs.get(0), allInputs.get(1));
            else
                majorityInput = GamepadInput.majorityFactory(allInputs.get(0), allInputs.get(1), allInputs.get(2));

            String gamepadMsg = new Gson().toJson(new GamepadInputDTO(ACTION_GAMEPAD_INPUT, majorityInput.compress()));
            nullablePresenter.get().sendMessage(gamepadMsg);
        }
    }

    public static Optional<String> getParamFromSession(WebSocketSession session, String param) {
        URI endpoint = session.getUri();
        if (endpoint == null || endpoint.getQuery() == null)
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