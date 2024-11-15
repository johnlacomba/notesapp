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

const buttonStyle = {
  cursor: "pointer",
  padding: "10px 20px",
  margin: "10px 0", // Add vertical margin
  borderRadius: "6px",
  backgroundColor: "#f0d9b5",
  border: "none",
  boxShadow: "0 2px 5px rgba(0, 0, 0, 0.5)",
};

// Modal styling
const modalStyles = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  padding: "20px",
  backgroundColor: "white",
  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
  borderRadius: "8px",
  textAlign: "center",
  zIndex: 1000,
};

const overlayStyles = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  zIndex: 999,
};

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
  const [whitePlayer, setWhitePlayer] = useState(null); // Store the username of the whitePlayer at game launch
  const [blackPlayer, setBlackPlayer] = useState(null); // Store the username of the blackPlayer at game launch
  
  // Function to close the modal and show the chessboard
  const handleCloseModal = () => {
    setShowModal(false);
    setBoardReady(true); // Allow the chessboard to render
  };

  // Fetch the user info
  async function fetchUser() {
    const user = await getUserInfo();
    console.log("getUserInfo3: ", user);
    setUsername(user); // Set the username once fetched
  }
  
  // Fetch game data when the username is available
  useEffect(() => {
    if (username) { // Ensure username is available
      console.log("getUserInfo4: ", username);
      fetchNotes(username); // Pass the username to fetchNotes
    }
  }, [username]); // Run when 'username' state changes
  
  async function getUserInfo() {
    const user = await fetchUserAttributes();
    console.log("getUserInfo1: ", user);
    const theusername = user.email;
    console.log("getUserInfo2: ", theusername);
    return theusername;
  }
  
  async function fetchNotes(username) {
    const { data: game } = await client.models.Note.list({
      gameRoom: { eq: whitePlayer+blackPlayer }, // Find game room with matching username 
    });

    if (game.length > 0) {
      console.log("fetchNotes2: ", game[0]);
      gameRef.current.load(game[0].description);
    }
    updateGameState();  // Might not be needed
  }

  const updateGameRoomDescription = async () => {
    console.log("getUserInfo5: ", username);
    try {
      // Step 1: Query the existing game room by username
      const { data: existingGameRoom } = await client.models.Note.list({
        gameRoom: { eq: username }, // Find game room with matching username
      });
      console.log("existingGameRoom: ", existingGameRoom);
      if (existingGameRoom.length > 0) {
        const gameRoom = existingGameRoom[0]; // Get the first matching game room
        // Step 2: Update the description field with the new FEN state
        const { data: updatedGameRoom } = await client.models.Note.update({
          id: gameRoom.id, // Use the ID of the existing game room
          gameRoom: whitePlayer+blackPlayer,
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
      promotion: "q", // Promote to queen
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
      {({ signOut, user }) => (
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
                <h2>Welcome, {user.signInDetails.loginId}!</h2>
                <p>Choose your side.</p>
                
                <Button onClick={() => {
                      console.log(user);
                      setWhitePlayer(user.signInDetails.loginId);
                      setBlackPlayer("STOCKFISH");
                      handleCloseModal();
                      fetchUser();
                      updateGameState();
                    }}
                >White</Button>

                <Button onClick={() => {
                      console.log(user);
                      setBlackPlayer(user.signInDetails.loginId);
                      setWhitePlayer("STOCKFISH");
                      handleCloseModal();
                      fetchUser();
                      updateGameState();
                      makeStockfishMove();
                    }}
                >Black</Button>
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
                    position={gameRef.current.fen()}
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
                      setCurrentPlayer('w');
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
          )}
          <Button onClick={signOut}>Sign Out</Button>
        </Flex>
      )}
      </Authenticator>
  );
}
