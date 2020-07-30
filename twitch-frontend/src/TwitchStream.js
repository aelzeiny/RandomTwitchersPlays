import React from 'react';
import {TwitchPlayer, TwitchEmbed} from 'react-twitch-embed';
import './TwitchStream.css';


const TwitchStream = (props) => {
    const Player = props.chat ? TwitchEmbed : TwitchPlayer;
    return (
        <div className='twitch-embedder'>
            <Player
                channel="RandomTwitchersPlay"
                theme="dark"
                layout="video"
                id="twitchWindow"
                muted={false}
                height=''
                {...props}
            />
        </div>
    );
}

export default TwitchStream;