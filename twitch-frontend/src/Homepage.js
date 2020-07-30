import React, {useEffect} from 'react';
import './Homepage.css';
import TwitchStream from './TwitchStream';

import $ from 'jquery';
import Navbar from "./Navbar";
import { joinQueue } from './apis';


function Homepage(props) {
    useEffect(() => {
        $('#helpModal').modal('show');
    });

    const joinCallback = (e) => {
        e.target.setAttribute('disabled', true);
        joinQueue().then(data => {
            props.history.push('/queue');
        }).catch(err => {
            const { response } = err;
            if (response && response.status === 401 && response.data.clientId) {
                const redirectUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${response.data.clientId}&redirect_uri=${window.location.origin}/authorize&response_type=code&scope=openid&claims={"id_token":{"preferred_username":null, "picture":null},"userinfo":{"picture":null, "preferred_username":null}}`;
                window.location.replace(redirectUrl);
            }
        });
    };

    return (
        <div>
            <Navbar buttonText='join' callback={joinCallback}/>
            <TwitchStream chat={false}/>
            <div className='home-section button-div'>
                <p>Lorem Ipsum Garbage</p>
            </div>
        </div>
    );
}

export default Homepage;
