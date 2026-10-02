import React from 'react';

export default function TimerBadge({ seconds }) {
  const isUrgent = seconds <= 10;
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const formattedTime = `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`; // T1-03: 90 s → 01:30

  return (
    <div
      id="round-timer-box"
      className={`bg-timer-red text-on-error px-space-lg py-space-xs rounded-xl shadow-lg flex items-center gap-space-xs ${
        isUrgent ? 'animate-pulse' : ''
      }`}
    >
      <span className="material-symbols-outlined text-[26px]">alarm</span>
      <div className="flex flex-col">
        <span className="font-label-sm text-label-sm opacity-90 uppercase leading-none">TIME LEFT</span>
        <span id="countdown-timer" className="font-headline-lg text-headline-lg tracking-wider font-mono">
          {formattedTime}
        </span>
      </div>
    </div>
  );
}
