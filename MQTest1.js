const io = require("socket.io-client");

const socket = io("ws://localhost:5000", {
  transports: ["websocket"],
});

let reconnecting = false;
let simulatedDisconnects = false; // Track if disconnection simulation has already occurred

socket.on("connect", () => {
  console.log("User 1: Connected to the WebSocket server!");
  console.log("User 1: reconnecting flag =", reconnecting);

  if (reconnecting) {
    console.log("User 1: Emitting reconnect...");
    socket.emit("reconnect", { userId: 1 }); // Trigger reconnection logic
  } else {
    console.log("User 1: Emitting join...");
    socket.emit("join", { userId: 1 }); // Standard join logic
  }

  setTimeout(() => {
    if (!simulatedDisconnects) {
      // Ensure the simulation runs only once
      console.log("User 1: Simulating disconnection...");
      socket.disconnect();

      setTimeout(() => {
        console.log("User 1: Simulating reconnection...");
        reconnecting = true; // Set reconnecting flag manually
        socket.connect();

        simulatedDisconnects = true;
      }, 5000); // Reconnect after 5 seconds
    }
  }, 5000); // Disconnect after 5 seconds of initial connection
});

// Handle matchFound event
socket.on("matchFound", (data) => {
  console.log("User 1: Match found:", data);

  // Send a test move after being matched
  setTimeout(() => {
    console.log("User 1: Sending move e2 -> e4");
    socket.emit("move", { gameId: data.gameId, from: "e2", to: "e4" }); // Test move
  }, 2000); // Delay to ensure both clients are ready
});

// Handle move events
socket.on("move", (data) => {
  console.log("User 1: Move received:", data);
});

// Handle gameRestored event
socket.on("gameRestored", (data) => {
  console.log("User 1: Game restored:", data);

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
  console.log("User 1: Opponent reconnected:", data.message);
});

// Handle noGameFound event if reconnection happens after 30 seconds
socket.on("noGameFound", () => {
  console.log("User 1: Reconnection failed. Game has ended or is invalid.");
});

//Handle Disconnection
socket.on("disconnect", () => {
  console.log("User 1: Disconnected.");
  reconnecting = true; // Set reconnecting flag
});
