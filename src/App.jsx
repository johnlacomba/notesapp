import { useState } from "react";
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
  const [game, setGame] = useState(new Chess());
  const [history, setHistory] = useState([]);

  const makeMove = (move) => {
    game.move(move);
    setGame(new Chess(game.fen()));
  };

  function makeRandomMove() {
    const possibleMoves = game.moves();
    if (game.isGameOver() || game.isDraw() || possibleMoves.length === 0) return; // exit if the game is over
    const randomIndex = Math.floor(Math.random() * possibleMoves.length);
    const randomMove = possibleMoves[randomIndex];

    makeMove(randomMove);
    setHistory([...history, randomMove]); // Store the move instead of the FEN
  }

  const onDrop = (sourceSquare, targetSquare) => {
    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q' // Promote to a queen if possible
    });

    if (move) {
      setGame(game);
      setHistory([...history, move.san]); // Store the move in SAN format
      setTimeout(makeRandomMove, 200);
    }
  };

  const handleUndo = () => {
    if (history.length > 0) {
      game.undo(); // Undo the last move
      setHistory(history.slice(0, -1)); // Remove the last move from history
      setGame(new Chess(game.fen())); // Update the game state
    }
  };

  return (
    <div>
      <Chessboard 
        position={game.fen()} 
        onPieceDrop={onDrop} 
        customBoardStyle={{
          borderRadius: "4px",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.5)"
        }} 
      />
      <button style={buttonStyle} onClick={() => {
        game.reset();
        setGame(new Chess(game.fen()));
        setHistory([]); // Clear history on reset
      }}>
        reset
      </button>
      <button style={buttonStyle} onClick={handleUndo}>
        undo
      </button>
    </div>
  );
}
