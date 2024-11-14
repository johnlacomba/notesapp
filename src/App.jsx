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
import { fetchUserAttributes } from 'aws-amplify/auth';

Amplify.configure(outputs);
const client = generateClient({
  authMode: "userPool",
});

const buttonStyle = { /* your button style */ };

const modalStyles = { /* your modal style */ };

const overlayStyles = { /* your overlay style */ };

export default function Board() {
  const gameRef = useRef(new Chess()); // Stable game instance
  const stockfishRef = useRef(null); // Stockfish worker reference
  const [username, setUsername] = useState(null); // Current user's username
  const [game, setGame] = useState(new Chess());
  const [history, setHistory] = useState([]);
  const [boardSize, setBoardSize] = useState(Math.min(window.innerWidth, window.innerHeight));
  const [currentPlayer, setCurrentPlayer] = useState('w'); // 'w' for white, 'b' for black
  const [showModal, setShowModal] = useState(true); // Modal visibility
  const [boardReady, setBoardReady] = useState(false); // Chessboard rendering

  // Function to close the modal and show the chessboard
  const handleCloseModal = () => {
    setShowModal(false);
    setBoardReady(true); // Allow the chessboard to render
  };

  async function getUserInfo() {
    const user = await fetchUserAttributes();
    const theusername = user.email;
    return theusername;
  }

  async function fetchNotes(username) {
    const { data: game } = await client.models.Note.list({
      gameRoom: { eq: username }, // Find game room with matching username 
    });

    if (game.length > 0) {
      gameRef.current.load(game[0].description);
    }
    updateGameState(); // Might not be needed
  }

  const updateGameRoomDescription = async () => {
    whitePlayer = null;
    blackPlayer = null;
    console.log("getUserInfo5: ", username);
    try {
      // Step 1: Query the existing game room by username
      const { data: existingGameRoom } = await client.models.Note.list({
        gameRoom: { eq: username }, // Find game room with matching username
      });
      console.log("existingGameRoom: ", existingGameRoom);
      if (existingGameRoom.length > 0) {
        const gameRoom = existingGameRoom[0]; // Get the first matching game room
        // Determine the username playing each side
        switch(currentPlayer) {
          case "w":
            whitePlayer = currentPlayer;
            break;
          case "b":
            blackPlayer = currentPlayer;
            break;
        }
      
        // Step 2: Update the description field with the new FEN state
        const { data: updatedGameRoom } = await client.models.Note.update({
          id: gameRoom.id, // Use the ID of the existing game room
          gameRoom: username,
          description: gameRef.current.fen(), // Update the description
          whitePlayer: whitePlayer,
          blackPlayer: blackPlayer,
        });

        console.log("Game room updated:", updatedGameRoom);
      } else {
        // Create a new game room entry
        const { data: newGameRoom } = await client.models.Note.create({
          gameRoom: username,
          description: gameRef.current.fen(),
        });
      }
    } catch (error) {
      console.error("Error updating game room:", error);
    }
  };

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
    setCurrentPlayer(gameRef.current.turn()); // Update current player ('w' or 'b')
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
      promotion: "q", // Automatically promote to queen
    });

    if (move) {
      setHistory([...history, move.san]);
      updateGameState();
      updateGameRoomDescription();
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
        updateGameRoomDescription();
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
      {({ signOut, user }) => {
        useEffect(() => {
          if (user && !username) {  // Ensure the user data is only fetched once
            (async () => {
              const fetchedUsername = await getUserInfo();
              setUsername(fetchedUsername);
              fetchNotes(fetchedUsername);
            })();
          }
        }, [user]);

        return (
          <Flex
            className="App"
            justifyContent="center"
            alignItems="center"
            direction="column"
            width="70%"
            margin="0 auto"
          >
			{/* Modal */}
            {showModal && (
              <>
                <div style={overlayStyles} />
                <div style={modalStyles}>
                  <h2>Welcome, {user.email}!</h2>
                  <p>Are you ready to start the game?</p>
                  <Button onClick={handleCloseModal}>Let's Play!</Button>
                </div>
              </>
            )}

			{/* Chessboard (Only render after modal is dismissed) */}
            {boardReady && (
              <View>
                <div id="chessboard-wrapper">
                  <div id="chessboard-container">
                    <h2>Current Player: {currentPlayer === 'w' ? 'White' : 'Black'}</h2>
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
                    <button style={buttonStyle} onClick={() => {
                      gameRef.current.reset();
                      setCurrentPlayer('w');
                      setHistory([]);
                      updateGameState();
                    }}>
                      reset
                    </button>
                    <button style={buttonStyle} onClick={handleUndo}>
                      undo
                    </button>
                  </div>
                </div>
              </View>
            )}
            <Button onClick={signOut}>Sign Out</Button>
          </Flex>
        );
      }}
    </Authenticator>
  );
}
