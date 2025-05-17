const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', ws => {
    console.log('WebSocket connection established');
    ws.on('message', message => {
        // Process incoming audio packets
        console.log('Received:', message);
    });
});
