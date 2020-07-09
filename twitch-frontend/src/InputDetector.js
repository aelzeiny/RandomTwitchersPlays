import React from 'react';
import controller from './img/controller.png';


class InputDetector extends React.Component {
    constructor(props) {
        super(props);
        this.canvas = React.createRef();
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        const canvas = this.canvas.current;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(controller, 10, 10);
        ctx.beginPath();
        ctx.arc(100, 75, 50, 0, 2 * Math.PI);
        ctx.stroke();
    }

    render() {
        return (
            <canvas ref={this.canvas} width={300} height={300}/>
        );
    }
}

export default InputDetector;