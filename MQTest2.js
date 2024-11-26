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

  // Respond with a move after receiving a move from the opponent
  socket.on("move", (moveData) => {
    console.log("User 2: Move received:", moveData);
    setTimeout(() => {
      console.log("User 2: Responding with move e7 -> e5");
      socket.emit("move", { gameId: data.gameId, from: "e7", to: "e5" }); // Response move
    }, 2000); // Delay for simulating gameplay
  });
});

socket.on("disconnect", () => {
  console.log("User 2: Disconnected.");
});
