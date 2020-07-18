process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { createProxyMiddleware } = require("http-proxy-middleware");

/**
 * PROXY WEBSOCKETS
 */

module.exports = app => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const wsProxy = createProxyMiddleware('/traffic', {
        target: 'http://localhost:8443',
        ws: true, // enable websocket proxy
        logLevel: 'debug',
        onError: err => console.log(err)
    });
    app.use(wsProxy);
}

