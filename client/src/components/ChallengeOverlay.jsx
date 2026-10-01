import React from 'react';
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
