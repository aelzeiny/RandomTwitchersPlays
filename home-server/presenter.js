const TIMEOUT_SECONDS = 60;

let ws;
let webRtcPeer;
let lastMessage = new Date();

function main(mediaServerURL) {
    ws = new WebSocket(mediaServerURL);
    ws.onmessage = onSocketMessage;
    ws.sendMessage = (message) => {
        // ENCODE ALL OUTGOING MESSAGES AS A JWT
        const header = window.encodeBase64(JSON.stringify({alg: "HS256", typ: "JWT"}));
        const payload = window.encodeBase64(JSON.stringify(message));
        let signature = CryptoJS.enc.Base64.stringify(
            CryptoJS.HmacSHA256(header + '.' + payload, window.superSecret)
        );
        // base64 -> base64URL
        signature = signature.split('+').join('-')
            .split('/').join('_')
            .replace(/(=+$)/g, "");
        console.log('sending message');
        ws.send(JSON.stringify({
            user: 'presenter',
            jwt: `${header}.${payload}.${signature}`
        }));
    };
    let video = document.getElementById('video');
    let options = {localVideo: video, onicecandidate: onIceCandidate};

    webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function (error) {
        if (error) return onError(error);

        this.generateOffer((error, offerSdp) => {
            if (error)
                return onError(error);

            ws.sendMessage({
                id: 'presenter',
                sdpOffer: offerSdp
            });
        });
    });
}

function healthCheck() {
    return !(!lastMessage || !webRtcPeer || !ws || (new Date() - lastMessage) / 1000 > TIMEOUT_SECONDS);
}

function onSocketMessage(message) {
    lastMessage = new Date();
    const parsedMessage = JSON.parse(message.data);
    switch (parsedMessage.id) {
        case 'presenterResponse':
            presenterResponse(parsedMessage);
            break;
        case 'stopCommunication':
            dispose();
            break;
        case 'iceCandidate':
            webRtcPeer.addIceCandidate(parsedMessage.candidate)
            break;
    }
}

window.onbeforeunload = function () {
    if (ws)
        ws.close();
}

function presenterResponse(message) {
    if (message.response !== 'accepted') {
        dispose();
    } else {
        webRtcPeer.processAnswer(message.sdpAnswer);
    }
}

function onIceCandidate(candidate) {
    ws.sendMessage({
        id: 'onIceCandidate',
        candidate: candidate
    });
}

function stop() {
    if (webRtcPeer) {
        var message = {id: 'stop'};
        ws.sendMessage(message);
        dispose();
    }
}

function dispose() {
    if (webRtcPeer) {
        webRtcPeer.dispose();
        webRtcPeer = null;
    }
}

main('wss://localhost:8443/handshake');