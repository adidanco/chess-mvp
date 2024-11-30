import React, { useState } from "react";
import Login from "./components/Login";
import Matchmaking from "./components/Matchmaking";
import Chessboard from "./components/Chessboard";

const App = () => {
  const [userId, setUserId] = useState(null);
  const [gameData, setGameData] = useState(null);

  return (
    <div>
      {!userId ? (
        <Login onLogin={setUserId} />
      ) : !gameData ? (
        <Matchmaking userId={userId} onMatchFound={setGameData} />
      ) : (
        <Chessboard gameId={gameData.gameId} userId={userId} />
      )}
    </div>
  );
};

export default App;
