import React, { useState, useEffect } from "react";
import Chessboard from "chessboardjsx";
import Chess from "chess.js";
import socket from "../services/socket";

const ChessboardComponent = ({ gameId, userId }) => {
  const [game, setGame] = useState(new Chess());
  const [opponentMove, setOpponentMove] = useState(null);

  useEffect(() => {
    socket.on("move", (move) => {
      game.move(move);
      setGame(new Chess(game.fen())); // Update game state
      setOpponentMove(move);
    });

    return () => socket.off("move");
  }, [game]);

  const handleMove = ({ sourceSquare, targetSquare }) => {
    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q", // Always promote to queen for simplicity
    });

    if (move) {
      setGame(new Chess(game.fen())); // Update the board state
      socket.emit("move", { gameId, from: sourceSquare, to: targetSquare });
    }
  };

  return (
    <div>
      <Chessboard
        position={game.fen()}
        onDrop={(move) =>
          handleMove({
            sourceSquare: move.sourceSquare,
            targetSquare: move.targetSquare,
          })
        }
      />
      {opponentMove && <p>Opponent moved: {opponentMove?.from} → {opponentMove?.to}</p>}
    </div>
  );
};

export default ChessboardComponent;
