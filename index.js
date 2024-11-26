require("debug").enable("engine:ws,engine:socket,socket.io:*");
const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const cors = require("cors");
const bcrypt = require("bcrypt"); // Import bcrypt for password hashing
const pool = require("./db"); // Import database connection
const connectedUsers = {}; // Store connected users and their sockets
const matchmakingQueue = []; // Queue for users waiting for matchmaking
const activeGames = {}; // Store active games and their player associations
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow requests from any origin
  },
  transports: ["websocket"], // Force WebSocket transport
  path: "/", // Change WebSocket path to root
});

app.use(cors());
app.use(express.json());

// Basic API Endpoint
app.get("/", (req, res) => {
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  console.log(`HTTP Request from IP: ${clientIp}`);
  res.send("Chess MVP Backend is running!"); // Respond with a basic message
});

// Test Database Route
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows[0]); // Return the current timestamp from the database
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Database connection failed");
  }
});

// User Registration Endpoint
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).send("Username and password are required");
    }

    const salt = await bcrypt.genSalt(10); // Generate salt for hashing
    const hashedPassword = await bcrypt.hash(password, salt); // Hash the password

    const result = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id",
      [username, hashedPassword]
    );

    res.status(201).json({ userId: result.rows[0].id }); // Return the new user ID
  } catch (err) {
    console.error(err.message);

    if (err.code === "23505") {
      res.status(409).send("Username already exists"); // Handle unique constraint violation
    } else {
      res.status(500).send("Server error");
    }
  }
});

// Matchmaking Endpoint
app.post("/matchmaking", async (req, res) => {
  const { userId } = req.body;

  try {
    if (!userId) {
      return res.status(400).send("User ID is required");
    }

    const result = await pool.query(
      "SELECT id, username FROM users WHERE id != $1 ORDER BY RANDOM() LIMIT 1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("No opponent found");
    }

    res.json({ opponent: result.rows[0] }); // Return the opponent's details
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Matchmaking error");
  }
});

// WebSocket Connection
io.on("connection", (socket) => {
  const clientIp = socket.handshake.address; // Get client IP address
  console.log(`WebSocket Connection from IP: ${clientIp}`);

  // Handle user joining the server
  socket.on("join", ({ userId }) => {
    connectedUsers[userId] = socket.id; // Map user ID to socket ID
    console.log(`User ${userId} joined with socket ID: ${socket.id}`);
    console.log(`A client connected with socket ID: ${socket.id}`);

    matchmakingQueue.push({ userId, socketId: socket.id }); // Add user to matchmaking queue

    // Matchmaking logic: Match two players if the queue has at least two users
    while (matchmakingQueue.length >= 2) {
      const player1 = matchmakingQueue.shift();
      const player2 = matchmakingQueue.shift();

      const gameId = `${player1.userId}-${player2.userId}`; // Create a unique game ID
      activeGames[gameId] = {
        player1: player1.userId,
        player2: player2.userId,
      }; // Store the game details

      console.log(`Matched ${player1.userId} with ${player2.userId}`);
      console.log(`Game created: ${gameId}`);

      // Notify both players about their match
      io.to(player1.socketId).emit("matchFound", {
        opponentId: player2.userId,
        gameId,
      });
      io.to(player2.socketId).emit("matchFound", {
        opponentId: player1.userId,
        gameId,
      });
    }
  });

  // Handle move events // KK
  socket.on("move", ({ gameId, from, to }) => {
    console.log(`Move received for game ${gameId}: ${from} -> ${to}`);

    const game = activeGames[gameId]; // Retrieve game details
    if (game) {
      const opponentSocketId =
        connectedUsers[game.player1] === socket.id
          ? connectedUsers[game.player2]
          : connectedUsers[game.player1]; // Determine opponent's socket ID

      if (opponentSocketId) {
        io.to(opponentSocketId).emit("move", { from, to }); // Send move to opponent
        console.log(`Move broadcasted to opponent: ${opponentSocketId}`); // KK
      } else {
        console.log("Opponent is not connected."); // KK
      }
    } else {
      console.log("Invalid game ID."); // KK
      socket.emit("error", { message: "Invalid game ID" }); // Notify user of invalid game ID // KK
    }
  });

  // Handle chat messages
  socket.on("chat", (message) => {
    console.log(`Chat message from User ${socket.id}: ${message}`);
    socket.emit("chat", `Server received: ${message}`); // Echo the message back to the client
  });

  // Handle disconnects and end game // KK
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    for (const userId in connectedUsers) {
      if (connectedUsers[userId] === socket.id) {
        delete connectedUsers[userId]; // Remove user from connected users
        break;
      }
    }

    // Remove user from matchmaking queue
    const index = matchmakingQueue.findIndex(
      (user) => user.socketId === socket.id
    );
    if (index !== -1) {
      matchmakingQueue.splice(index, 1); // Remove from queue
    }

    // Remove games involving the disconnected player
    for (const gameId in activeGames) {
      const game = activeGames[gameId];
      if (
        connectedUsers[game.player1] === socket.id ||
        connectedUsers[game.player2] === socket.id
      ) {
        delete activeGames[gameId]; // Delete the game
        console.log(`Game ${gameId} ended due to player disconnect.`);

        const opponentSocketId =
          connectedUsers[game.player1] === socket.id
            ? connectedUsers[game.player2]
            : connectedUsers[game.player1]; // Determine opponent's socket ID

        if (opponentSocketId) {
          io.to(opponentSocketId).emit("gameEnded", {
            message: "Your opponent has disconnected.",
          }); // Notify opponent of disconnection // KK
        }
      }
    }
  });
});

// WebSocket Test Endpoint
app.get("/websocket-check", (req, res) => {
  res.send("WebSocket server is active!");
});

const PORT = process.env.PORT || 5000; // Define the port number
server.listen(PORT, () => console.log(`Server running on port ${PORT}`)); // Start the server
