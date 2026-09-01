import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Pressable,
  Animated,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import {
  GameSession,
  TicTacToeState,
  WordGuessState,
  checkTicTacToeWinner,
  buildMasked,
} from '../hooks/useGameSession';

// ─── Keyboard letters ─────────────────────────────────────────────────────────
const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

// ─── Hangman drawing stages ───────────────────────────────────────────────────
const HANGMAN_STAGES = ['🙂', '😬', '😰', '😟', '😨', '😱', '💀'];

// ─── TicTacToe Board ──────────────────────────────────────────────────────────
function TicTacToeBoard({
  ttt,
  userUid,
  onMove,
}: {
  ttt: TicTacToeState;
  userUid: string | null;
  onMove: (i: number) => void;
}) {
  const { theme } = useTheme();
  const isMyTurn = ttt.currentTurn === userUid;
  const mySymbol = ttt.xUid === userUid ? 'X' : 'O';

  return (
    <View style={styles.tttContainer}>
      <Text style={[styles.tttTurnText, { color: theme.textMuted }]}>
        {ttt.winner
          ? ttt.winner === 'draw'
            ? "🤝 It's a Draw!"
            : ttt.winner === userUid
            ? '🎉 You Won!'
            : '😔 You Lost'
          : isMyTurn
          ? `Your turn (${mySymbol})`
          : 'Waiting for opponent...'}
      </Text>
      <View style={styles.tttGrid}>
        {ttt.board.map((cell, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.tttCell,
              { borderColor: theme.borderSubtle, backgroundColor: theme.bgCard },
              cell === null && isMyTurn && !ttt.winner && { backgroundColor: theme.bgDark },
            ]}
            onPress={() => onMove(i)}
            disabled={!!cell || !isMyTurn || !!ttt.winner}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tttSymbol,
              { color: cell === 'X' ? '#5865F2' : cell === 'O' ? '#ED4245' : 'transparent' },
            ]}>
              {cell ?? '.'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Word Guess Game ──────────────────────────────────────────────────────────
function WordGuessBoard({
  wg,
  userUid,
  onGuess,
}: {
  wg: WordGuessState;
  userUid: string | null;
  onGuess: (l: string) => void;
}) {
  const { theme } = useTheme();
  const isGuesser = wg.guesserUid === userUid;

  return (
    <View style={styles.wgContainer}>
      {/* Hangman stage */}
      <Text style={styles.hangmanEmoji}>{HANGMAN_STAGES[wg.wrongGuesses]}</Text>
      <Text style={[styles.wgWrongText, { color: '#ED4245' }]}>
        {wg.wrongGuesses}/6 wrong guesses
      </Text>

      {/* Masked word */}
      <Text style={[styles.wgMasked, { color: theme.textPrimary }]}>{wg.maskedWord}</Text>

      {/* Show actual word when game over */}
      {wg.winner && (
        <Text style={[styles.wgReveal, { color: theme.textMuted }]}>
          Word: <Text style={{ color: theme.accent, fontWeight: '800' }}>{wg.word}</Text>
        </Text>
      )}

      {wg.winner ? (
        <Text style={[styles.wgResult, { color: wg.winner === userUid ? '#23A55A' : '#ED4245' }]}>
          {wg.winner === userUid ? '🎉 You Won!' : '😔 You Lost!'}
        </Text>
      ) : isGuesser ? (
        <View style={styles.keyboardContainer}>
          {KEYBOARD_ROWS.map((row, ri) => (
            <View key={ri} style={styles.keyboardRow}>
              {row.map((letter) => {
                const guessed = wg.guessedLetters.includes(letter);
                const correct = guessed && wg.word.includes(letter);
                const wrong = guessed && !wg.word.includes(letter);
                return (
                  <TouchableOpacity
                    key={letter}
                    style={[
                      styles.keyBtn,
                      { backgroundColor: correct ? '#23A55A' : wrong ? '#40444B' : theme.bgCard },
                    ]}
                    onPress={() => onGuess(letter)}
                    disabled={guessed}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.keyBtnText, { color: wrong ? '#666' : theme.textPrimary }]}>
                      {letter}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.wgWaitText, { color: theme.textMuted }]}>
          🔍 Opponent is guessing your word...
        </Text>
      )}
    </View>
  );
}

// ─── Game Challenge Modal ─────────────────────────────────────────────────────
interface GameChallengeModalProps {
  visible: boolean;
  game: GameSession | null;
  userUid: string | null;
  onClose: () => void;
  onAccept: (gameId: string) => void;
  onTicTacToeMove: (gameId: string, cell: number) => void;
  onWordGuess: (gameId: string, letter: string) => void;
  onDismiss: (gameId: string) => void;
}

export default function GameChallengeModal({
  visible,
  game,
  userUid,
  onClose,
  onAccept,
  onTicTacToeMove,
  onWordGuess,
  onDismiss,
}: GameChallengeModalProps) {
  const { theme } = useTheme();

  if (!visible || !game) return null;

  const isChallenger = game.challengerUid === userUid;
  const opponentName = isChallenger ? game.challengedName : game.challengerName;

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable
        style={[styles.modal, { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle }]}
        onPress={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <View style={styles.modalHeader}>
          <MaterialCommunityIcons
            name={game.type === 'tictactoe' ? 'pound' : 'alphabetical'}
            size={18}
            color={theme.accent}
          />
          <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
            {game.type === 'tictactoe' ? 'Tic-Tac-Toe' : 'Word Guess'}
          </Text>
          <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
            vs {opponentName}
          </Text>
          <TouchableOpacity onPress={onClose} style={{ marginLeft: 'auto' }}>
            <Feather name="minus" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Waiting state */}
        {game.status === 'waiting' && game.challengedUid === userUid && (
          <View style={styles.waitingSection}>
            <Text style={[styles.challengeText, { color: theme.textPrimary }]}>
              ⚔️ <Text style={{ color: theme.accent }}>{game.challengerName}</Text> challenged you!
            </Text>
            <TouchableOpacity
              style={[styles.acceptBtn, { backgroundColor: '#23A55A' }]}
              onPress={() => onAccept(game.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.acceptBtnText}>Accept Challenge</Text>
            </TouchableOpacity>
          </View>
        )}

        {game.status === 'waiting' && game.challengerUid === userUid && (
          <View style={styles.waitingSection}>
            <Text style={[styles.challengeText, { color: theme.textMuted }]}>
              ⏳ Waiting for {game.challengedName} to accept...
            </Text>
          </View>
        )}

        {/* Active games */}
        {game.status === 'active' && game.type === 'tictactoe' && game.tictactoe && (
          <TicTacToeBoard
            ttt={game.tictactoe}
            userUid={userUid}
            onMove={(i) => onTicTacToeMove(game.id, i)}
          />
        )}

        {game.status === 'active' && game.type === 'wordguess' && game.wordguess && (
          <WordGuessBoard
            wg={game.wordguess}
            userUid={userUid}
            onGuess={(l) => onWordGuess(game.id, l)}
          />
        )}

        {/* Finished */}
        {game.status === 'finished' && (
          <>
            {game.type === 'tictactoe' && game.tictactoe && (
              <TicTacToeBoard
                ttt={game.tictactoe}
                userUid={userUid}
                onMove={() => {}}
              />
            )}
            {game.type === 'wordguess' && game.wordguess && (
              <WordGuessBoard
                wg={game.wordguess}
                userUid={userUid}
                onGuess={() => {}}
              />
            )}
            <TouchableOpacity
              style={[styles.dismissBtn, { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }]}
              onPress={() => {
                onDismiss(game.id);
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.dismissText, { color: theme.textMuted }]}>Dismiss Game</Text>
            </TouchableOpacity>
          </>
        )}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 300,
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  modalSubtitle: { fontSize: 12 },

  waitingSection: { alignItems: 'center', gap: 14, paddingVertical: 12 },
  challengeText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  acceptBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  acceptBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // TicTacToe
  tttContainer: { alignItems: 'center', gap: 12 },
  tttTurnText: { fontSize: 13, fontWeight: '700' },
  tttGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 210,
    gap: 6,
  },
  tttCell: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tttSymbol: { fontSize: 28, fontWeight: '900' },

  // Word Guess
  wgContainer: { alignItems: 'center', gap: 10 },
  hangmanEmoji: { fontSize: 48 },
  wgWrongText: { fontSize: 12, fontWeight: '700' },
  wgMasked: { fontSize: 22, fontWeight: '800', letterSpacing: 6 },
  wgReveal: { fontSize: 13 },
  wgResult: { fontSize: 18, fontWeight: '900' },
  wgWaitText: { fontSize: 12, textAlign: 'center', paddingVertical: 8 },
  keyboardContainer: { gap: 5, alignItems: 'center', width: '100%' },
  keyboardRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'center' },
  keyBtn: {
    width: 30,
    height: 34,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyBtnText: { fontSize: 12, fontWeight: '800' },

  dismissBtn: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  dismissText: { fontSize: 13, fontWeight: '700' },
});
