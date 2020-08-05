import React  from 'react';
import FA from 'react-fontawesome';
import ControllerImg from '../img/controller_labeled.png';


export default function ControlsModal() {
    return (
        <div className="controls-dialog">
            <div className="modal fade" id="controlsModal" tabIndex="-1" role="dialog" aria-labelledby="controlsModalLabel"
                 aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="controlsModalLabel">Keyboard Controls</h5>
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <img style={{width: '100%'}} src={ControllerImg} alt='controller-diagram'/>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>

            <button
                type="button"
                data-toggle="modal"
                data-target="#controlsModal"
                style={{fontFamily: 'Twitchy'}}
                className="btn btn-outline-primary">
                Controls <FA name="gamepad"/>
            </button>
        </div>
    );
}