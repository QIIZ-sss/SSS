import React, { useState } from 'react';
import { MINI_CHALLENGES, CHALLENGE_DETAILS } from '../../../shared/gameConfig';

export default function ChallengeOverlay({ challenge, forcedColor }) {
  if (!challenge || challenge === MINI_CHALLENGES.NONE) return null;

  const info = CHALLENGE_DETAILS[challenge] || {
    name: challenge,
    description: 'Active Challenge Rule',
    icon: 'shapes'
  };

  return (
    <div className="w-full bg-surface-card border-2 border-border-dark shadow-[3px_3px_0px_#18181B] rounded-xl p-space-sm flex items-center justify-between gap-space-md mb-space-md">
      <div className="flex items-center gap-space-sm">
        <div className="w-9 h-9 rounded-lg bg-secondary-fixed flex items-center justify-center border-2 border-border-dark shadow-[2px_2px_0px_#18181B]">
          <span className="material-symbols-outlined text-border-dark text-[20px]">
            {challenge === MINI_CHALLENGES.COLOUR_FIX ? 'palette' : challenge === MINI_CHALLENGES.DONT_LIFT_PEN ? 'gesture' : 'shapes'}
          </span>
        </div>
        <div>
          <span className="font-headline-sm text-headline-sm text-on-surface uppercase tracking-wide">
            MODIFIER: {info.name}
          </span>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{info.description}</p>
        </div>
      </div>
      {challenge === MINI_CHALLENGES.COLOUR_FIX && forcedColor && (
        <div
          className="px-space-md py-1 rounded-full font-label-sm text-label-sm border-2 border-border-dark shadow-[2px_2px_0px_#18181B] font-bold"
          style={{ backgroundColor: forcedColor, color: forcedColor === '#ffffff' || forcedColor === '#facc15' ? '#000' : '#fff' }}
        >
          LOCKED COLOR
        </div>
      )}
    </div>
  );
}

// D3: same look as the existing MATCH RESULTS modal (App.jsx)
export function ChallengeModal({ icon, title, children, buttonLabel = 'GOT IT', onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-border-dark/80 flex items-center justify-center p-space-md" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-canvas-paper border-4 border-border-dark shadow-[8px_8px_0px_#18181B] rounded-2xl p-space-xl max-w-[500px] w-full text-center flex flex-col gap-space-md">
        <h2 className="font-headline-lg text-headline-lg uppercase text-border-dark">{icon} {title}</h2>
        <div className="bg-surface-card p-space-md rounded-xl border-2 border-border-dark flex flex-col gap-space-sm font-body-md text-body-md text-on-surface">
          {children}
        </div>
        <button
          className="w-full py-space-md rounded-xl bg-primary-container text-on-primary font-headline-md text-headline-md uppercase border-3 border-border-dark shadow-[4px_4px_0px_#18181B] hover:opacity-90 transition-all"
          onClick={onClose}
          type="button"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

const DONT_LIFT_PEN_RULE = 'Draw in one continuous stroke. Do NOT lift your pen, finger or mouse — lifting it locks the board for the rest of this turn.';

// D3: at the start of each turn (once per round + drawer) show the turn's challenge as a popup.
// Closed with GOT IT, or automatically when the turn is over. Shows only public data (no word).
export function ChallengeTurnPopup({ roomData }) {
  const [dismissedTurn, setDismissedTurn] = useState(null);
  const challenge = roomData && roomData.currentChallenge;
  const inTurn = roomData && (roomData.status === 'WORD_SELECTION' || roomData.status === 'PLAYING');
  if (!inTurn || !challenge || challenge === MINI_CHALLENGES.NONE) return null;

  const turnKey = `${roomData.code}:${roomData.currentRound}:${roomData.currentDrawer}`;
  if (dismissedTurn === turnKey) return null;

  const info = CHALLENGE_DETAILS[challenge] || { name: challenge, description: 'Active challenge', icon: '🎨' };
  return (
    <ChallengeModal icon={info.icon} title={`CHALLENGE: ${info.name}`} onClose={() => setDismissedTurn(turnKey)}>
      <p>{info.description}</p>
      {challenge === MINI_CHALLENGES.DONT_LIFT_PEN && (
        <p className="font-bold text-timer-red">⚠️ {DONT_LIFT_PEN_RULE}</p>
      )}
      {challenge === MINI_CHALLENGES.COLOUR_FIX && roomData.forcedColor && (
        <p className="flex items-center justify-center gap-space-sm font-bold">
          LOCKED COLOR
          <span className="inline-block w-6 h-6 rounded-full border-2 border-border-dark" style={{ backgroundColor: roomData.forcedColor }} />
        </p>
      )}
    </ChallengeModal>
  );
}
