import './Authorize.css';

import React, {useEffect} from 'react';
import qs from 'qs';
import { authorize } from './apis';

import FA from 'react-fontawesome';
import Navbar from "./Navbar";

export default function Authorize(props) {
    const queryString = qs.parse(props.location.search, { ignoreQueryPrefix: true });

    useEffect( () => {
        const exitTimeout = () => props.history.push('/');
        if (!queryString.code)
            setTimeout(exitTimeout, 3000);
        else
            authorize(queryString.code)
                .then(exitTimeout)  // exit if authorized
                .catch(() => props.history.push('/authorize'));  // Tell user that didn't work if the API call failed
    }, [queryString, props]);

    if (!queryString.code) {
        return (
            <div className='authorize'>
                <Navbar/>
                <h1>Hmm, that didn't quite work</h1>
                <p>Redirecting you in 3 seconds</p>
            </div>
        );
    }

    return (
        <div className='authorize'>
            <Navbar/>
            <h1>Welcome Friend!</h1>
            <p>We'll redirect you back to the front page</p>

            <FA spin={true} pulse={true} size='5x' name='spinner' />
        </div>
    );
}