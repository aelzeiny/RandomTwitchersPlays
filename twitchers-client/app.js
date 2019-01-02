const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const webrtc = require('./routes/webrtc');

const app = express();

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ROUTES
app.use('/webrtc/', webrtc);

app.listen(3000, () => {
    console.log('Random Twitchers Play Client is listening...');
});
