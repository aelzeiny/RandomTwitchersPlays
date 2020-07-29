import React, {useEffect} from 'react';
import './Homepage.css';
import TwitchStream from './TwitchStream';

import $ from 'jquery';
// import { joinQueue, leaveQueue } from './apis';


function Homepage() {
    useEffect(() => {
        $('#helpModal').modal('show');
    });
    return (
        <div>
            <TwitchStream chat={false}/>
            <div className='home-section button-div'>
            </div>
        </div>
    );
}

export default Homepage;
