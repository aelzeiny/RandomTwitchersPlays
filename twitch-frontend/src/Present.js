import React, { useState } from 'react';
import './Present.css';

import Navbar from "./Navbar";
import Room from "./Room";
import { openPresenterConnection, getTrafficURL, present } from "./apis";


const SUPER_SECRET_STORAGE_KEY = "_SUPER_SECRET";


export default function Present () {
    const [secret, setSecret] = useState(window.localStorage.getItem(SUPER_SECRET_STORAGE_KEY) || "");
    const [proxy, setProxy] = useState('ws://127.0.0.1:9999');
    const [wsPair, setWsPair] = useState({ main: undefined, proxy: undefined });

    const name = '!PRESENTER';

    const onMessageCallback = ({id, commonInput}) => {
        if (id === 'switchInput')
            wsPair.proxy.sendMessage({id: 'switchInput', input: commonInput});
    };

    const connect = async (e) => {
        window.localStorage.setItem(SUPER_SECRET_STORAGE_KEY, secret);
        const btn = e.target;
        btn.setAttribute('disabled', true);
        await present(secret);
        const wsx = openPresenterConnection();
        const wsProxy = new WebSocket(proxy);
        let pingInterval = setInterval(() => {
            if (wsx.readyState === WebSocket.OPEN)
                wsx.sendMessage({id: 'ping'});
            if (wsProxy.readyState === WebSocket.OPEN)
                wsProxy.sendMessage({id: 'ping'});
        }, 10 * 60 * 1000);

        const closeEvent = (err) => {
            btn.removeAttribute('disabled');
            console.error('we out', err);
            if (pingInterval)
                clearInterval(pingInterval);
            setWsPair({main: undefined, proxy: undefined});
        };
        wsx.onclose = (err) => {
            console.error('main close');
            if (wsProxy.readyState === WebSocket.OPEN)
                wsProxy.close();
            closeEvent(err);
        };
        wsProxy.onclose = (err) => {
            console.error('proxy close');
            if (wsx.readyState === WebSocket.OPEN)
                wsx.close();
            closeEvent(err);
        }
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
