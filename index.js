require("debug").enable("engine:ws,engine:socket,socket.io:*");
const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt"); // Import bcrypt for password hashing
const { Pool } = require("pg");
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "chess_mvp",
  password: "aatithya123",
  port: 5432,
});
//const pool = require("./db"); // Import database connection
const connectedUsers = {}; // Store connected users and their sockets
const matchmakingQueue = []; // Queue for users waiting for matchmaking
const activeGames = {}; // Store active games and their player associations
const disconnectedUsers = {}; // KK: Track disconnected users with a timeout for reconnection
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Allow requests from any origin
    methods: ["GET", "POST"],
  },
  transports: ["websocket"], // Force WebSocket transport
  path: "/", // Change WebSocket path to root
});

console.log("Initial State: connectedUsers =", connectedUsers);
console.log("Initial State: matchmakingQueue =", matchmakingQueue);
console.log("Initial State: disconnectedUsers =", disconnectedUsers);

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
  console.log('Incoming registration:', req.body);
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    //const salt = await bcrypt.genSalt(10); // Generate salt for hashing
    //const hashedPassword = await bcrypt.hash(password, salt); // Hash the password

    const result = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id",
      [username, password] //hashedPassword]
    );
    const userId = result.rows[0].id;
    res.status(201).json({ userId });
    //res.status(201).json({ userId: result.rows[0].id }); // Return the new user ID
  } catch (err) {
    console.error("Database error during registration:", err.message);

    if (err.code === "23505") {
      res.status(400).send("Username already exists"); // Handle unique constraint violation
    } else {
      console.error(err);
      res.status(500).send("Internal Server error");
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
  socket.on("join", async ({ userId }) => {
    console.log(
      `JOIN: User ${userId} attempting to join with socket ID: ${socket.id}`
    );
    console.log(`JOIN: Current connected users:`, connectedUsers);

    if (connectedUsers[userId]) {
      console.log(`JOIN: User ${userId} is already connected. Ignoring join.`);
      return;
    }

    connectedUsers[userId] = socket.id; // Map user ID to socket ID
    console.log(`JOIN: User ${userId} added to connected users.`);

    // Remove user from disconnectedUsers if reconnecting
    if (disconnectedUsers[userId]) {
      clearTimeout(disconnectedUsers[userId].timeout);
      delete disconnectedUsers[userId];
      console.log(`JOIN: User ${userId} reconnected.`);
    }

    matchmakingQueue.push({ userId, socketId: socket.id }); // Add user to matchmaking queue

    // Matchmaking logic: Match two players if the queue has at least two users
    while (matchmakingQueue.length >= 2) {
      const player1 = matchmakingQueue.shift();
      const player2 = matchmakingQueue.shift();

      const gameId = `${player1.userId}-${player2.userId}`; // Create a unique game ID

      try {
        const existingGame = await pool.query(
          "SELECT * FROM games WHERE game_id = $1",
          [gameId]
        );

        if (existingGame.rows.length > 0) {
          console.log("JOIN: Game already exists. Skipping new game creation.");
          return;
        }
      } catch (err) {
        console.error(
          `JOIN: Error checking existing game for players ${player1.userId} and ${player2.userId}: ${err.message}`
        );
        continue; // Skip this matchmaking pair if there's an error
      }

      activeGames[gameId] = {
        player1: player1.userId,
        player2: player2.userId,
      }; // Store the game details

      console.log(`JOIN: Matched ${player1.userId} with ${player2.userId}`);
      console.log(`JOIN: Game created: ${gameId}`);

      // Save the game to the database
      try {
        const result = await pool.query(
          "INSERT INTO games (game_id, player1_id, player2_id, game_state) VALUES ($1, $2, $3, $4) RETURNING id",
          [
            gameId,
            player1.userId,
            player2.userId,
            JSON.stringify({ moves: [] }),
          ] // Initialize `game_state` with empty moves
        );

        const dbGameId = result.rows[0].id;

        console.log(`JOIN: Game saved to database with ID: ${dbGameId}`);
      } catch (err) {
        console.error(`JOIN: Failed to save game to database: ${err.message}`);
      }

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

  // Handle user reconnection
  socket.on("reconnect", async ({ userId }) => {
    console.log(`RECONNECT: User ${userId} is attempting to reconnect.`);
    if (connectedUsers[userId]) {
      console.log(
        `RECONNECT: User ${userId} is already connected. Ignoring reconnect.`
      );
      return;
    }
    console.log(`RECONNECT: Current connected users:`, connectedUsers);

    try {
      // Query the database for ongoing games involving the user
      const result = await pool.query(
        "SELECT * FROM games WHERE (player1_id = $1 OR player2_id = $1) AND status = 'active'",
        [userId]
      );

      if (result.rows.length > 0) {
        const ongoingGame = result.rows[0];
        console.log(
          `RECONNECT: Game ${ongoingGame.game_id} restored for User ${userId}.`
        );

        // Restore the game state and notify the user
        socket.emit("gameRestored", {
          gameId: ongoingGame.game_id,
          opponentId:
            ongoingGame.player1_id === userId
              ? ongoingGame.player2_id
              : ongoingGame.player1_id,
          gameState: ongoingGame.game_state,
        });
        console.log(`RECONNECT: Sent gameRestored event to User ${userId}.`);

        // Update the connected users list
        connectedUsers[userId] = socket.id;

        // Remove user from disconnectedUsers (if applicable)
        if (disconnectedUsers[userId]) {
          delete disconnectedUsers[userId];
          console.log(
            `RECONNECT: User ${userId} removed from disconnectedUsers.`
          );
        }

        //Notify the opponent about the reconnection
        const opponentId =
          ongoingGame.player1_id === userId
            ? ongoingGame.player2_id
            : ongoingGame.player1_id;
        const opponentSocketId = connectedUsers[opponentId];

        if (opponentSocketId) {
          io.to(opponentSocketId).emit("opponentReconnected", {
            message: `Your opponent ${userId} has reconnected.`,
          });
          console.log(`RECONNECT: Opponent ${opponentId} notified.`);
        }
        console.log(`RECONNECT: User ${userId} successfully reconnected.`);
      } else {
        console.log(`RECONNECT: No ongoing game found for User ${userId}.`);
        socket.emit("noGameFound");
      }
    } catch (err) {
      console.error(
        `RECONNECT: Error retrieving game for User ${userId}: ${err.message}`
      );
      socket.emit("error", { message: "Reconnection failed." });
    }
  });

  // Handle move events
  socket.on("move", async ({ gameId, from, to }) => {
    console.log(`MOVE: Move received for game ${gameId}: ${from} -> ${to}`);

    const game = activeGames[gameId]; // Retrieve game details
    if (game) {
      const opponentSocketId =
        connectedUsers[game.player1] === socket.id
          ? connectedUsers[game.player2]
          : connectedUsers[game.player1]; // Determine opponent's socket ID

      if (opponentSocketId) {
        io.to(opponentSocketId).emit("move", { from, to }); // Send move to opponent
        console.log(`MOVE: Move broadcasted to opponent: ${opponentSocketId}`);

        //Update game state in the database
        try {
          const gameResult = await pool.query(
            "SELECT game_state FROM games WHERE game_id = $1",
            [gameId]
          );

          let gameState = gameResult.rows[0]?.game_state || {}; // Initialize state if empty
          let moves = gameResult.rows[0]?.moves || [];

          if (typeof gameState === "string") {
            gameState = JSON.parse(gameState); // Parse JSON if necessary
          }

          moves.push({ from, to }); // Append to moves array
          gameState.moves = gameState.moves || []; // Ensure `moves` array exists
          gameState.moves.push({ from, to }); // Append the move
          console.log(`MOVE: Updating game state for game ${gameId}`);

          // Save updated state to the database
          await pool.query(
            "UPDATE games SET game_state = $1, moves = $2 WHERE game_id = $3",
            [JSON.stringify(gameState), JSON.stringify(moves), gameId]
          );
          console.log(
            `MOVE: Game state updated for game ${gameId}:`,
            gameState
          );
        } catch (err) {
          console.error(
            `MOVE: Failed to update game state for game ${gameId}: ${err.message}`
          );
        }
      } else {
        console.log("MOVE: Opponent is not connected.");
      }
    } else {
      console.log("MOVE: Invalid game ID.");
      socket.emit("error", { message: "Invalid game ID" }); // Notify user of invalid game ID
    }
  });

  // Handle disconnects and allow reconnection
  socket.on("disconnect", () => {
    console.log(`DISCONNECT: Socket ID ${socket.id} disconnected.`);
    console.log(
      `DISCONNECT: Current connected users before cleanup:`,
      connectedUsers
    );

    // Identify the disconnected user
    const userId = Object.keys(connectedUsers).find(
      (id) => connectedUsers[id] === socket.id
    );

    if (userId) {
      delete connectedUsers[userId]; // Remove user from connected users
      console.log(`DISCONNECT: User ${userId} removed from connected users.`);

      // Notify opponent of disconnection
      for (const gameId in activeGames) {
        const game = activeGames[gameId];
        if (game.player1 === userId || game.player2 === userId) {
          const opponentId =
            game.player1 === userId ? game.player2 : game.player1;
          const opponentSocketId = connectedUsers[opponentId];

          if (opponentSocketId) {
            io.to(opponentSocketId).emit("opponentDisconnected", {
              message: `Your opponent ${userId} disconnected.`,
            }); // Notify opponent
            console.log(
              `DISCONNECT: Notified opponent ${opponentId} about disconnection.`
            );
          }

          // Handle reconnection within 30 seconds
          if (!disconnectedUsers[userId]) {
            disconnectedUsers[userId] = {
              timeout: setTimeout(async () => {
                // Remove game from activeGames and update database
                delete activeGames[gameId];
                console.log(
                  `DISCONNECT: Game ${gameId} ended due to player ${userId} timeout.`
                );

                try {
                  await pool.query(
                    "UPDATE games SET status = $1, updated_at = NOW() WHERE game_id = $2",
                    ["ended", gameId]
                  );
                  console.log(
                    `DISCONNECT: Game ${gameId} marked as ended in the database.`
                  );
                } catch (err) {
                  console.error(
                    `DISCONNECT: Failed to update game status for game ${gameId}: ${err.message}`
                  );
                }
              }, 30000), // Timeout duration
            };
            console.log(
              `DISCONNECT: User ${userId} added to disconnectedUsers with a 30-second timeout.`
            );
          } else {
            console.log(
              `DISCONNECT: User ${userId} is already in disconnectedUsers, skipping duplicate timeout setup.`
            );
          }
          break; // Exit after handling the relevant game
        }
      }
    } else {
      console.log(
        `DISCONNECT: No matching user found for Socket ID ${socket.id}.`
      );
    }
  });
});

// WebSocket Test Endpoint
app.get("/websocket-check", (req, res) => {
  res.send("WebSocket server is active!");
});

const PORT = process.env.PORT || 5000; // Define the port number
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
