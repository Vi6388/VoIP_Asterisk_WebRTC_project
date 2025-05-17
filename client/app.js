const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 7000 });

wss.on('connection', (ws) => {

    ws.on('open', () => {
    console.log('Connected to audio server');
    });

    ws.on('message', data => {
    console.log('Received audio frame:', data);
    // Process or play the audio frame here
    });

    ws.on('close', () => {
    console.log('Disconnected from audio server');
    });
});
