import { useState, useRef, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import './App.css';
import {
  Authenticator,
  Button,
  Text,
  TextField,
  Heading,
  Flex,
  View,
  Image,
  Grid,
  Divider,
} from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import "@aws-amplify/ui-react/styles.css";
import { getUrl } from "aws-amplify/storage";
import { uploadData } from "aws-amplify/storage";
import { generateClient } from "aws-amplify/data";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);
const client = generateClient({
  authMode: "userPool",
});

const buttonStyle = {
  cursor: "pointer",
  padding: "10px 20px",
  margin: "10px 0", // Add vertical margin
  borderRadius: "6px",
  backgroundColor: "#f0d9b5",
  border: "none",
  boxShadow: "0 2px 5px rgba(0, 0, 0, 0.5)",
};

export default function Board() {
  const gameRef = useRef(new Chess()); // Stable game instance
  const stockfishRef = useRef(null); // Stockfish worker reference
  const [game, setGame] = useState(new Chess());
  const [history, setHistory] = useState([]);
  const [boardSize, setBoardSize] = useState(Math.min(window.innerWidth, window.innerHeight));

  // Handle resizing the board dynamically
  useEffect(() => {
    const updateBoardSize = () => {
      const size = Math.min(window.innerWidth, window.innerHeight);
      setBoardSize(size);
      document.documentElement.style.setProperty("--board-size", `${size}px`);
    };

    // Update size on load and whenever the window is resized
    window.addEventListener("resize", updateBoardSize);
    updateBoardSize();

    return () => window.removeEventListener("resize", updateBoardSize);
  }, []);
  
  // Initialize Stockfish using a local instance when the component mounts
  useEffect(() => {
    stockfishRef.current = new Worker("./stockfish.js");
    return () => stockfishRef.current.terminate(); // Clean up on unmount
  }, []);

  const updateGameState = () => {
    setGame(new Chess(gameRef.current.fen())); // Trigger re-render
  };

  const makeMove = (move) => {
    gameRef.current.move(move);
    setHistory([...history, move]);
    updateGameState();
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
      setTimeout(makeStockfishMove, 500); // Delay before Stockfish responds
    }
  };

  const makeStockfishMove = () => {
    if (gameRef.current.isGameOver()) return; // Stop if the game is over

    // Send the current position to Stockfish
    stockfishRef.current.postMessage(`position fen ${gameRef.current.fen()}`);
    stockfishRef.current.postMessage("go depth 15"); // Ask for best move

    // Listen for Stockfish's best move
    stockfishRef.current.onmessage = (event) => {
      const message = event.data;
      if (message.startsWith("bestmove")) {
        const [_, bestMove] = message.split(" ");
        const from = bestMove.slice(0, 2);
        const to = bestMove.slice(2, 4);

        gameRef.current.move({ from, to });
        updateGameState();
      }
    };
  };

  const handleUndo = () => {
    const moveUndone = gameRef.current.undo();
    if (moveUndone) {
      setHistory(history.slice(0, -1));
      updateGameState();
    }
  };

  return (
    <Authenticator>
      {({ signOut }) => (
        <Flex
          className="App"
          justifyContent="center"
          alignItems="center"
          direction="column"
          width="70%"
          margin="0 auto"
        >
          <Heading level={1}>My Notes App</Heading>
          <View>
						<div id="chessboard-wrapper">
						  <div id="chessboard-container">
							<Chessboard
							  position={game.fen()}
							  onPieceDrop={onDrop}
							  animationDuration={200}
							  customBoardStyle={{
								borderRadius: "4px",
								boxShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
							  }}
							/>
						  </div>
						  <div id="buttons-container">
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
						</div>
          </View>
            <Button onClick={signOut}>Sign Out</Button>
        </Flex>
      )}
      </Authenticator>
  );
}
