import { useState, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

const buttonStyle = {
  cursor: "pointer",
  padding: "10px 20px",
  margin: "10px 10px 0px 0px",
  borderRadius: "6px",
  backgroundColor: "#f0d9b5",
  border: "none",
  boxShadow: "0 2px 5px rgba(0, 0, 0, 0.5)",
};

export default function Board() {
  const gameRef = useRef(new Chess()); // Stable game instance
  const [game, setGame] = useState(new Chess());
  const [history, setHistory] = useState([]);

  const updateGameState = () => {
    setGame(new Chess(gameRef.current.fen())); // Trigger re-render
  };

  const makeMove = (move) => {
    gameRef.current.move(move);
    setHistory([...history, move]);
    updateGameState();
  };

  const makeRandomMove = async () => {
    const possibleMoves = gameRef.current.moves();
    if (gameRef.current.isGameOver() || possibleMoves.length === 0) return;

    const randomIndex = Math.floor(Math.random() * possibleMoves.length);
    const randomMove = possibleMoves[randomIndex];

    // Apply a delay to allow the animation to play
    await new Promise((resolve) => setTimeout(resolve, 250)); 
    makeMove(randomMove);
  };

  const onDrop = (sourceSquare, targetSquare) => {
    const move = gameRef.current.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q", // Promote to queen
    });

    if (move) {
      setHistory([...history, move.san]);
      updateGameState();
      setTimeout(makeRandomMove, 250); // Wait 250ms before opponent moves
    }
  };

  const handleUndo = () => {
    const moveUndone = gameRef.current.undo();
    if (moveUndone) {
      setHistory(history.slice(0, -1));
      updateGameState();
    }
  };

  return (
    <div>
      <Chessboard
        position={game.fen()}
        onPieceDrop={onDrop}
        animationDuration={200} // Animation duration for piece movement
        customBoardStyle={{
          borderRadius: "4px",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
        }}
      />
      <button
        style={buttonStyle}
        onClick={() => {
          gameRef.current.reset();
          setHistory([]);
          updateGameState();
        }}
      >
        reset
      </button>
      <button style={buttonStyle} onClick={handleUndo}>
        undo
      </button>
    </div>
  );
}
