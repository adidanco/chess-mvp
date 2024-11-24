const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:5000');

ws.on('open', () => {
    console.log('Connected to WebSocket server');
});

ws.on('message', (message) => {
    console.log('Message from server:', message);
});

ws.on('error', (error) => {
    console.error('WebSocket Error:', error);
});

ws.on('close', () => {
    console.log('WebSocket connection closed');
});
