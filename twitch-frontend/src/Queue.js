import './Queue.css';

import React, { useEffect, useState } from 'react';
import { getUserInfo } from "./apis";
import FA from 'react-fontawesome';
import TwitchStream from "./TwitchStream";
import { useParams } from 'react-router-dom';


function Queue(props) {
    const uuid = useParams().uuid;
    const [userInfo, setUserInfo] = useState(null);
    useEffect( () => {
        async function getUserFunc() {
            const newUserInfo = await getUserInfo(uuid);
            setUserInfo(newUserInfo || false);
        }
        getUserFunc();
    }, [uuid]);
    if (userInfo === null) {
        return (
            <div className='centered'>
                <FA name="spinner" pulse={true} spin={true} size='5x'/>
            </div>
        );
    }
    if (!userInfo) {
        return (
            <div className='centered'><div className='header'><h3>404 Invalid URL</h3></div></div>
        );
    }
    return (
        <div><TwitchStream chat={true}/></div>
    );
}

export default Queue;
