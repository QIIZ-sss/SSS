// T1-24: drawing tools use Material Symbols icons (same icon set as the rest of the UI) with an accessible name; no emoji in the toolbar.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Canvas from '../../client/src/components/Canvas.jsx';
const results = []; const check = (n, c, d = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const html = renderToStaticMarkup(<Canvas isDrawer={true} challenge="NONE" />);
const tools = { Pen: 'edit', Eraser: 'ink_eraser', Bucket: 'format_color_fill', Circle: 'circle', Rect: 'crop_square', Triangle: 'change_history', Line: 'horizontal_rule', Clear: 'delete' };
const missing = Object.entries(tools).filter(([name, icon]) => !new RegExp(`<button[^>]*aria-label="${name}"[^>]*title="${name}"[^>]*>(?:(?!</button>).)*material-symbols-outlined[^>]*>${icon}</span>`).test(html));
check('all 8 tools: Material Symbols icon + aria-label + title', missing.length === 0, missing.map(([n]) => n).join(','));
check('labels still shown (PEN … CLEAR)', ['PEN', 'ERASER', 'BUCKET', 'CIRCLE', 'RECT', 'TRIANGLE', 'LINE', 'CLEAR'].every((l) => html.includes(l)));
const emoji = ['✏️', '🧹', '🪣', '⚪', '⬜', '🔺', '📏', '🗑️'].filter((e) => html.includes(e));
check('no emoji icons left in the toolbar', emoji.length === 0, emoji.join(' '));
const geo = renderToStaticMarkup(<Canvas isDrawer={true} challenge="GEOMETRIC_ONLY" />);
check('GEOMETRIC_ONLY still hides pen / eraser / bucket', !geo.includes('aria-label="Pen"') && !geo.includes('aria-label="Bucket"') && geo.includes('aria-label="Circle"'));
console.log(results.join('\n')); console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} PASS`);
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
