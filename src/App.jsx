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

  const makeMove = (move) => {
    game.move(move)
    setGame(new Chess(game.fen()))
  }

  function makeRandomMove() {
    const possibleMoves = game.moves();
    if (game.isGameOver() || game.isDraw() || possibleMoves.length === 0) return; // exit if the game is over
    const randomIndex = Math.floor(Math.random() * possibleMoves.length);
    makeMove(possibleMoves[randomIndex]);
  }

  function onDrop(sourceSquare, targetSquare) {
    const move = makeMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q", // always promote to a queen for example simplicity
    });

    // illegal move
    if (move === null) return false;
    setTimeout(makeRandomMove, 200);
    return true;
  }

  return(
     <div>
       <Chessboard position={game.fen()} onPieceDrop={onDrop} customBoardStyle={{
       borderRadius: "4px",
       boxShadow: "0 2px 10px rgba(0, 0, 0, 0.5)"
    }} />
       <button style={buttonStyle} onClick={() => {
         game.reset();
    }}>
         reset
       </button>
       <button style={buttonStyle} onClick={() => {
         game.undo();
    }}>
         undo
       </button>
     </div>
  )
}
