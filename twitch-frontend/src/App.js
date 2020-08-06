import React from 'react';
import './App.css';
import "animate.css/animate.min.css";

import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import Homepage from './Homepage';
import Queue from './Queue';
import Play from './Play';
import Present from './Present';
import Authorize from './Authorize';


function App() {
    return (
    <Router>
        <div className="app">
            <Switch>
                <Route path="/queue" render={(props) => <Queue {...props}/>}/>
                <Route path="/play" render={(props) => <Play {...props}/>}/>
                <Route path="/present" render={(props) => <Present {...props}/>}/>
                <Route path="/authorize" render={(props) => <Authorize {...props}/>}/>
                <Route path="/" render={(props) => <Homepage {...props}/>}/>
            </Switch>
        </div>
    </Router>
    );
}

export default App;
