import React from 'react';
import { TwitchEmbed } from 'react-twitch-embed';
import './TwitchStream.css';


const TwitchStream = (props) => {
    const args = Object.assign({}, props);
    args.chat = undefined;
    return (
        <div className='twitch-embedder'>
            <TwitchEmbed
                channel="RandomTwitchersPlay"
                theme="dark"
                layout="video"
                id="twitchWindow"
                muted={false}
                height=''
                withChat={props.chat}
                {...args}/>
        </div>
    );
}

export default TwitchStream;