package live.twitch.arena;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Arrays;
import java.util.Map;

@RestController
@RequestMapping(path="/api/", produces="application/json")
public class TrafficHttpController {
    @Autowired
    private UserRegistry registry;

    @Autowired
    private RoomManager roomManager;

    @GetMapping("/users")
    public String listUsers() {
        JsonArray streamList = serializeUserTimeouts(registry.getUserTimeouts());
        JsonArray whitelist = serializeUserTimeouts(registry.getWhitelistTimeouts());

        final JsonObject status = new JsonObject();
        status.add("stream", streamList.getAsJsonArray());
        status.add("whitelist", whitelist.getAsJsonArray());
        status.addProperty("hasPresenter", roomManager.getRoom().getPresenter().isPresent());
        return status.toString();
    }

    @PostMapping(path="/users", consumes="application/json")
    public String updateUserWhitelist(@RequestBody String rawUserList) throws IOException {
        String[] userList = new Gson().fromJson(rawUserList, String[].class);
        registry.setWhitelist(Arrays.asList(userList));
        return "{}";
    }

    private JsonArray serializeUserTimeouts(Map<String, Long> userSessions) {
        JsonArray streamList = new JsonArray();
        for (String userId : userSessions.keySet()) {
            JsonObject userElement = new JsonObject();
            userElement.addProperty("userId", userId);
            userElement.addProperty("time", userSessions.get(userId));
            streamList.add(userElement);
        }
        return streamList;
    }
}