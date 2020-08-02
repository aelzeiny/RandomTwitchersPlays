const { createProxyMiddleware } = require("http-proxy-middleware");
/**
 * PROXY WEBSOCKETS
 */


module.exports = app => {
    const wsProxy = createProxyMiddleware('/traffic', {
        target: 'http://localhost:8443',
        ws: true, // enable websocket proxy
        logLevel: 'debug',
        onError: err => console.log(err)
    });
    const lambdaProxy = createProxyMiddleware('/lambda', {
        target: `https://fhfgpzs40f.execute-api.us-east-1.amazonaws.com/dev`,
        changeOrigin: true,
        prependPath: false,
        onProxyReq: (proxyReq, req, res) => {
            proxyReq.path = proxyReq.path.replace('/lambda', '');
            req.url = req.url.replace('/lambda', '');
            console.log(req.url);
        },
        onOpen: e => console.log('open', e),
        onError: err => console.log(err)
    });
    const lambdaWsProxy = createProxyMiddleware('/lambda_ws', {
        target: 'wss://nq8v1ckz81.execute-api.us-east-1.amazonaws.com/dev',
        // changeOrigin: true,
        prependPath: false,
        ws: true,
        logLevel: 'debug',
        secure: false,
        onError: err => console.log(err)
    });
    app.use(wsProxy);
    app.use(lambdaProxy);
    app.use(lambdaWsProxy);
}

