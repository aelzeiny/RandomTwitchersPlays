package live.twitch.arena;

import org.kurento.client.KurentoClient;
import org.springframework.beans.factory.annotation.Autowired;

public class RoomManager {

    @Autowired
    private KurentoClient kurento;

    public Room getRoom() {
        Room room = Room.getInstance();
        if (room == null)
            room = new Room(kurento.createMediaPipeline());
        return room;
    }
}
