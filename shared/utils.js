// Shared Utility functions
const SCORING = {
  DRAWER_BASE_POINTS: 300,
  GUESSER_MAX_POINTS: 500,
  GUESSER_MIN_POINTS: 100
};

export function calculateGuesserScore(guessOrder, totalPlayers, timeRemaining, roundDuration) {
  const maxScore = SCORING.GUESSER_MAX_POINTS;
  const minScore = SCORING.GUESSER_MIN_POINTS;
  const timeRatio = Math.max(0, Math.min(1, timeRemaining / (roundDuration || 60)));
  const rankDecay = Math.pow(0.85, Math.max(0, guessOrder - 1));
  const rawScore = (maxScore * 0.6 * rankDecay) + (maxScore * 0.4 * timeRatio);
  return Math.max(minScore, Math.round(rawScore));
}

export function calculateDrawerScore(correctCount, totalGuessers) {
  if (!totalGuessers || totalGuessers <= 0) return 0;
  const ratio = Math.min(1, Math.max(0, correctCount / totalGuessers));
  return Math.round(SCORING.DRAWER_BASE_POINTS * ratio);
}

export function normalizeGuess(text) {
  if (!text) return '';
  return text.trim().toLowerCase().replace(/[^a-z0-9ก-๙\s]/gi, '').replace(/\s+/g, ' ');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateGuesserScore,
    calculateDrawerScore,
    normalizeGuess
  };
}
