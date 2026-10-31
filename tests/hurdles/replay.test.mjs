import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,step,pose,DT} from '../../public/games/hurdles/physics.mjs';
const api=await import('../../public/games/hurdles/replay.mjs').catch(()=>({}));
const recorder=()=>{assert.equal(typeof api.createHurdlesReplay,'function');return api.createHurdlesReplay();};
test('recorder is strictly bounded to final five seconds including exact finish and eight hurdle states',()=>{
 const r=recorder(),s=fresh();
 for(let i=0;i<=21600;i++){s.t=i/120;s.x=Math.min(110,s.t);s.hurdles[7].hit=true;s.hurdles[7].hitTime=179;s.hurdles[7].angle=.73;s.hurdles[7].part='右腳';if(i===21600)s.phase='done';r.record(s);}
 assert.ok(r.size<=602);assert.ok(r.firstTime>=175-1e-9);assert.equal(r.ready,true);assert.equal(r.active,false);assert.equal(r.start(),true);assert.equal(r.current.state.hurdles.length,8);
 r.advance(100);assert.equal(r.active,false);assert.equal(r.current.state.t,180);assert.equal(r.current.state.phase,'done');assert.equal(r.current.state.hurdles[7].hitTime,179);assert.equal(r.current.state.hurdles[7].angle,.73);assert.deepEqual(r.current.points,pose(s));
});
test('snapshots are independent, include actual limb endpoints and never rerecord completed results',()=>{
 const r=recorder(),s=fresh();r.record(s);s.j[2]=.8;s.hurdles[0].hit=true;s.hurdles[0].angle=.4;s.t=1;r.record(s);s.t=2;s.phase='done';r.record(s);const end=structuredClone(s);s.j[2]=99;s.hurdles[0].angle=9;r.record(s);
 r.start();assert.equal(r.current.state.j[2],0);assert.equal(r.current.state.hurdles[0].hit,false);assert.deepEqual(r.current.points,pose(fresh()));r.advance(1);assert.equal(r.current.state.j[2],.8);r.advance(1);assert.deepEqual(r.current.state,end);assert.deepEqual(r.current.points,pose(end));
});
test('pause stop repeat reset and invalid clocks do not change live state or playback position',()=>{
 const r=recorder(),s=fresh();r.record(s);s.t=1;r.record(s);s.t=2;s.phase='dnf';r.record(s);const live=structuredClone(s);assert.equal(r.start(),true);r.advance(.5);assert.equal(r.time,.5);r.setPaused(true);r.advance(100);assert.equal(r.time,.5);r.setPaused(false);r.advance(NaN);r.advance(-1);assert.equal(r.time,.5);r.stop();assert.equal(r.active,false);assert.equal(r.start(),true);assert.equal(r.time,0);r.advance(2);assert.equal(r.current.state.phase,'dnf');assert.deepEqual(s,live);r.reset();assert.equal(r.size,0);assert.equal(r.ready,false);assert.equal(r.start(),false);
});
test('real no-jump collision race and stationary timeout replay recorded states without physics rerun',()=>{
 for(const stationary of [false,true]){const r=recorder(),s=fresh();r.record(s);for(let i=0;i<21610&&!['done','dnf'].includes(s.phase);i++){const t=i*DT,keys=[false,false,false,false];if(!stationary)keys[2+Math.floor(t/.28)%2]=t%.28<.13;step(s,keys);r.record(s);}assert.ok(['done','dnf'].includes(s.phase));assert.equal(s.phase,stationary?'dnf':'done');if(!stationary)assert.ok(s.stats.hits>0);const end=structuredClone(s);assert.ok(r.size<=602);assert.equal(r.start(),true);let count=0;while(r.active&&count++<1000)r.advance(1/120);assert.deepEqual(r.current.state,end);assert.deepEqual(s,end);assert.deepEqual(r.current.points,pose(end));}
});
