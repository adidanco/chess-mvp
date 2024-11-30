import React, { useEffect, useState } from "react";
import socket from "../services/socket";

const Matchmaking = ({ userId, onMatchFound }) => {
  const [searching, setSearching] = useState(true);

  useEffect(() => {
    socket.emit("join", { userId });

    socket.on("matchFound", (data) => {
      setSearching(false);
      onMatchFound(data); // Pass game details to parent
    });

    return () => socket.off("matchFound");
  }, [userId, onMatchFound]);

  return (
    <div>
      {searching ? <p>Searching for an opponent...</p> : <p>Opponent found!</p>}
    </div>
  );
};

export default Matchmaking;
