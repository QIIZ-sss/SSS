// Shared Constants across Server and Client

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
    description: 'You can only draw using Geometric Shapes (Circle, Rectangle, Triangle, Line)!',
    icon: '📐'
  }
};

export const SOCKET_EVENTS = {
  // Room events
  GET_ROOMS: 'get_rooms',
  ROOM_LIST_UPDATED: 'room_list_updated',
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  ROOM_DATA: 'room_data',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  SWITCH_TEAM: 'switch_team',
  TOGGLE_READY: 'toggle_ready',
  UPDATE_ROOM_SETTINGS: 'update_room_settings',

  // Game flow events
  START_GAME: 'start_game',
  ROUND_START: 'round_start',
  WORD_SELECTION: 'word_selection',
  SELECT_WORD: 'select_word',
  TIMER_TICK: 'timer_tick',
  ROUND_END: 'round_end',
  GAME_OVER: 'game_over',

  // Drawing events
  DRAW_BEGIN: 'draw_begin',
  DRAW_PATH: 'draw_path',
  DRAW_END: 'draw_end',
  DRAW_CLEAR: 'draw_clear',
  DRAW_FILL: 'draw_fill',
  DRAW_SYNC: 'draw_sync',

  // Chat & Guessing events
  SEND_CHAT: 'send_chat',
  CHAT_MESSAGE: 'chat_message',
  CORRECT_GUESS: 'correct_guess',

  // Solo AI events
  SOLO_AI_PREDICT: 'solo_ai_predict',
  SOLO_AI_PREDICTION_RESULT: 'solo_ai_prediction_result'
};

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
    SOCKET_EVENTS,
    SCORING,
    DEFAULT_COLOR_PALETTE
  };
}
