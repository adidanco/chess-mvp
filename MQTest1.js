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

  // Simulate a move after matching (NEW CODE)
  setTimeout(() => {
    socket.emit("move", { gameId: data.gameId, from: "e2", to: "e4" });
  }, 1000);
});

socket.on("move", (data) => {
  console.log("User 1: Move received:", data); // NEW CODE
});

socket.on("disconnect", () => {
  console.log("User 1: Disconnected.");
});
