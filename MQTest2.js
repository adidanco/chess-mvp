const io = require("socket.io-client");

const socket = io("ws://localhost:5000", {
  transports: ["websocket"],
});

let reconnecting = false;
let simulatedDisconnects = false; // Track if disconnection simulation has already occurred

socket.on("connect", () => {
  console.log("User 2: Connected to the WebSocket server!");
  console.log("User 2: reconnecting flag =", reconnecting);

  if (reconnecting) {
    console.log("User 2: Emitting reconnect...");
    socket.emit("reconnect", { userId: 2 }); // Trigger reconnection logic
  } else {
    console.log("User 2: Emitting join...");
    socket.emit("join", { userId: 2 }); // Standard join logic
  }

  setTimeout(() => {
    if (simulatedDisconnects < 1) {
      // Ensure the simulation runs only once
      console.log("User 2: Simulating disconnection...");
      socket.disconnect();

      setTimeout(() => {
        console.log("User 2: Simulating reconnection...");
        reconnecting = true; // Set reconnecting flag manually
        socket.connect();

        simulatedDisconnects = true;
      }, 5000);
    } // Reconnect after 5 seconds
  }, 5000); // Disconnect after 5 seconds of initial connection
});

// Handle matchFound event
socket.on("matchFound", (data) => {
  console.log("User 2: Match found:", data);

  // Respond with a move after receiving a move from the opponent
  socket.on("move", (moveData) => {
    console.log("User 2: Move received:", moveData);

    setTimeout(() => {
      console.log("User 2: Responding with move e7 -> e5");
      socket.emit("move", { gameId: data.gameId, from: "e7", to: "e5" }); // Response move
    }, 2000); // Delay for simulating gameplay
  });
});

// Handle gameRestored event
socket.on("gameRestored", (data) => {
  console.log("User 2: Game restored:", data);

  // Automatically send a move to test reconnection
  if (!reconnecting) {
    // Ensure moves are not sent redundantly
    setTimeout(() => {
      console.log("User 2: Sending move after reconnection e5 -> e6");
      socket.emit("move", { gameId: data.gameId, from: "e5", to: "e6" });
    }, 2000); // Delay for simulating gameplay
  }
});

// Handle opponentReconnected event
socket.on("opponentReconnected", (data) => {
  console.log("User 2: Opponent reconnected:", data.message);
});

// Handle noGameFound event if reconnection happens after 30 seconds
socket.on("noGameFound", () => {
  console.log("User 2: Reconnection failed. Game has ended or is invalid.");
});

socket.on("disconnect", () => {
  console.log("User 2: Disconnected.");
  reconnecting = true; // Set reconnecting flag
});
