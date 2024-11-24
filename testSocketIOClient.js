const io = require('socket.io-client');

const socket = io('ws://localhost:5000', {
    transports: ['websocket'], // Force WebSocket transport
});

socket.on('connect', () => {
    console.log('Successfully connected to the WebSocket server!');
    console.log(`Socket ID: ${socket.id}`);

    // Emit a "join" event with an example userId
    socket.emit('join', { userId: 1 });

    // Send a test chat message to the server
    socket.emit('chat', 'Hello from the client!');
});

socket.on('connect_error', (err) => {
    console.error('Connection error:', err.message);
});

socket.on('disconnect', () => {
    console.log('Disconnected from the server.');
});

// Add a listener for incoming messages
socket.on('message', (data) => {
    console.log('Message from server:', data);
});

// Listen for chat responses from the server
socket.on('chat', (response) => {
    console.log('Chat response from server:', response);
});
