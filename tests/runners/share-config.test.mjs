import test from 'node:test';import assert from 'node:assert/strict';
import{resultText}from'../../public/games/sprint-100m/share.mjs';
test('runner share text uses exact frozen verdict and current-origin canonical path',()=>{globalThis.location={origin:'https://example.test'};const text=resultText({seconds:123.45,verdict:'四肢全員到齊。',gameId:'run-1500m',title:'四肢各有想法｜1500公尺',timeBasis:'街機版實際遊戲用時'});assert.ok(text.includes('/games/run-1500m/'));assert.ok(text.includes('街機版實際遊戲用時'));assert.ok(text.includes('四肢全員到齊。'));assert.ok(!text.includes('100公尺'));});
