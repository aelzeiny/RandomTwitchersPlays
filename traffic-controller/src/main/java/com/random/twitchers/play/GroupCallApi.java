package com.random.twitchers.play;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.google.gson.reflect.TypeToken;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping(path="/api/", produces="application/json")
public class GroupCallApi {
    private static final Logger log = LoggerFactory.getLogger(CallHandler.class);

    private static final Gson gson = new GsonBuilder().create();

    @Autowired
    private RoomManager roomManager;

    @Autowired
    private UserRegistry registry;

    @GetMapping("/users")
    public String listUsers() {
        Gson gson = new GsonBuilder().create();
        return gson.toJson(registry.getUsers());
    }

    @PostMapping(path="/users", consumes="application/json")
    public String updateUserWhitelist(@RequestBody String userList) throws IOException {
        final ObjectMapper mapper = new ObjectMapper();
        final List<String> usernames = mapper.readValue(
            userList,
            mapper.getTypeFactory().constructCollectionType(List.class, String.class)
        );
        registry.setWhitelist(usernames);

        JsonObject jsonObject = new JsonObject();
        jsonObject.addProperty("users", gson.toJson(registry.getUsers()));
        return jsonObject.toString();
    }
}