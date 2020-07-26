package live.twitch.arena;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import live.twitch.arena.dto.Pair;
import live.twitch.arena.dto.TwitchUserDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(path="/api/", produces="application/json")
public class TrafficHttpController {
    @Autowired
    private UserRegistry registry;

    @GetMapping("/users")
    public String listUsers() {
        JsonArray streamList = serializeUserTimeouts(registry.getUserTimeouts());
        JsonArray whitelist = serializeUserTimeouts(registry.getWhitelistTimeouts());

        final JsonObject status = new JsonObject();
        status.add("stream", streamList.getAsJsonArray());
        status.add("whitelist", whitelist.getAsJsonArray());
        return status.toString();
    }

    @PostMapping(path="/users", consumes="application/json")
    public String updateUserWhitelist(@RequestBody String userList) throws IOException {
        final ObjectMapper mapper = new ObjectMapper();
        final List<TwitchUserDTO> users = mapper.readValue(
            userList,
            mapper.getTypeFactory().constructCollectionType(List.class, TwitchUserDTO.class)
        );
        registry.setWhitelist(users);
        return "{}";
    }

    private JsonArray serializeUserTimeouts(Map<String, Pair<String, Long>> userSessions) {
        JsonArray streamList = new JsonArray();
        for (String userId : userSessions.keySet()) {
            JsonObject userElement = new JsonObject();
            userElement.addProperty("userId", userId);
            userElement.addProperty("twitchTag", userSessions.get(userId).first);
            userElement.addProperty("time", userSessions.get(userId).second);
            streamList.add(userElement);
        }
        return streamList;
    }
}