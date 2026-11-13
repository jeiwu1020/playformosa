import test from 'node:test';
import assert from 'node:assert/strict';
import {RoundOptions} from '../../public/games/overtime-pinball/round-options.js';
import {launchVelocity,releasePosition} from '../../public/games/overtime-pinball/interactions.js';
import {comboTarget} from '../../public/games/overtime-pinball/combo-routes.js';
import {BUMPERS} from '../../public/games/overtime-pinball/physics.js';
import {activityFor} from '../../public/games/overtime-pinball/activities.js';
import {readFileSync} from 'node:fs';
test('new or unavailable settings default to one minute; explicit modes survive',()=>{
 for(const value of [null,'{}','broken'])assert.equal(new RoundOptions({getItem:()=>value}).limit,60);
 assert.equal(new RoundOptions().limit,60);
 for(const limit of [0,60,180])assert.equal(new RoundOptions({getItem:()=>JSON.stringify({limit})}).limit,limit);
});
test('sound ON declares its own readable foreground',()=>assert.match(readFileSync(new URL('../../public/games/overtime-pinball/platform.css',import.meta.url),'utf8'),/#sound\[aria-pressed="true"\][^{]*\{[^}]*color:\s*#243d38/));
for(const id of ['copier','chair','water'])test(`${id}: perfect has stable route, ordinary replays, failure is recoverable`,()=>{
 const station=BUMPERS.find(o=>o.id===id),activity=activityFor(station);
 for(const side of ['left','right']){
 const i={activity:activity.id,side,result:{kind:'perfect',quality:1,charge:1.6}};
 assert.ok(comboTarget(i,station));
 for(const kind of ['perfect','partial','timeout','dizzy']){
 i.result={kind,quality:kind==='perfect'?1:.4,charge:4};
 const exit=releasePosition(i,station,'reverse'),v=launchVelocity(i,activity,station,BUMPERS,exit),speed=Math.hypot(v.vx,v.vz);
 assert.ok(speed<=44&&speed>=8,`${kind} speed ${speed}`);
 if(kind==='partial')assert.ok(v.vz<0,'ordinary returns upfield');
 if(kind==='timeout'||kind==='dizzy')assert.ok(speed<=16,'failure must not fire straight to exit at high speed');
 }
 }
});
import {Game,STEP} from '../../public/games/overtime-pinball/physics.js';
import {SOLID_PROPS} from '../../public/games/overtime-pinball/board-features.js';
import {stationShapes,sweepCircle,sweepRect} from '../../public/games/overtime-pinball/contact.js';
for(const view of ['original','reverse'])for(const id of ['copier','chair','water'])for(const kind of ['perfect','partial','timeout','dizzy'])test(`${view} ${id} ${kind}: actual engine releases outside solids and stays live for rescue`,()=>{
 const g=new Game({view,random:()=>.5,roundLimit:0});g.state='playing';
 const station=BUMPERS.find(o=>o.id===id),activity=activityFor(station);
 g.interaction={stationId:id,activity:activity.id,side:'left',result:{kind,quality:kind==='perfect'?1:.4,charge:4,points:100}};
 g.finishInteraction();assert.equal(g.interaction,null);
 for(const o of [...BUMPERS,...SOLID_PROPS])for(const s of stationShapes(o,view))assert.equal(!!(s.hx?sweepRect(g.ball,g.ball,s,g.ball.r):sweepCircle(g.ball,g.ball,s,g.ball.r)),false,`release overlaps ${o.id}`);
 for(let n=0;n<60;n++)g.update(STEP,{left:false,right:false});
 assert.equal(g.state,'playing');assert.ok(Number.isFinite(g.ball.x+g.ball.z));
});
// Follow the whole flight, not only its initial velocity: intervening furniture
// must not intercept a perfect route before the promised destination.
for(const view of ['original','reverse'])for(const side of ['left','right'])for(const [id,target] of [['chair','water'],['water','copier'],['copier','shredder']])test(`${view} ${side} perfect ${id} first physical contact is ${target}`,()=>{
 const g=new Game({view,random:()=>.5,roundLimit:60});g.state='playing';
 const station=BUMPERS.find(o=>o.id===id),activity=activityFor(station);
 g.interaction={stationId:id,activity:activity.id,side,result:{kind:'perfect',quality:1,charge:1.6,points:100}};
 g.finishInteraction();g.events=[];let contact;
 for(let n=0;n<240&&!contact;n++){
  g.update(STEP,{left:false,right:false});
  contact=g.events.find(e=>['hit','propHit','mailStart','interactionStart'].includes(e.type));
  assert.equal(g.state,'playing');assert.ok(Math.hypot(g.ball.vx,g.ball.vz)<=44.01);
 }
 assert.ok(contact,'route must reach a physical destination within two seconds');
 assert.equal(contact.id??contact.station?.id,target,JSON.stringify(contact));
});
for(const view of ['original','reverse'])for(const side of ['left','right'])test(`${view} ${side} chair actual input, launch animation and flight reach water`,()=>{
 const g=new Game({view,random:()=>.5,roundLimit:60});g.state='playing';
 const chair=BUMPERS.find(o=>o.id==='chair');Object.assign(g.ball,{x:chair.x,z:chair.z+4,vx:0,vz:0});
 assert.ok(g.startInteraction(chair,side,false));
 const neutral={left:false,right:false},hold={...neutral,[side]:true};
 for(let n=0;n<48;n++)g.update(STEP,neutral);
 for(let n=0;n<180;n++)g.update(STEP,hold);
 g.update(STEP,neutral);assert.equal(g.interaction.result.kind,'perfect');
 let launchFrames=0,last={...g.ball};
 for(let n=0;n<100&&g.interaction;n++){
  g.update(STEP,neutral);launchFrames++;
  assert.ok(Math.hypot(g.ball.x-last.x,g.ball.z-last.z)<1,'no launch teleport');
  last={...g.ball};
 }
 assert.ok(launchFrames>=60,'complete existing 0.55 second launch animation');assert.equal(g.interaction,null);
 g.events=[];let contact;
 for(let n=0;n<240&&!contact;n++){g.update(STEP,neutral);contact=g.events.find(e=>['hit','propHit','mailStart','interactionStart'].includes(e.type));}
 assert.equal(contact?.id??contact?.station?.id,'water');
});
