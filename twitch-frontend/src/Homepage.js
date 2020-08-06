import React, { useEffect } from 'react';
import './Homepage.css';

import ScrollAnimation from 'react-animate-on-scroll';
import $ from 'jquery';

import TwitchStream from './TwitchStream';
import Navbar from "./Navbar";
import { joinQueue } from './apis';

import twitchIcon from './img/twitch_icon.png';
import incognito from './img/incognito.png';
import ControlsModal from "./gamepad/ControlsModal";
import GamepadDisplay from "./gamepad/GamepadDisplay";
import {switchObservable} from "./gamepad/gamepadApi";


function Homepage(props) {
    useEffect(() => {
        $('#helpModal').modal('show');
    });

    const joinCallback = (e) => {
        e.target.setAttribute('disabled', true);
        joinQueue().then(() => {
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
            <section className='home-section' style={{color: 'white'}}>
                <div className='container-lg'>
                    <ScrollAnimation animateIn="animate__fadeInLeft" animateOnce={true}>
                        <h3>Strangers on Stream</h3>
                        <div className='row'>
                            <div className='col-md-8'>
                                <p><span>3 strangers</span> are sharing <span>1</span> controller on <span>1</span> Nintendo Switch</p>
                                <p><span>3 strangers</span> are put together in a video chat room</p>
                                <p><span>3 strangers</span> all fighting for control</p>
                                <p>The chaos is streamed live on Twitch</p>
                                <p>(try pressing W/A/S/D now)</p>
                            </div>
                            <div className='col-md-4' id='homepage-controller'>
                                <GamepadDisplay observable={switchObservable}/>
                                <ControlsModal/>
                            </div>
                        </div>
                    </ScrollAnimation>
                </div>
            </section>
            {/*<section className='home-section' style={{color: 'white'}}>*/}
            {/*    <div className='container-lg'>*/}
            {/*        <ScrollAnimation animateIn="animate__fadeInRight" animateOnce={true}>*/}
            {/*            <h3>Strangers in Queue</h3>*/}
            {/*            <p>There are <span>__</span> people in line to play. Each player plays for 15 minutes.</p>*/}
            {/*        </ScrollAnimation>*/}
            {/*    </div>*/}
            {/*</section>*/}
            <section className='home-section' style={{color: 'white'}}>
                <div className='container-lg'>
                    <ScrollAnimation animateIn="animate__fadeInLeft" animateOnce={true}>
                        <h3>Anyone Can Play</h3>
                        <div className='row'>
                            <div className='col-md-4'>
                                <img src={incognito} alt='anyone'/>
                            </div>
                            <div className='col-md-8'>
                                <p>
                                    <span className='emphasis'>Twitch Arena</span> is a place where the Twitch community
                                    passes one controller.
                                </p>

                                <p>
                                    Every few minutes someone new enters the spotlight, and takes control of the same Nintendo
                                    Switch.
                                    When their time passes, the controls are passed to the next person in line.<br/>
                                </p>

                                <p>
                                    But there's a twist. There are 3 people controlling the same Switch at the same time. These
                                    players
                                    must collaborate via voice-chat in order to accomplish their objectives.
                                </p>

                                <p>
                                    People from all around the globe embark on the same journey, and complete it together.
                                </p>
                            </div>
                        </div>
                    </ScrollAnimation>
                </div>
            </section>
            <section className='home-section' style={{color: 'white'}}>
                <div className='container-lg'>
                    <ScrollAnimation animateIn="animate__fadeInRight" animateOnce={true}>
                        <div className='row'>
                            <div className='col-md-8'>
                                <h3>Live on Twitch</h3>
                                <p>The chaos is streamed LIVE on Twitch for your enjoyment!</p>
                                <p>A ChatBot will be your guide. Chat with using these commands:</p>
                                <ul>
                                    <li><span>!JOIN</span> to enter Queue</li>
                                    <li><span>!LEAVE</span> to exit Queue</li>
                                    <li><span>!POSITION @[user]</span> to get position in Queue</li>
                                    <li><span>!KICK @[user]</span> to call a vote that kicks a stranger from stream</li>
                                    <li><span>!CHEER @[user]</span> to give a stranger more time</li>
                                    <li><span>!HELP</span> for more commands</li>
                                </ul>
                            </div>
                            <div className='col-md-4'>
                                <img src={twitchIcon} alt='sidebar'/>
                            </div>
                        </div>
                    </ScrollAnimation>
                </div>
            </section>
        </div>
    );
}

export default Homepage;
