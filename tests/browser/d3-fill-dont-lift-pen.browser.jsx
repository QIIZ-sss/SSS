// D3 / QA-4: the bucket (Fill) cannot be used during DONT_LIFT_PEN; it still works with any other challenge.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import Canvas from '../../client/src/components/Canvas.jsx';
import { emitted } from '../lib/socket-stub.js';
window.addEventListener('error', (e) => { document.getElementById('out').textContent = 'FAIL  script error: ' + e.message; });
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const host = document.getElementById('root');
const root = createRoot(host);
const render = (challenge) => flushSync(() => root.render(<Canvas isDrawer={true} challenge={challenge} />));
const bucket = () => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('BUCKET'));
const ghost = () => { const cs = document.querySelectorAll('canvas'); return cs[cs.length - 1]; };
const bgAlpha = () => document.querySelectorAll('canvas')[1].getContext('2d').getImageData(10, 10, 1, 1).data[3];
const press = () => { // pointer down + up at canvas (10,10)
  const g = ghost(), r = g.getBoundingClientRect();
  const ev = (type) => new PointerEvent(type, { bubbles: true, cancelable: true, isPrimary: true, pointerId: 1, clientX: r.left + 10 * r.width / 640, clientY: r.top + 10 * r.height / 480 });
  flushSync(() => g.dispatchEvent(ev('pointerdown'))); flushSync(() => g.dispatchEvent(ev('pointerup')));
};
const emitsSince = (n) => emitted.slice(n).map((e) => e.ev);

(async () => {
  // 1) no challenge: bucket enabled and fills
  render('NONE');
  check('NONE: BUCKET button is enabled', bucket() && !bucket().disabled);
  flushSync(() => bucket().click());
  let n = emitted.length; press();
  check('NONE: bucket press emits draw_fill and fills the background', emitsSince(n).includes('draw_fill') && bgAlpha() === 255, emitsSince(n).join(','));

  // 2) the challenge switches to DONT_LIFT_PEN while the bucket is selected → disabled, tool back to pen
  render('DONT_LIFT_PEN');
  await new Promise((r) => setTimeout(r, 50)); // let the effect switch the tool back to the pen
  check('DONT_LIFT_PEN: BUCKET button is disabled', bucket() && bucket().disabled === true);
  check('DONT_LIFT_PEN: the button says why', /Don't Lift Pen/.test(bucket().title), bucket().title);
  flushSync(() => bucket().click());
  n = emitted.length; press();
  check('DONT_LIFT_PEN: pressing the canvas does not fill (no draw_fill); the pen is used instead (draw_begin)',
    !emitsSince(n).includes('draw_fill') && emitsSince(n).includes('draw_begin'), emitsSince(n).join(','));

  // 3) fresh canvas with DONT_LIFT_PEN from the start: clicking the disabled bucket never selects it
  root.unmount();
  const root2 = createRoot(host);
  flushSync(() => root2.render(<Canvas isDrawer={true} challenge="DONT_LIFT_PEN" />));
  flushSync(() => bucket().click());
  n = emitted.length; press();
  check('DONT_LIFT_PEN from the turn start: still no draw_fill and the background stays empty', !emitsSince(n).includes('draw_fill') && bgAlpha() === 0,
    emitsSince(n).join(','));

  // 4) other challenges keep the bucket
  flushSync(() => root2.render(<Canvas isDrawer={true} challenge="COLOUR_FIX" forcedColor="#EF4444" />));
  check('COLOUR_FIX: BUCKET enabled again', bucket() && !bucket().disabled);
  flushSync(() => bucket().click());
  n = emitted.length; press();
  const fill = emitted.slice(n).find((e) => e.ev === 'draw_fill');
  check('COLOUR_FIX: bucket fills with the locked colour', fill && fill.data.color === '#EF4444', fill && JSON.stringify(fill.data));

  document.getElementById('out').textContent = results.join('\n') + `\n\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`;
})();
