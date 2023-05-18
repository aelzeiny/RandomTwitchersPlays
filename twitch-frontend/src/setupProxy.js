const { createProxyMiddleware } = require("http-proxy-middleware");
/**
 * PROXY WEBSOCKETS
 */


module.exports = app => {
    const wsProxy = createProxyMiddleware('/traffic', {
        target: 'http://localhost:8443',
        ws: true, // enable websocket proxy
        logLevel: 'debug',
        onError: err => console.error(err)
    });
    const lambdaProxy = createProxyMiddleware('/api', {
        target: `http://localhost:5001`,
        // target: 'http://localhost:5001',
        // pathRewrite: (path, _) => path.replace('/api', ''),
        changeOrigin: true,
        logLevel: 'debug',
        onError: err => console.error(err)
    });
    const lambdaWsProxy = createProxyMiddleware('/ws', {
        target: 'ws://localhost:5001/ws',
        // changeOrigin: true,
        prependPath: false,
        ws: true,
        logLevel: 'debug',
        secure: false,
        onError: err => console.error(err)
    });
    app.use(wsProxy);
    app.use(lambdaProxy);
    app.use(lambdaWsProxy);
}

