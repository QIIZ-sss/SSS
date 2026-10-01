// TimerManager: Server-Authoritative Timer Countdown System
const { SOCKET_EVENTS } = require('../../../shared/events');

class TimerManager {
  constructor(io) {
    this.io = io;
    this.roomTimers = new Map(); // roomId -> { timerId, remainingTime, callback }
  }

  /**
   * Start server-authoritative timer for a room session
   * @param {string} roomId 
   * @param {number} durationSeconds 
   * @param {Function} onExpireCallback 
   */
  startTimer(roomId, durationSeconds, onExpireCallback) {
    this.stopTimer(roomId);

    let remainingTime = durationSeconds;
    this.io.to(roomId).emit(SOCKET_EVENTS.TIMER_TICK, { timeRemaining: remainingTime });

    const timerId = setInterval(() => {
      remainingTime--;
      this.io.to(roomId).emit(SOCKET_EVENTS.TIMER_TICK, { timeRemaining: remainingTime });

      if (remainingTime <= 0) {
        this.stopTimer(roomId);
        if (onExpireCallback) onExpireCallback();
      }
    }, 1000);

    this.roomTimers.set(roomId, {
      timerId,
      getRemaining: () => remainingTime,
      stop: () => clearInterval(timerId)
    });
  }

  getRemainingTime(roomId) {
    const timer = this.roomTimers.get(roomId);
    return timer ? timer.getRemaining() : 0;
  }

  stopTimer(roomId) {
    const timer = this.roomTimers.get(roomId);
    if (timer) {
      timer.stop();
      this.roomTimers.delete(roomId);
    }
  }
}

module.exports = TimerManager;
