import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import Canvas from '../../client/src/components/Canvas.jsx';
import { handlers, emitted } from '../lib/socket-stub.js';
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const host = document.getElementById('root'); host.style.width = '320px'; // displayed at half size → tests coordinate scaling (B1)
const root = createRoot(host);
flushSync(() => root.render(<Canvas isDrawer={true} challenge="NONE" />));
// stroke layer, background layer (D2), ghost layer; an old 2-canvas build has no background layer
const cs = document.querySelectorAll('canvas'); const stroke = cs[0]; const ghost = cs[cs.length - 1]; const bg = cs.length === 3 ? cs[1] : null;
const alphaAt = (c, x, y) => !c ? -1 : c.getContext('2d').getImageData(x, y, 1, 1).data[3];
const rgbaAt = (c, x, y) => !c ? [] : Array.from(c.getContext('2d').getImageData(x, y, 1, 1).data);
const rect = ghost.getBoundingClientRect();
const ptr = (type, cx, cy) => ghost.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, isPrimary: true, pointerId: 1, pointerType: 'touch', clientX: rect.left + cx * rect.width / 640, clientY: rect.top + cy * rect.height / 480 }));
const clickTool = (label) => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes(label)); flushSync(() => b.click()); };
const stroke_ = (pts) => { ptr('pointerdown', ...pts[0]); pts.slice(1).forEach(p => ptr('pointermove', ...p)); ptr('pointerup', ...pts[pts.length - 1]); };
// B1: computed touch-action + coordinate scaling
check('B1 drawing canvas computed touch-action is none', getComputedStyle(ghost).touchAction === 'none', getComputedStyle(ghost).touchAction);
check('B1 canvas displayed smaller than 640px (scaling exercised)', rect.width < 640, `${rect.width}px`);
// draw a horizontal line y=240 from x=100..540
stroke_([[100, 240], [320, 240], [540, 240]]);
check('B1 pointer stroke lands at the scaled canvas coordinate (x=320,y=240)', alphaAt(stroke, 320, 240) > 200, `alpha=${alphaAt(stroke, 320, 240)}`);
const begin = emitted.find(e => e.ev === 'draw_begin');
check('B1 emitted coordinates are in 640x480 space', begin && Math.round(begin.data.x) === 100 && Math.round(begin.data.y) === 240, begin && JSON.stringify(begin.data));
// bucket fill → background layer only
clickTool('BUCKET'); ptr('pointerdown', 10, 10);
check('D2 bucket fills the background layer', alphaAt(bg, 10, 10) === 255);
check('D2 bucket does not paint over strokes (stroke layer untouched outside the line)', alphaAt(stroke, 10, 10) === 0);
// erase the middle of the line
clickTool('ERASER'); stroke_([[300, 200], [320, 240], [340, 280]]);
check('E-01 eraser removes stroke pixels where it passes (alpha 0, not white paint)', alphaAt(stroke, 320, 240) === 0, `alpha=${alphaAt(stroke, 320, 240)}`);
check('E-01 the rest of the line is kept', alphaAt(stroke, 150, 240) > 200 && alphaAt(stroke, 500, 240) > 200);
check('E-01 background (bucket colour) is still there under the erased spot', alphaAt(bg, 320, 240) === 255, JSON.stringify(rgbaAt(bg, 320, 240)));
const er = emitted.filter(e => e.ev === 'draw_path' && e.data.tool === 'eraser');
check('E-02 eraser strokes are sent with tool:"eraser" (existing payload)', er.length > 0);
// E-04 back to pen draws normally
clickTool('PEN'); stroke_([[320, 100], [330, 110]]);
check('E-04 pen after eraser draws again (source-over restored)', alphaAt(stroke, 325, 105) > 200);
// E-02/E-06: replay the emitted history on a guesser canvas via draw_sync
const history = emitted.filter(e => ['draw_begin', 'draw_path', 'draw_end', 'draw_fill'].includes(e.ev))
  .map(e => ({ type: { draw_begin: 'begin', draw_path: 'path', draw_end: 'end', draw_fill: 'fill' }[e.ev], ...e.data }));
const host2 = document.createElement('div'); host2.style.width = '640px'; document.body.appendChild(host2);
flushSync(() => createRoot(host2).render(<Canvas isDrawer={false} challenge="NONE" />));
const cs2 = host2.querySelectorAll('canvas'); const stroke2 = cs2[0]; const bg2 = cs2.length === 3 ? cs2[1] : null;
(handlers['draw_sync'] || []).forEach(fn => fn(history)); // both canvases subscribed; second one is the guesser
check('E-06 replay: erased spot is empty on the guesser canvas', alphaAt(stroke2, 320, 240) === 0, `alpha=${alphaAt(stroke2, 320, 240)}`);
check('E-06 replay: kept parts and later pen stroke are present', alphaAt(stroke2, 150, 240) > 200 && alphaAt(stroke2, 325, 105) > 200);
check('E-06 replay: background fill present under the erased spot', alphaAt(bg2, 320, 240) === 255);
// clear resets both layers
(handlers['draw_clear'] || []).forEach(fn => fn());
check('D2 clear empties stroke and background layers', alphaAt(stroke2, 150, 240) === 0 && alphaAt(bg2, 10, 10) === 0);
check('Solo AI reads the stroke layer: first <canvas> in the DOM is the stroke canvas', document.querySelectorAll('canvas')[0] === stroke);
document.getElementById('out').textContent = results.join('\n') + `\n\n${results.filter(r => r.startsWith('PASS')).length}/${results.length} PASS`;
