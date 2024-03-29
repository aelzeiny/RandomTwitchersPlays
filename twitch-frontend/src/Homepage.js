import React from 'react';
import './Homepage.css';

import {AnimationOnScroll} from 'react-animation-on-scroll';

import TwitchStream from './TwitchStream';
import Navbar from "./Navbar";
import { joinQueue, redirectToOauth } from './apis';

import twitchIcon from './img/twitch_icon.png';
import incognito from './img/incognito.png';
import ControlsModal from "./gamepad/ControlsModal";
import GamepadDisplay from "./gamepad/GamepadDisplay";
import { switchObservable } from "./gamepad/gamepadApi";


function Homepage(props) {
    const joinCallback = (e) => {
        e.target.setAttribute('disabled', true);
        joinQueue().then(({data}) => {
            props.history.push(`/queue?username=${data.payload.username}`);
        }).catch(redirectToOauth);
    };

    return (
        <div>
            <Navbar buttonText='join' callback={joinCallback} />
            <TwitchStream chat={false} />
            <section className='home-section' style={{ color: 'white' }}>
                <div className='container-lg'>
                    <AnimationOnScroll animateIn="animate__fadeInLeft" animateOnce={true}>
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
                                <GamepadDisplay observable={switchObservable} />
                                <ControlsModal />
                            </div>
                        </div>
                    </AnimationOnScroll>
                </div>
            </section>
            {/*<section className='home-section' style={{color: 'white'}}>*/}
            {/*    <div className='container-lg'>*/}
            {/*        <AnimationOnScroll animateIn="animate__fadeInRight" animateOnce={true}>*/}
            {/*            <h3>Strangers in Queue</h3>*/}
            {/*            <p>There are <span>__</span> people in line to play. Each player plays for 15 minutes.</p>*/}
            {/*        </AnimationOnScroll>*/}
            {/*    </div>*/}
            {/*</section>*/}
            <section className='home-section' style={{ color: 'white' }}>
                <div className='container-lg'>
                    <AnimationOnScroll animateIn="animate__fadeInRight" animateOnce={true}>
                        <h3>Anyone Can Play</h3>
                        <div className='row'>
                            <div className='col-md-4'>
                                <img src={incognito} alt='anyone' />
                            </div>
                            <div className='col-md-8'>
                                <p>
                                    <span className='emphasis'>Twitch Arena</span> is a place where the Twitch community
                                    passes one controller.
                                </p>

                                <p>
                                    Every few minutes someone new enters the spotlight, and takes control of the same Nintendo
                                    Switch.
                                    When their time passes, the controls are passed to the next person in line.<br />
                                </p>

                                {/* <p>
                                    But there's a twist. There are 3 people controlling the same Switch at the same time. These
                                    players
                                    must collaborate via voice-chat in order to accomplish their objectives.
                                </p> */}

                                <p>
                                    People from all around the globe embark on the same journey, and complete it together.
                                </p>
                            </div>
                        </div>
                    </AnimationOnScroll>
                </div>
            </section>
            <section className='home-section' style={{ color: 'white' }}>
                <div className='container-lg'>
                    <AnimationOnScroll animateIn="animate__fadeInLeft" animateOnce={true}>
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
                                <img src={twitchIcon} alt='sidebar' />
                            </div>
                        </div>
                    </AnimationOnScroll>
                </div>
            </section>
        </div>
    );
}

export default Homepage;
