/*
 * (C) Copyright 2014 Kurento (http://kurento.org/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

package com.random.twitchers.play;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.apache.http.NameValuePair;
import org.apache.http.client.utils.URLEncodedUtils;
import org.kurento.client.IceCandidate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;

public class CallHandler extends TextWebSocketHandler {

  private static final Logger log = LoggerFactory.getLogger(CallHandler.class);

  private static final Gson gson = new GsonBuilder().create();

  @Autowired
  private RoomManager roomManager;

  @Autowired
  private UserRegistry registry;

  @Override
  public void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
    final JsonObject jsonMessage = gson.fromJson(message.getPayload(), JsonObject.class);

    if (!session.isOpen()) {
      return;
    }

    Optional<UserSession> nullableUser = registry.getBySession(session);
    if (nullableUser.isPresent()) {
      log.debug("Incoming message from user '{}': {}", nullableUser.get().getUserId(), jsonMessage);
    } else {
      log.debug("Incoming message from new user: {}", jsonMessage);
    }
    if (jsonMessage.get("id").getAsString().equals("joinRoom")) {
      joinRoom(session);
      return;
    }

    final UserSession user = nullableUser.orElseThrow(IllegalArgumentException::new);
    switch (jsonMessage.get("id").getAsString()) {
      case "receiveVideoFrom":
        final String senderName = jsonMessage.get("sender").getAsString();
        final UserSession sender = registry.getByName(senderName);
        final String sdpOffer = jsonMessage.get("sdpOffer").getAsString();
        user.receiveVideoFrom(sender, sdpOffer);
        break;
      case "leaveRoom":
        leaveRoom(user);
        break;
      case "onIceCandidate":
        JsonObject candidate = jsonMessage.get("candidate").getAsJsonObject();

        if (user != null) {
          IceCandidate cand = new IceCandidate(candidate.get("candidate").getAsString(),
              candidate.get("sdpMid").getAsString(), candidate.get("sdpMLineIndex").getAsInt());
          user.addCandidate(cand, jsonMessage.get("name").getAsString());
        }
        break;
      default:
        break;
    }
  }

  @Override
  public void afterConnectionEstablished(WebSocketSession session) throws IOException {
    URI endpoint = session.getUri();
    if (endpoint != null && endpoint.getQuery() != null) {
      Optional<String> userId = getIdFromSession(session);
      if (!userId.isPresent()) {
        session.close(CloseStatus.NOT_ACCEPTABLE);
        return;
      }
      // User must be whitelisted
      if (!registry.isWhitelisted(userId.get())) {
        session.close(CloseStatus.NOT_ACCEPTABLE);
        return;
      }

      // Filter expired sessions
      List<UserSession> expiredSessions = registry.getUsers().stream()
              .filter(u -> !registry.isWhitelisted(u))
              .map(u -> registry.getByName(u))
              .collect(Collectors.toList());
      for (UserSession sess : expiredSessions) {
        sess.close();
      }
    }
  }

  @Override
  public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
    Optional<UserSession> user = registry.removeBySession(session);
    if (user.isPresent())
      roomManager.getRoom().leave(user.get());
  }

  private void joinRoom(WebSocketSession session) throws IOException {
    final String userId = getIdFromSession(session).orElseThrow(IllegalArgumentException::new);
    final String twitchTag = registry.getTwitchTag(userId);
    log.info("PARTICIPANT {}: trying to join as {}", userId, twitchTag);

    Room room = roomManager.getRoom();
    final UserSession user = room.join(userId, twitchTag, session);
    registry.register(user);
  }

  private void leaveRoom(UserSession user) throws IOException {
    final Room room = roomManager.getRoom();
    room.leave(user);
  }

  private Optional<String> getIdFromSession(WebSocketSession session) {
    URI endpoint = session.getUri();
    if (endpoint == null || endpoint.getQuery() != null)
      return Optional.empty();
    List<NameValuePair> params = URLEncodedUtils.parse(endpoint, StandardCharsets.UTF_8);
    Optional<NameValuePair> tuple = params.stream().filter(el -> el.getName().equals("id")).findFirst();
    // User must identify themselves based off of connection url
    if (!tuple.isPresent())
      return Optional.empty();
    return Optional.of(tuple.get().getValue());
  }
}
