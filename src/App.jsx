import React, { useCallback, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
const OPTION_STYLE = (capture) => {
    return capture
        ? {
            background: 'radial-gradient(circle, transparent 75%, rgba(0,0,0,.1) 75%)'
        } : {
        background: 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
        borderRadius: '50%',
    };
};
const FROM_STYLE = {
    background: '#ff05'
};
export function Board({ fen, onMove, arrows, ...props }) {
    function move(from, to, piece) {
        try {
            const game = new Chess(fen);
            const san = game.move({ from, to, promotion: piece[1].toLowerCase() }).san;
            const newFen = game.fen();
            onMove === null || onMove === void 0 ? void 0 : onMove(san, newFen);
            return true;
        }
        catch {
            return false;
        }
    }
    const customArrows = useMemo(() => {
        if (!arrows)
            return [];
        const customArrows = [];
        const game = new Chess(fen);
        for (const { san, color } of arrows) {
            try {
                const { from, to } = game.move(san);
                customArrows.push([from, to, color]);
            }
            catch { } // eslint-disable-line
        }
        return customArrows;
    }, [fen, arrows]);
    const [fromSquare, setFrom] = useState(null);
    const onClick = useCallback((square) => {
        if (!onMove && !props.arePiecesDraggable)
            return;
        if (!fromSquare)
            return setFrom(square);
        const game = new Chess(fen);
        try {
            const san = game.move({ from: fromSquare, to: square }).san;
            onMove === null || onMove === void 0 ? void 0 : onMove(san, game.fen());
        }
        catch {
            setFrom(square);
        }
    }, [fromSquare, fen, onMove, props.arePiecesDraggable]);
    const squareStyles = useMemo(() => {
        if (!fromSquare)
            return {};
        const game = new Chess(fen);
        const moves = game.moves({ square: fromSquare, verbose: true });
        if (moves.length === 0)
            return {};
        const styles = {
            [fromSquare]: FROM_STYLE,
            ...Object.fromEntries(moves.map(move => {
                const capture = !!game.get(move.to);
                return [move.to, OPTION_STYLE(capture)];
            }))
        };
        console.log(styles);
        return styles;
    }, [fen, fromSquare]);
    return (React.createElement(Chessboard, { position: fen, onPieceDrop: move, customArrows: customArrows, customSquareStyles: squareStyles, onSquareClick: onClick, ...props }));
}
export default Board;
