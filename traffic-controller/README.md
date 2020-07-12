# Traffic Controller Backend

### Purpose
This web & websocket server handles active communication while the Broadcaster handles idle communication.
server. This includes handshakes between the client's browser and the Kurento WebRTC server.
Controller communication is proxied through websockets on this server, and to the HomePC. 

### Responsibilites:
* WebSocket APIs that allow Client Browsers to handshake with the Kurento Media Server.
* WebSocket APIs that allows for Client browsers to pass inputs to the credentialed Home PC; which passes it to the Switch.
* HTTP APIs that allows credentialed admins to GET & POST active users.
* When a new authorized client connects, an old client that is not on the whitelist is kicked.
* Block any unauthorized Traffic.
* Be performant

### Giving Credit:
To the awesome people @ kurento; especially Ivan Gracia (izanmail@gmail.com); who's tutorial was forked to make this
repo.