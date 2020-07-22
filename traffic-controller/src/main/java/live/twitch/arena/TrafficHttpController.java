package live.twitch.arena;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import live.twitch.arena.dto.TwitchUserDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping(path="/api/", produces="application/json")
public class TrafficHttpController {
    private static final Logger log = LoggerFactory.getLogger(TrafficHttpController.class);

    private static final Gson gson = new GsonBuilder().create();

    @Autowired
    private UserRegistry registry;

    @GetMapping("/users")
    public String listUsers() {
        Gson gson = new GsonBuilder().create();
        List<String> users = registry.getUsers();
        log.info("Joined Users: {}", String.join(", ", users));
        return gson.toJson(registry.getUsers());
    }

    @PostMapping(path="/users", consumes="application/json")
    public String updateUserWhitelist(@RequestBody String userList) throws IOException {
        final ObjectMapper mapper = new ObjectMapper();
        final List<TwitchUserDTO> users = mapper.readValue(
            userList,
            mapper.getTypeFactory().constructCollectionType(List.class, TwitchUserDTO.class)
        );
        registry.setWhitelist(users);

        return gson.toJson(registry.getUsers());
    }
}