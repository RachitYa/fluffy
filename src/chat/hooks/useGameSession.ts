import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase.config';

// ─── Types ────────────────────────────────────────────────────────────────────
export type GameType = 'tictactoe' | 'wordguess';
export type GameStatus = 'waiting' | 'active' | 'finished';

export interface TicTacToeState {
  board: (string | null)[]; // 9 cells, 'X' | 'O' | null
  xUid: string;
  oUid: string;
  currentTurn: string; // uid
  winner: string | null; // uid or 'draw'
}

export interface WordGuessState {
  word: string;           // The word to guess (hidden from guesser)
  maskedWord: string;     // e.g. "_ _ _ _ _"
  guessedLetters: string[];
  wrongGuesses: number;   // max 6
  chooserUid: string;
  guesserUid: string;
  winner: string | null;  // uid or null
}

export interface GameSession {
  id: string;
  type: GameType;
  status: GameStatus;
  challengerUid: string;
  challengerName: string;
  challengedUid: string;
  challengedName: string;
  tictactoe?: TicTacToeState;
  wordguess?: WordGuessState;
  createdAt: number;
  updatedAt: number;
}

// ─── TicTacToe Helpers ────────────────────────────────────────────────────────
const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function checkTicTacToeWinner(board: (string | null)[]): string | null {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]!;
  }
  if (board.every((cell) => cell !== null)) return 'draw';
  return null;
}

// ─── Word Guess Helpers ───────────────────────────────────────────────────────
export function buildMasked(word: string, guessedLetters: string[]): string {
  return word
    .toUpperCase()
    .split('')
    .map((letter) => (guessedLetters.includes(letter) ? letter : '_'))
    .join(' ');
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useGameSession(passkey: string, userUid: string | null, userName: string | null) {
  const [games, setGames] = useState<GameSession[]>([]);

  // Real-time subscription to all active/waiting games
  useEffect(() => {
    if (!passkey) return;
    const gamesCol = collection(db, 'rooms', passkey, 'games');
    const unsub = onSnapshot(gamesCol, (snap) => {
      const list: GameSession[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: data.type,
          status: data.status,
          challengerUid: data.challengerUid,
          challengerName: data.challengerName,
          challengedUid: data.challengedUid,
          challengedName: data.challengedName,
          tictactoe: data.tictactoe,
          wordguess: data.wordguess,
          createdAt: data.createdAt ?? Date.now(),
          updatedAt: data.updatedAt ?? Date.now(),
        };
      });
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      setGames(list);
    });
    return unsub;
  }, [passkey]);

  // ── Challenge someone to TicTacToe ────────────────────────────────────────
  const challengeTicTacToe = useCallback(
    async (challengedUid: string, challengedName: string) => {
      if (!passkey || !userUid || !userName) return null;
      const gamesCol = collection(db, 'rooms', passkey, 'games');
      const ttt: TicTacToeState = {
        board: Array(9).fill(null),
        xUid: userUid,
        oUid: challengedUid,
        currentTurn: userUid,
        winner: null,
      };
      const docRef = await addDoc(gamesCol, {
        type: 'tictactoe',
        status: 'waiting',
        challengerUid: userUid,
        challengerName: userName,
        challengedUid,
        challengedName,
        tictactoe: ttt,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return docRef.id;
    },
    [passkey, userUid, userName],
  );

  // ── Accept a game ──────────────────────────────────────────────────────────
  const acceptGame = useCallback(
    async (gameId: string) => {
      if (!passkey) return;
      const gameRef = doc(db, 'rooms', passkey, 'games', gameId);
      await updateDoc(gameRef, { status: 'active', updatedAt: Date.now() });
    },
    [passkey],
  );

  // ── TicTacToe move ─────────────────────────────────────────────────────────
  const makeTicTacToeMove = useCallback(
    async (gameId: string, cellIndex: number) => {
      if (!passkey || !userUid) return;
      const game = games.find((g) => g.id === gameId);
      if (!game || !game.tictactoe || game.status !== 'active') return;
      const ttt = game.tictactoe;
      if (ttt.currentTurn !== userUid) return;
      if (ttt.board[cellIndex] !== null) return;

      const symbol = ttt.xUid === userUid ? 'X' : 'O';
      const newBoard = [...ttt.board];
      newBoard[cellIndex] = symbol;

      const winSymbol = checkTicTacToeWinner(newBoard);
      const winnerUid = winSymbol === 'X' ? ttt.xUid : winSymbol === 'O' ? ttt.oUid : winSymbol === 'draw' ? 'draw' : null;
      const nextTurn = ttt.currentTurn === ttt.xUid ? ttt.oUid : ttt.xUid;

      const gameRef = doc(db, 'rooms', passkey, 'games', gameId);
      await updateDoc(gameRef, {
        'tictactoe.board': newBoard,
        'tictactoe.currentTurn': winnerUid ? ttt.currentTurn : nextTurn,
        'tictactoe.winner': winnerUid,
        status: winnerUid ? 'finished' : 'active',
        updatedAt: Date.now(),
      });
    },
    [passkey, userUid, games],
  );

  // ── Challenge to Word Guess ────────────────────────────────────────────────
  const challengeWordGuess = useCallback(
    async (challengedUid: string, challengedName: string, secretWord: string) => {
      if (!passkey || !userUid || !userName) return null;
      const word = secretWord.toUpperCase().replace(/[^A-Z]/g, '');
      if (word.length < 3) return null;

      const gamesCol = collection(db, 'rooms', passkey, 'games');
      const wg: WordGuessState = {
        word,
        maskedWord: buildMasked(word, []),
        guessedLetters: [],
        wrongGuesses: 0,
        chooserUid: userUid,
        guesserUid: challengedUid,
        winner: null,
      };
      const docRef = await addDoc(gamesCol, {
        type: 'wordguess',
        status: 'waiting',
        challengerUid: userUid,
        challengerName: userName,
        challengedUid,
        challengedName,
        wordguess: wg,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return docRef.id;
    },
    [passkey, userUid, userName],
  );

  // ── Word Guess letter guess ────────────────────────────────────────────────
  const guessLetter = useCallback(
    async (gameId: string, letter: string) => {
      if (!passkey || !userUid) return;
      const game = games.find((g) => g.id === gameId);
      if (!game || !game.wordguess || game.status !== 'active') return;
      if (game.wordguess.guesserUid !== userUid) return;

      const wg = game.wordguess;
      const L = letter.toUpperCase();
      if (wg.guessedLetters.includes(L)) return;

      const newGuessed = [...wg.guessedLetters, L];
      const correct = wg.word.includes(L);
      const newWrong = correct ? wg.wrongGuesses : wg.wrongGuesses + 1;
      const newMasked = buildMasked(wg.word, newGuessed);

      const isWon = !newMasked.includes('_');
      const isLost = newWrong >= 6;
      const winner = isWon ? userUid : isLost ? wg.chooserUid : null;

      const gameRef = doc(db, 'rooms', passkey, 'games', gameId);
      await updateDoc(gameRef, {
        'wordguess.guessedLetters': newGuessed,
        'wordguess.wrongGuesses': newWrong,
        'wordguess.maskedWord': newMasked,
        'wordguess.winner': winner,
        status: winner ? 'finished' : 'active',
        updatedAt: Date.now(),
      });
    },
    [passkey, userUid, games],
  );

  // ── Delete/dismiss finished game ───────────────────────────────────────────
  const dismissGame = useCallback(
    async (gameId: string) => {
      if (!passkey) return;
      await deleteDoc(doc(db, 'rooms', passkey, 'games', gameId));
    },
    [passkey],
  );

  const myActiveGame = games.find(
    (g) =>
      g.status !== 'finished' &&
      (g.challengerUid === userUid || g.challengedUid === userUid),
  ) ?? null;

  const pendingChallenge = games.find(
    (g) => g.status === 'waiting' && g.challengedUid === userUid,
  ) ?? null;

  return {
    games,
    myActiveGame,
    pendingChallenge,
    challengeTicTacToe,
    challengeWordGuess,
    acceptGame,
    makeTicTacToeMove,
    guessLetter,
    dismissGame,
  };
}
