const io = require("socket.io-client");

const socket = io("ws://localhost:5000", {
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("User 1: Connected to the WebSocket server!");
  socket.emit("join", { userId: 1 }); // Emit the join event with userId 1
});

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

socket.on("disconnect", () => {
  console.log("User 1: Disconnected.");
});
