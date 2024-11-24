require('debug').enable('engine:ws,engine:socket,socket.io:*');
const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const cors = require('cors');
const bcrypt = require('bcrypt'); // Import bcrypt for password hashing
const pool = require('./db'); // Import database connection
const connectedUsers = {}; // Store connected users and their sockets
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
    },
    transports: ['websocket'], // Force WebSocket transport
    path: '/', // Change WebSocket path to root
});

app.use(cors());
app.use(express.json());

// Basic API Endpoint
app.get('/', (req, res) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(`HTTP Request from IP: ${clientIp}`);
    res.send('Chess MVP Backend is running!');
});

// Test Database Route
app.get('/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Database connection failed');
    }
});

// User Registration Endpoint
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if username is provided
        if (!username || !password) {
            return res.status(400).send('Username and password are required');
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert the new user into the database
        const result = await pool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
            [username, hashedPassword]
        );

        // Respond with the new user ID
        res.status(201).json({ userId: result.rows[0].id });
    } catch (err) {
        console.error(err.message);

        // Handle unique constraint violation
        if (err.code === '23505') {
            res.status(409).send('Username already exists');
        } else {
            res.status(500).send('Server error');
        }
    }
});

// Matchmaking Endpoint
app.post('/matchmaking', async (req, res) => {
    const { userId } = req.body;

    try {
        if (!userId) {
            return res.status(400).send('User ID is required');
        }

        // Find a random opponent who is not the requesting user
        const result = await pool.query(
            'SELECT id, username FROM users WHERE id != $1 ORDER BY RANDOM() LIMIT 1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).send('No opponent found');
        }

        // Respond with the opponent's details
        res.json({ opponent: result.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Matchmaking error');
    }
});

// WebSocket Connection
io.on('connection', (socket) => {
    const clientIp = socket.handshake.address;
    console.log(`WebSocket Connection from IP: ${clientIp}`);

    // Store the connected user
    socket.on('join', ({ userId }) => {
        connectedUsers[userId] = socket.id;
        console.log(`User ${userId} joined with socket ID: ${socket.id}`);
        console.log(`A client connected with socket ID: ${socket.id}`);
    });

    // Handle chat messages
    socket.on('chat', (message) => {
        console.log(`Chat message from User ${socket.id}: ${message}`);
        // Echo the message back to the client
        socket.emit('chat', `Server received: ${message}`);
    });

    // Handle move events (player sends a move)
    socket.on('move', ({ gameId, from, to }) => {
        console.log(`Move received for game ${gameId}: ${from} -> ${to}`);

        // Broadcast the move to the opponent
        const opponentSocketId = connectedUsers[gameId]; // Replace with actual opponent logic
        if (opponentSocketId) {
            io.to(opponentSocketId).emit('move', { from, to });
        } else {
            console.log('Opponent is not connected.');
        }
    });

    // Handle disconnects
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        for (const userId in connectedUsers) {
            if (connectedUsers[userId] === socket.id) {
                delete connectedUsers[userId];
                break;
            }
        }
    });
});

// WebSocket Test Endpoint
app.get('/websocket-check', (req, res) => {
    res.send('WebSocket server is active!');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
