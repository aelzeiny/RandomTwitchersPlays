import React from 'react';
import {TwitchPlayer, TwitchEmbed} from 'react-twitch-embed';
import './TwitchStream.css';


const TwitchStream = (props) => {
    const Player = props.chat ? TwitchEmbed : TwitchPlayer;
    return (
        <div className='twitch-embedder'>
            <Player
                channel="RandomTwitchersPlay"
                id="aelzeiny"
                theme="dark"
                layout="video"
                muted={false}
            />
        </div>
    );
}

export default TwitchStream;