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

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.web.socket.WebSocketSession;

public class UserRegistry {

  private final ConcurrentHashMap<String, UserSession> usersByName = new ConcurrentHashMap<>();
  private final ConcurrentHashMap<String, UserSession> usersBySessionId = new ConcurrentHashMap<>();
  private Set<String> whitelist = new HashSet<>();

  public void register(UserSession user) {
    usersByName.put(user.getName(), user);
    usersBySessionId.put(user.getSession().getId(), user);
  }

  public ArrayList<String> getUsers() {
    return Collections.list(usersByName.keys());
  }

  public UserSession getByName(String name) {
    return usersByName.get(name);
  }

  public boolean exists(String name) {
    return usersByName.containsKey(name);
  }

  public void setWhitelist(List<String> names) { this.whitelist = new HashSet<>(names); }

  public boolean isWhitelisted(String name) { return this.whitelist.contains(name); }

  public Optional<UserSession> getBySession(WebSocketSession session) {
    String sessId = session.getId();
    if (!usersBySessionId.containsKey(sessId))
      return Optional.empty();
    return Optional.ofNullable(usersBySessionId.get(sessId));
  }

  public Optional<UserSession> removeBySession(WebSocketSession session) {
    Optional<UserSession> user = getBySession(session);
    if (user.isPresent()) {
      usersByName.remove(user.get().getName());
      usersBySessionId.remove(session.getId());
    }
    return user;
  }

}
