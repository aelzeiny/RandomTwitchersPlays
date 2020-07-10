import React from 'react';
import './App.css';
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import Homepage from './Homepage';
import Queue from './Queue';
import Play from './Play';


function App() {
    return (
    <Router>
        <div className="app">
            <div>
                <h1 className='title'>Random Twitchers <br/>Play</h1>
            </div>
            <Switch>
                <Route path="/queue/:uuid" render={() => <Queue/>}/>
                <Route path="/play/:uuid" render={() => <Play/>}/>
                <Route path="/" render={() => <Homepage/>}/>
            </Switch>
        </div>
    </Router>
    );
}

export default App;
