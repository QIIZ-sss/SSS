// useGameTimer: Custom Hook for Server-Authoritative Timer Synchronization
import { useState, useEffect } from 'react';
import { socket } from '../services/socket';
import { SOCKET_EVENTS } from '../../../shared/events';

export default function useGameTimer(initialTime = 0) {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);

  useEffect(() => {
    const handleTimerTick = ({ timeRemaining }) => {
      setTimeRemaining(timeRemaining);
    };

    const handleRoundChange = () => {
      // Auto-reset state on Server Round Change event
      setTimeRemaining(0);
    };

    socket.on(SOCKET_EVENTS.TIMER_TICK, handleTimerTick);
    socket.on(SOCKET_EVENTS.ROUND_CHANGE, handleRoundChange);

    return () => {
      socket.off(SOCKET_EVENTS.TIMER_TICK, handleTimerTick);
      socket.off(SOCKET_EVENTS.ROUND_CHANGE, handleRoundChange);
    };
  }, []);

  return timeRemaining;
}
