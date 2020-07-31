package live.twitch.arena;

import java.io.Closeable;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import javax.annotation.PreDestroy;

import org.kurento.client.Continuation;
import org.kurento.client.MediaPipeline;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.socket.WebSocketSession;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;

public class Room implements Closeable {
    private static Room instance;
    private final Logger log = LoggerFactory.getLogger(Room.class);

    private final ConcurrentMap<String, UserSession> participants = new ConcurrentHashMap<>();
    private UserSession presenter = null;
    private final MediaPipeline pipeline;

    public Room(MediaPipeline pipeline) {
        this.pipeline = pipeline;
        log.info("ROOM has been created");
        Room.instance = this;
    }

    @PreDestroy
    private void shutdown() {
        this.close();
    }

    public UserSession join(String userName, WebSocketSession session, boolean isPresenter) throws IOException {
        log.info("ROOM {}: adding participant {}", userName, userName);
        final UserSession participant = new UserSession(userName, session, this.pipeline);
        if (isPresenter)
            this.presenter = participant;
        joinRoom(participant, isPresenter);
        participants.put(participant.getUserId(), participant);
        sendParticipantNames(participant);
        return participant;
    }

    public Optional<UserSession> getPresenter() {
        return Optional.ofNullable(this.presenter);
    }

    public void leave(UserSession user) {
        log.debug("PARTICIPANT {}: Leaving room", user.getUserId());
        this.removeParticipant(user.getUserId());
        user.close();
    }

    public void broadcast(String message) {
        this.broadcast(message, null);
    }

    public void broadcast(String message, String skipUserId) {
        for (final UserSession participant : participants.values()) {
            if (participant.getUserId().equals(skipUserId))
                continue;
            try {
                participant.sendMessage(message);
            } catch (final IOException e) {
                log.debug("ROOM: participant {} could not be notified", participant.getUserId(), e);
            }
        }
    }

    private void joinRoom(UserSession newParticipant, boolean isPresenter) {
        final JsonObject newParticipantMsg = new JsonObject();
        newParticipantMsg.addProperty("id", "newParticipantArrived");
        newParticipantMsg.addProperty("name", newParticipant.getUserId());
        newParticipantMsg.addProperty("isPresenter", isPresenter);

        log.debug("ROOM: notifying other participants of new participant {}", newParticipant.getUserId());

        for (final UserSession participant : participants.values()) {
            try {
                participant.sendMessage(newParticipantMsg);
            } catch (final IOException e) {
                log.debug("ROOM: participant {} could not be notified", participant.getUserId(), e);
            }
        }
    }

    private void removeParticipant(String name) {
        boolean isPresenter = this.getPresenter().isPresent() && this.presenter.getUserId().equals(name);
        participants.remove(name);
        if (isPresenter)
            this.presenter = null;

        log.debug("ROOM: notifying all users that {} is leaving the room", name);

        final List<String> unnotifiedParticipants = new ArrayList<>();
        final JsonObject participantLeftJson = new JsonObject();
        participantLeftJson.addProperty("id", "participantLeft");
        participantLeftJson.addProperty("name", name);
        participantLeftJson.addProperty("isPresenter", isPresenter);
        for (final UserSession participant : participants.values()) {
            try {
                participant.cancelVideoFrom(name);
                participant.sendMessage(participantLeftJson);
            } catch (final IOException | IllegalStateException e) {
                unnotifiedParticipants.add(participant.getUserId());
            }
        }

        if (!unnotifiedParticipants.isEmpty()) {
            log.debug("ROOM: The users {} could not be notified that {} left the room", unnotifiedParticipants, name);
        }

    }

    public void sendParticipantNames(UserSession user) throws IOException {
        final JsonArray participantsArray = new JsonArray();
        for (final UserSession participant : this.getParticipants()) {
            if (!participant.equals(user)) {
                final JsonElement participantName = new JsonPrimitive(participant.getUserId());
                participantsArray.add(participantName);
            }
        }

        final JsonObject existingParticipantsMsg = new JsonObject();
        existingParticipantsMsg.addProperty("id", "existingParticipants");
        existingParticipantsMsg.add("data", participantsArray);
        if (this.getPresenter().isPresent())
            existingParticipantsMsg.addProperty("presenter", this.presenter.getUserId());
        else
            existingParticipantsMsg.add("presenter", null);
        log.debug("PARTICIPANT {}: sending a list of {} participants", user.getUserId(), participantsArray.size());
        user.sendMessage(existingParticipantsMsg);
    }

    public Collection<UserSession> getParticipants() {
        return participants.values();
    }

    public UserSession getParticipant(String name) {
        return participants.get(name);
    }

    @Override
    public void close() {
        for (final UserSession user : participants.values()) {
            user.close();
        }

        participants.clear();

        pipeline.release(new Continuation<Void>() {

            @Override
            public void onSuccess(Void result) {
                log.trace("ROOM: Released Pipeline");
            }

            @Override
            public void onError(Throwable cause) {
                log.warn("ROOM: Could not release Pipeline");
            }
        });

        log.debug("Room closed");
    }

    public static Room getInstance() {
        return Room.instance;
    }
}
