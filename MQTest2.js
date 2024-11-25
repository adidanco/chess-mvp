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

  // Simulate a move after matching (NEW CODE)
  setTimeout(() => {
    socket.emit("move", { gameId: data.gameId, from: "e7", to: "e5" });
  }, 2000);
});

socket.on("move", (data) => {
  console.log("User 2: Move received:", data); // NEW CODE
});

socket.on("disconnect", () => {
  console.log("User 2: Disconnected.");
});
