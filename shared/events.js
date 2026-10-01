// Shared Socket Event Constants for JUST DRAW IT

export const SOCKET_EVENTS = {
  // Room Events
  GET_ROOMS: 'get_rooms',
  ROOM_LIST_UPDATED: 'room_list_updated',
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  ROOM_DATA: 'room_data',
  SWITCH_TEAM: 'switch_team',
  TOGGLE_READY: 'toggle_ready',
  UPDATE_ROOM_SETTINGS: 'update_room_settings',

  // Game & Timer Cycle Events (Server-Authoritative)
  START_GAME: 'start_game',
  ROUND_START: 'round_start',
  ROUND_CHANGE: 'round_change', // Triggered automatically when turn changes
  TIMER_TICK: 'timer_tick',
  WORD_SELECTION: 'word_selection',
  SELECT_WORD: 'select_word',
  ROUND_END: 'round_end',
  GAME_OVER: 'game_over',

  // Drawing & Ghost Shape Preview Events
  DRAW_BEGIN: 'draw_begin',
  DRAW_PATH: 'draw_path',
  DRAW_END: 'draw_end',
  DRAW_CLEAR: 'draw_clear',
  DRAW_FILL: 'draw_fill',
  DRAW_SYNC: 'draw_sync',
  SHAPE_PREVIEW: 'shape_preview', // Real-time live draft ghost line sync

  // Chat & Guessing Events
  SEND_CHAT: 'send_chat',
  CHAT_MESSAGE: 'chat_message',
  CORRECT_GUESS: 'correct_guess',

  // Solo AI Events
  SOLO_AI_PREDICT: 'solo_ai_predict',
  SOLO_AI_PREDICTION_RESULT: 'solo_ai_prediction_result'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SOCKET_EVENTS };
}
