import React, { useEffect } from 'react';
import './Homepage.css';
import TwitchStream from './TwitchStream';
import FA from 'react-fontawesome';
import $ from 'jquery';


function HelpModal() {
    return (
        <div className="modal fade" id="helpModal" tabIndex="-1" role="dialog" aria-labelledby="helpModalLabel" aria-hidden="true">
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
                      <span className='emphasis'>Random Twitchers Play</span> is a place where the Twitch community
                      passes one controller.
                  </p>

                  <p>
                      Every few minutes someone new enters the spotlight, and takes control of the same Nintendo Switch.
                      When the time has passed, the controls are passed to the next person in line.<br/>
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


function Homepage() {
    useEffect(() => {
        $('#helpModal').modal('show');
    });
    return (
    <div>
        <TwitchStream chat={false}/>
        <div className='button-div'>
            <button
                id='queue-button'
                type="button"
                data-toggle="modal"
                data-target="#helpModal"
                className="btn btn-lg btn-dark">
                    <FA name="question-circle" />
            </button>
            <button
                id='queue-button'
                type="button"
                className="btn btn-lg btn-dark">
                    Join Queue
            </button>
        </div>
        <HelpModal/>
    </div>
    );
}

export default Homepage;
