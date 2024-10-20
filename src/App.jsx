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
  const gameRef = useRef(new Chess()); // Use a ref to keep a stable game instance
  const [game, setGame] = useState(new Chess());
  const [history, setHistory] = useState([]);

  const updateGameState = () => {
    // Create a new game instance with the current FEN to trigger React re-render
    setGame(new Chess(gameRef.current.fen()));
  };

  const makeMove = (move) => {
    gameRef.current.move(move);
    setHistory([...history, move]);
    updateGameState();
  };

  function makeRandomMove() {
    const possibleMoves = gameRef.current.moves();
    if (gameRef.current.isGameOver() || possibleMoves.length === 0) return;
    const randomIndex = Math.floor(Math.random() * possibleMoves.length);
    const randomMove = possibleMoves[randomIndex];

    makeMove(randomMove);
  }

  const onDrop = (sourceSquare, targetSquare) => {
    const move = gameRef.current.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q", // Promote to a queen if possible
    });

    if (move) {
      setHistory([...history, move.san]);
      updateGameState();
      setTimeout(makeRandomMove, 200);
    }
  };

  const handleUndo = () => {
    const moveUndone = gameRef.current.undo(); // Undo the last move

    if (moveUndone) {
      setHistory(history.slice(0, -1)); // Update history
      updateGameState(); // Re-render the board with new FEN
    }
  };

  return (
    <div>
      <Chessboard
        position={game.fen()}
        onPieceDrop={onDrop}
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
          updateGameState(); // Re-render the board
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
