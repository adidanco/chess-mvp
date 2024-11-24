const io = require("socket.io-client");

const socket = io("ws://localhost:5000", {
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("User 2: Connected to the WebSocket server!");
  socket.emit("join", { userId: 2 }); // Emit the join event with userId 2
});

socket.on("matchFound", (data) => {
  console.log("User 2: Match found:", data);
});

socket.on("disconnect", () => {
  console.log("User 2: Disconnected.");
});
