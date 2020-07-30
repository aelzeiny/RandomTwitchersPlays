import './Navbar.css';

import React, { createRef } from "react";
import FA from "react-fontawesome";


function HelpModal() {
    return (
        <div className="modal fade" id="helpModal" tabIndex="-1" role="dialog" aria-labelledby="helpModalLabel"
             aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title" id="helpModalLabel">What is this?</h5>
                        <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div className="modal-body">
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
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
}


export default function Navbar({ buttonText, callback}) {
    const textButton = createRef();
    const modCallback = (...args) => {
        textButton.current.setAttribute('disabled', true);
        callback(...args);
    }
    return (
        <div className='navbar-offset'>
            <HelpModal/>
            <nav id='arena-navbar' className="navbar fixed-top navbar-dark bg-dark bg-roulette">
                <div className='container'>
                    <a className="navbar-brand title" href='/'>Twitch Roulette</a>
                    <div className='nav-buttons'>
                        <button
                            id='queue-button'
                            type="button"
                            data-toggle="modal"
                            data-target="#helpModal"
                            className="btn btn-dark">
                            <FA name="question-circle"/>
                        </button>
                        {buttonText && <button ref={textButton}
                                                         className="btn btn-outline-primary join-btn"
                                                         type="submit"
                                           onClick={modCallback}>
                            {buttonText}
                        </button>}
                    </div>
                </div>
            </nav>
        </div>
    );
};