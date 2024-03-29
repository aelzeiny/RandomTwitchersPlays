package live.twitch.arena;

import java.io.Closeable;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.kurento.client.Continuation;
import org.kurento.client.IceCandidate;
import org.kurento.client.MediaPipeline;
import org.kurento.client.WebRtcEndpoint;
import org.kurento.jsonrpc.JsonUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.google.gson.JsonObject;


public class UserSession implements Closeable {

    private static final Logger log = LoggerFactory.getLogger(UserSession.class);

    private final String userId;
    private final WebSocketSession session;

    private final MediaPipeline pipeline;

    private final WebRtcEndpoint outgoingMedia;
    private final ConcurrentMap<String, WebRtcEndpoint> incomingMedia = new ConcurrentHashMap<>();
    private final LocalDateTime createdDttm;

    private GamepadInput gamepadInput;

    private boolean isPresenter;

    public UserSession(final String userId, final WebSocketSession session, MediaPipeline pipeline, boolean isPresenter) {
        this.pipeline = pipeline;
        this.userId = userId;
        this.session = session;
        this.outgoingMedia = new WebRtcEndpoint.Builder(pipeline).build();
        this.createdDttm = LocalDateTime.now();
        this.isPresenter = isPresenter;

        this.outgoingMedia.addIceCandidateFoundListener(event -> {
            JsonObject response = new JsonObject();
            response.addProperty("id", "iceCandidate");
            response.addProperty("name", userId);
            response.add("candidate", JsonUtils.toJsonObject(event.getCandidate()));
            try {
                synchronized (session) {
                    session.sendMessage(new TextMessage(response.toString()));
                }
            } catch (IOException e) {
                log.debug(e.getMessage());
            }
        });

        // ensure high-quality video for presenter
        if (isPresenter) {
            this.outgoingMedia.setMinVideoSendBandwidth(2000);
            this.outgoingMedia.setMaxVideoSendBandwidth(5000);
        }
    }

    public WebRtcEndpoint getOutgoingWebRtcPeer() {
        return outgoingMedia;
    }

    public String getUserId() {
        return userId;
    }

    public boolean isPresenter() { return isPresenter; }

    public WebSocketSession getSession() {
        return session;
    }

    public GamepadInput getGamepadInput() {
        return this.gamepadInput;
    }

    public void setGamepadInput(GamepadInput input) {
        this.gamepadInput = input;
    }

    public void receiveVideoFrom(UserSession sender, String sdpOffer) throws IOException {
        log.info("USER {}: connecting with {}", this.userId, sender.getUserId());

        log.trace("USER {}: SdpOffer for {} is {}", this.userId, sender.getUserId(), sdpOffer);

        final String ipSdpAnswer = this.getEndpointForUser(sender).processOffer(sdpOffer);
        final JsonObject scParams = new JsonObject();
        scParams.addProperty("id", "receiveVideoAnswer");
        scParams.addProperty("name", sender.getUserId());
        scParams.addProperty("sdpAnswer", ipSdpAnswer);

        log.trace("USER {}: SdpAnswer for {} is {}", this.userId, sender.getUserId(), ipSdpAnswer);
        this.sendMessage(scParams);
        log.debug("gather candidates");
        this.getEndpointForUser(sender).gatherCandidates();
    }

    private WebRtcEndpoint getEndpointForUser(final UserSession sender) {
        if (sender.getUserId().equals(userId)) {
            log.debug("PARTICIPANT {}: configuring loopback", this.userId);
            return outgoingMedia;
        }

        log.debug("PARTICIPANT {}: receiving video from {}", this.userId, sender.getUserId());

        WebRtcEndpoint incoming = incomingMedia.get(sender.getUserId());
        if (incoming == null) {
            log.debug("PARTICIPANT {}: creating new endpoint for {}", this.userId, sender.getUserId());
            WebRtcEndpoint.Builder incomingBuilder = new WebRtcEndpoint.Builder(pipeline);

            incoming = incomingBuilder.build();

            incoming.addIceCandidateFoundListener(event -> {
                JsonObject response = new JsonObject();
                response.addProperty("id", "iceCandidate");
                response.addProperty("name", sender.getUserId());
                response.add("candidate", JsonUtils.toJsonObject(event.getCandidate()));
                try {
                    synchronized (session) {
                        session.sendMessage(new TextMessage(response.toString()));
                    }
                } catch (IOException e) {
                    log.debug(e.getMessage());
                }
            });
            // Ensure high quality presenter setup
            if (sender.isPresenter) {
                incoming.setMinVideoSendBandwidth(2000);
                incoming.setMaxVideoSendBandwidth(5000);
            }

            incomingMedia.put(sender.getUserId(), incoming);
        }

        log.debug("PARTICIPANT {}: obtained endpoint for {}", this.userId, sender.getUserId());
        sender.getOutgoingWebRtcPeer().connect(incoming);

        return incoming;
    }

    public void cancelVideoFrom(final String senderName) {
        log.debug("PARTICIPANT {}: canceling video reception from {}", this.userId, senderName);
        final WebRtcEndpoint incoming = incomingMedia.remove(senderName);

        if (incoming != null) {
            log.debug("PARTICIPANT {}: removing endpoint for {}", this.userId, senderName);
            incoming.release(new Continuation<Void>() {
                @Override
                public void onSuccess(Void result) {
                    log.trace("PARTICIPANT {}: Released successfully incoming EP for {}",
                            UserSession.this.userId, senderName);
                }

                @Override
                public void onError(Throwable cause) {
                    log.warn("PARTICIPANT {}: Could not release incoming EP for {}", UserSession.this.userId,
                            senderName);
                }
            });
        }
    }

    @Override
    public void close() {
        log.debug("PARTICIPANT {}: Releasing resources", this.userId);
        for (final String remoteParticipantName : incomingMedia.keySet()) {

            log.trace("PARTICIPANT {}: Released incoming EP for {}", this.userId, remoteParticipantName);

            final WebRtcEndpoint ep = this.incomingMedia.get(remoteParticipantName);

            ep.release(new Continuation<Void>() {
                @Override
                public void onSuccess(Void result) {
                    log.trace("PARTICIPANT {}: Released successfully incoming EP for {}",
                            UserSession.this.userId, remoteParticipantName);
                }

                @Override
                public void onError(Throwable cause) {
                    log.warn("PARTICIPANT {}: Could not release incoming EP for {}", UserSession.this.userId,
                            remoteParticipantName);
                }
            });
        }

        outgoingMedia.release(new Continuation<Void>() {

            @Override
            public void onSuccess(Void result) {
                log.trace("PARTICIPANT {}: Released outgoing EP", UserSession.this.userId);
            }

            @Override
            public void onError(Throwable cause) {
                log.warn("USER {}: Could not release outgoing EP", UserSession.this.userId);
            }
        });
    }

    public void sendMessage(JsonObject message) throws IOException {
        this.sendMessage(message.toString());
    }

    public void sendMessage(String message) throws IOException {
        log.debug("USER {}: Sending message {}", userId, message);
        synchronized (session) {
            session.sendMessage(new TextMessage(message));
        }
    }

    public void addCandidate(IceCandidate candidate, String name) {
        if (this.userId.compareTo(name) == 0) {
            outgoingMedia.addIceCandidate(candidate);
        } else {
            WebRtcEndpoint webRtc = incomingMedia.get(name);
            if (webRtc != null) {
                webRtc.addIceCandidate(candidate);
            }
        }
    }

    public LocalDateTime getCreatedDttm() {
        return this.createdDttm;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (!(obj instanceof UserSession)) {
            return false;
        }
        UserSession other = (UserSession) obj;
        return userId.equals(other.userId);
    }

    @Override
    public int hashCode() {
        return this.userId.hashCode();
    }
}
