import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../../public/games/run-400m/race.mjs';
import {readFileSync} from 'node:fs';
test('guidance clearly names next foot and slow/good/fast cadence',()=>{
 assert.equal(typeof engine.guidance,'function');
 const r=engine.createRace(),p=r.runners[0];r.phase='race';p.started=true;p.steps=3;p.lastLeg=0;p.lastStep=0;r.time=.2;p.beatTarget=.46;p.stepRating='perfect';
 assert.equal(engine.guidance(r).nextFoot,'S');assert.match(engine.guidance(r).rhythm,/踩準/);
 p.lastLeg=1;assert.equal(engine.guidance(r).nextFoot,'A');
 p.stepRating='early';assert.match(engine.guidance(r).rhythm,/太早/);
 r.time=.9;assert.match(engine.guidance(r).rhythm,/太晚/);
 p.fall=.8;assert.equal(engine.guidance(r).nextFoot,'');
});
test('guidance steers toward the safe bank and releases hands once stable',()=>{
 assert.equal(typeof engine.guidance,'function');
 const r=engine.createRace(),p=r.runners[0];r.phase='race';p.started=true;p.distance=20;p.v=8;p.bank=-.3;
 assert.match(engine.guidance(r).hands,/J/);p.bank=.6;assert.match(engine.guidance(r).hands,/K/);p.bank=engine.targetBank(p);assert.match(engine.guidance(r).hands,/先放開/);
});
test('visible rhythm display and recommended foot are wired into the real app',()=>{
 const html=readFileSync(new URL('../../public/games/run-400m/index.html',import.meta.url),'utf8'),app=readFileSync(new URL('../../public/games/run-400m/app.mjs',import.meta.url),'utf8');
 for(const id of ['rhythmState','nextFoot','rhythmNeedle','handCue'])assert.ok(html.includes(`id="${id}"`),id);
 assert.match(app,/guidance\(race\)/);assert.match(app,/data-next/);
});
test('finish-line hand cue overrides release-hands coaching',()=>{
 const r=engine.createRace(),p=r.runners[0];r.phase='race';p.started=true;p.distance=399.2;p.bank=0;
 assert.match(engine.guidance(r).hands,/J＋K/);assert.doesNotMatch(engine.guidance(r).hands,/放開/);
});
