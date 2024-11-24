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
});

socket.on("disconnect", () => {
  console.log("User 1: Disconnected.");
});
