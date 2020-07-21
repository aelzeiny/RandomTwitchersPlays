import React from 'react';
import './App.css';
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import Homepage from './Homepage';
import Queue from './Queue';
import Play from './Play';
import Present from './Present';


function App() {
    return (
    <Router>
        <div className="app">
            <div>
                <h1 className='title'>Twitch Arena</h1>
            </div>
            <Switch>
                <Route path="/queue/:uuid" render={(props) => <Queue {...props}/>}/>
                <Route path="/play/:uuid" render={(props) => <Play {...props}/>}/>
                <Route path="/present" render={(props) => <Present {...props}/>}/>
                <Route path="/" render={(props) => <Homepage {...props}/>}/>
            </Switch>
        </div>
    </Router>
    );
}

export default App;
