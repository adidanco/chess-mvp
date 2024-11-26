const io = require("socket.io-client");

const socket = io("ws://localhost:5000", {
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("Invalid Test User: Connected to the WebSocket server!");

  // Emit an invalid move without joining a game
  setTimeout(() => {
    console.log("Invalid Test User: Sending move with invalid gameId.");
    socket.emit("move", { gameId: "invalid-game", from: "e2", to: "e4" });
  }, 2000);
});

socket.on("move", (data) => {
  console.log("Invalid Test User: Move response received:", data);
});

socket.on("disconnect", () => {
  console.log("Invalid Test User: Disconnected.");
});
