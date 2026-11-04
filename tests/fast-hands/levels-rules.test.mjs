import test from 'node:test';
import assert from 'node:assert/strict';
import {newMatch,beginRound,advance,press,pauseMatch,ITEMS,CATCH_WINDOW_MS} from '../../public/games/fast-hands/levels-rules.mjs';

const mid=()=>.5;
const ready=(mode='catch',options={})=>beginRound(newMatch(mode,{random:mid,...options}),1000,mid);
const signal=state=>advance(state,state.readyAt);
test('practice uses one unscored shot, catch is survival and duel is ten rounds',()=>{
 assert.equal(newMatch('catch',{practice:true}).total,1);
 assert.equal(newMatch('catch').total,Infinity);
 assert.equal(newMatch('duel').total,10);
 assert.equal(newMatch('duel').practice,false);
});
test('duel picks ten distinct silly items, shuffles and does not mutate the catalog',()=>{
 const before=JSON.stringify(ITEMS),a=newMatch('duel',{random:()=>0}),b=newMatch('duel',{random:()=>.999});
 assert.equal(new Set(a.items.map(i=>i.id)).size,10);
 assert.notDeepEqual(a.items.map(i=>i.id),b.items.map(i=>i.id));
 assert.equal(JSON.stringify(ITEMS),before);
 assert.ok(ITEMS.length>=10);
});
test('signal onset is established by the frame and never retroactively by input',()=>{
 const s=ready('duel');assert.equal(s.phase,'waiting');assert.equal(s.liveAt,null);
 const early=press(s,s.readyAt+500);assert.equal(early.results[0].reason,'early');
 const delayed=advance(s,s.readyAt+50);assert.equal(delayed.liveAt,s.readyAt+50);
 assert.equal(delayed.phase,'live');
});
test('foam ball has a fixed visible travel time and symmetrical inclusive catch window',()=>{
 for(const offset of [-CATCH_WINDOW_MS,0,CATCH_WINDOW_MS]){
  const s=signal(ready()),out=press(s,s.targetAt+offset);
  assert.equal(out.results[0].winner,'player');assert.equal(out.results[0].offsetMs,offset);
 }
});
test('too early, too late and missed catches finish once and do not score',()=>{
 const s=signal(ready());
 assert.equal(press(s,s.targetAt-CATCH_WINDOW_MS-1).results[0].reason,'early');
 assert.equal(press(s,s.targetAt+CATCH_WINDOW_MS+1).results[0].reason,'late');
 const missed=advance(s,s.targetAt+CATCH_WINDOW_MS+1);assert.equal(missed.results[0].reason,'miss');
 assert.equal(press(missed,s.targetAt+1000),missed);
});
test('AI time is selected before its signal, varies and is never rerolled on player press',()=>{
 const slow=beginRound(newMatch('duel'),0,()=>.99),fast=beginRound(newMatch('duel'),0,()=>0);
 assert.ok(slow.aiMs>fast.aiMs);assert.ok(fast.aiMs>=150);assert.ok(slow.aiMs<=900);
 const s=signal(slow),out=press(s,s.liveAt+300);
 assert.equal(out.results[0].aiMs,slow.aiMs);assert.equal(out.results[0].winner,'player');
});
test('duel rejects false starts, compares both clocks and permits honest ties',()=>{
 const waiting=ready('duel');assert.equal(press(waiting,1001).results[0].reason,'early');
 const s=signal(waiting);
 assert.equal(press(s,s.liveAt+s.aiMs-1).results[0].winner,'player');
 assert.equal(press(s,s.liveAt+s.aiMs+1).results[0].winner,'ai');
 assert.equal(press(s,s.liveAt+s.aiMs).results[0].winner,'draw');
 assert.equal(advance(s,s.liveAt+s.aiMs+1).results[0].winner,'ai');
});
test('all ten rounds are played even after six wins, and round start is idempotent',()=>{
 let s=newMatch('duel',{random:mid});
 for(let i=0;i<10;i++){
  s=beginRound(s,i*10000,mid);assert.equal(beginRound(s,i*10000,mid),s);
  s=signal(s);s=press(s,s.liveAt+50);
  assert.equal(s.results.length,i+1);assert.equal(s.phase,i===9?'done':'feedback');
 }
 assert.equal(beginRound(s,200000,mid),s);assert.equal(s.results.filter(r=>r.winner==='player').length,10);
});
test('practice completes at one and does not leak its score into a new match',()=>{
 let s=signal(ready('catch',{practice:true}));s=press(s,s.targetAt);
 assert.equal(s.phase,'done');assert.equal(s.results.length,1);assert.equal(newMatch('catch').results.length,0);
});
test('visibility pause retries the same unscored round with a fresh signal and same item',()=>{
 const s=signal(ready('duel')),p=pauseMatch(s);assert.equal(p.phase,'paused');assert.equal(p.results.length,0);
 assert.equal(press(p,10000),p);
 const next=beginRound(p,15000,()=>.2);assert.equal(next.phase,'waiting');assert.equal(next.items[0].id,s.items[0].id);assert.ok(next.readyAt>15000);
 assert.equal(pauseMatch(newMatch('duel')).phase,'idle');
});
test('invalid clocks cannot corrupt or finish a match; states and results are frozen',()=>{
 const s=ready();assert.equal(press(s,NaN),s);assert.equal(advance(s,Infinity),s);assert.equal(press(s,-1),s);
 assert.ok(Object.isFrozen(s));assert.ok(Object.isFrozen(s.items));assert.ok(Object.isFrozen(s.results));
 const out=press(s,s.startedAt);assert.ok(Object.isFrozen(out.results[0]));assert.equal(s.results.length,0);
});
