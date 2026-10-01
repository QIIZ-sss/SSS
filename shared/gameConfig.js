// Shared Game Configuration

export const GAME_MODES = {
  MULTIPLAYER_FFA: 'MULTIPLAYER_FFA',
  SOLO_AI: 'SOLO_AI',
  TEAM: 'TEAM'
};

export const MINI_CHALLENGES = {
  NONE: 'NONE',
  COLOUR_FIX: 'COLOUR_FIX',
  DONT_LIFT_PEN: 'DONT_LIFT_PEN',
  GEOMETRIC_ONLY: 'GEOMETRIC_ONLY'
};

export const CHALLENGE_DETAILS = {
  [MINI_CHALLENGES.NONE]: {
    name: 'Standard Drawing',
    description: 'No restrictions! Draw freely.',
    icon: '🎨'
  },
  [MINI_CHALLENGES.COLOUR_FIX]: {
    name: 'Colour Fix',
    description: 'You are restricted to a single forced colour for this round!',
    icon: '🎨'
  },
  [MINI_CHALLENGES.DONT_LIFT_PEN]: {
    name: "Don't Lift Pen",
    description: 'Draw in a single continuous line! Lifting your pen/mouse locks drawing.',
    icon: '✏️'
  },
  [MINI_CHALLENGES.GEOMETRIC_ONLY]: {
    name: 'Geometric Shapes Only',
    description: 'Only draw using Geometric Shapes (Circle, Rect, Triangle, Line) with live ghost preview!',
    icon: '📐'
  }
};

export const AVATARS = [
  { id: 'dog', emoji: '🐶', label: 'Puppy' },
  { id: 'cat', emoji: '🐱', label: 'Kitty' },
  { id: 'fox', emoji: '🦊', label: 'Foxy' },
  { id: 'panda', emoji: '🐼', label: 'Panda' },
  { id: 'lion', emoji: '🦁', label: 'Leo' },
  { id: 'robot', emoji: '🤖', label: 'Bot' },
  { id: 'alien', emoji: '👾', label: 'Invader' },
  { id: 'rocket', emoji: '🚀', label: 'Rocket' }
];

export const SCORING = {
  DRAWER_BASE_POINTS: 300,
  GUESSER_MAX_POINTS: 500,
  GUESSER_MIN_POINTS: 100
};

export const DEFAULT_COLOR_PALETTE = [
  '#18181B', '#EF4444', '#3B82F6', '#22C55E',
  '#EAB308', '#F97316', '#A855F7', '#EC4899',
  '#FFFFFF', '#64748B', '#06B6D4', '#78350F'
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GAME_MODES,
    MINI_CHALLENGES,
    CHALLENGE_DETAILS,
    AVATARS,
    SCORING,
    DEFAULT_COLOR_PALETTE
  };
}
