import React, { useState } from 'react';
import './Present.css';

import Base64 from 'crypto-js/enc-base64';
import HmacSHA256 from 'crypto-js/hmac-sha256';
import Navbar from "./Navbar";
import Room from "./Room";


const encodeBase64 = (value, padding) => {
    const encoded = window.btoa(window.unescape(window.encodeURIComponent(value)));
    if (!padding)
        return encoded.replace(/=+$/, '');
    return encoded;
};

const toJwt = (message, secret) => {
    const header = encodeBase64(JSON.stringify({alg: "HS256", typ: "JWT"}));
    const payload = encodeBase64(JSON.stringify(message));
    let signature = Base64.stringify(
        HmacSHA256(header + '.' + payload, secret)
    );
    // base64 -> base64URL
    signature = signature.split('+').join('-')
        .split('/').join('_')
        .replace(/(=+$)/g, "");
    return `${header}.${payload}.${signature}`;
}


export default function Present () {
    const [secret, setSecret] = useState('');
    const [proxy, setProxy] = useState('ws://localhost:9999');
    const [wsPair, setWsPair] = useState({ main: undefined, proxy: undefined });

    const name = '!PRESENTER';

    const onMessageCallback = ({id, commonInput}) => {
        if (id === 'switchInput')
            wsPair.proxy.sendMessage(commonInput);
    };

    const connect = (e) => {
        const btn = e.target;
        btn.setAttribute('disabled', true);
        const jwt = toJwt({name: name}, secret);
        const wsx = new WebSocket('wss://' + window.location.host + `/traffic?jwt=${jwt}`);
        const wsProxy = new WebSocket(proxy);
        let pingInterval = setInterval(() => {
            if (wsx.readyState === WebSocket.OPEN)
                wsx.sendMessage({id: 'ping'})
        }, 10 * 60 * 1000);

        wsx.onclose = (err) => {
            btn.removeAttribute('disabled');
            console.error('we out', err);
            if (pingInterval)
                clearInterval(pingInterval);
        };

        setWsPair({main: wsx, proxy: wsProxy});
    }

    return (
        <div>
            <Navbar/>
            <div className='container present-div'>
                <div className="row form-group">
                    <div className="col-lg-5">
                        <label htmlFor="proxyInput">Proxy</label>
                        <input type="text"
                               className="form-control"
                               id="proxyInput"
                               placeholder="ws://localhost:9999"
                               value={proxy}
                               onChange={(e) => setProxy(e.target.value)}/>
                    </div>
                    <div className="col-lg-6">
                        <label htmlFor="secretInput">256-bit Secret Key</label>
                        <input type="password"
                               className="form-control"
                               id="secretInput"
                               placeholder="Super Secret Key"
                               value={secret}
                               onChange={(e) => setSecret(e.target.value)}/>
                    </div>
                    <div className="col-lg-1" id="connect-div">
                        <button type="button"
                                className="btn btn-primary"
                                onClick={connect}>Connect</button>
                    </div>
                </div>
            </div>
            {wsPair.main && <Room
                id={name}
                isPresenter={true}
                ws={wsPair.main}
                onMessageCallback={onMessageCallback}/>}
        </div>
    )
}
