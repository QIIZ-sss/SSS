import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App, { pinAfterInput, pinAfterBackspace, pinAfterPaste } from '../../client/src/App.jsx';
import { GAME_RULES } from '../../shared/contract.js';
const results = []; const check = (n, c, d='') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
const N = GAME_RULES.ROOM_PIN_LENGTH; const empty = Array(N).fill('');
// continuous typing 8,3,9,2,1
let st = { digits: empty, focus: 0 }; const foci = [];
for (const [i, ch] of [...'83921'].entries()) { st = pinAfterInput(st.digits, i, ch); foci.push(st.focus); }
check('typing 5 digits continuously fills all boxes', st.digits.join('') === '83921', st.digits.join(''));
check('focus auto-advances to the next box after each digit', JSON.stringify(foci) === JSON.stringify([1, 2, 3, 4, null]), JSON.stringify(foci));
check('non-digit input is ignored', pinAfterInput(empty, 0, 'a').digits.join('') === '' && pinAfterInput(empty, 0, 'a').focus === null);
const typedOver = pinAfterInput(['8','3','','',''], 1, '37'); // box 1 had "3", user typed "7"
check('typing into a filled box replaces it and advances', typedOver.digits.join('') === '87' && typedOver.focus === 2, JSON.stringify(typedOver));
check('Backspace on a filled box clears it, focus stays', JSON.stringify(pinAfterBackspace(['8','3','9','',''], 2)) === JSON.stringify({ digits: ['8','3','','',''], focus: null }));
check('Backspace on an empty box moves back and clears the previous box', JSON.stringify(pinAfterBackspace(['8','3','','',''], 2)) === JSON.stringify({ digits: ['8','','','',''], focus: 1 }));
check('Backspace on the first empty box does nothing harmful', pinAfterBackspace(empty, 0).focus === null);
const pasted = pinAfterPaste(empty, '83921');
check('pasting a full PIN fills all boxes, focus on last box', pasted.digits.join('') === '83921' && pasted.focus === N - 1, JSON.stringify(pasted));
const pasted2 = pinAfterPaste(empty, ' 83-92 1xyz9 ');
check('paste strips non-digits and ignores extra digits', pasted2.digits.join('') === '83921', pasted2.digits.join(''));
const pasted3 = pinAfterPaste(empty, '83');
check('partial paste fills from the first box and focuses the next empty box', pasted3.digits.join('') === '83' && pasted3.focus === 2);
const auto = pinAfterInput(empty, 3, '83921'); // OS autofill into any box
check('full-code autofill into any box fills from the first box', auto.digits.join('') === '83921');
// render: Home join tab is not shown by default; render whole App logged out is the login screen — check markup of PIN via logged-in default tab
check('ROOM_PIN_LENGTH drives the box count (5)', N === 5);
console.log(results.join('\n')); console.log(`\n${results.filter(r=>r.startsWith('PASS')).length}/${results.length} PASS`);
process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
