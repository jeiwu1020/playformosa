import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {harness} from './helpers/scene-harness.mjs';

// Exercise the real Phaser constructor boundary, not a string match. Pointer
// managers are unused: all taps activate native DOM buttons, keyboard is Phaser.
test('game boot does not install unused pointer managers that cancel page gestures',()=>{
 const source=fs.readFileSync(new URL('../../public/games/courtesy-contest/game.js',import.meta.url),'utf8');
 let config;
 vm.runInNewContext(source.slice(source.indexOf("const parent=$('game');")),{
  $:()=>({clientWidth:375,clientHeight:360}),window:{},CourtesyScene:class{},
  Phaser:{AUTO:0,Scale:{NONE:0},Game:class{constructor(value){config=value;this.scale={resize(){}};}}},
  ResizeObserver:class{observe(){}}
 });
 assert.equal(config.input.touch,false,'No touchstart/move/end prevention on canvas');
 assert.equal(config.input.mouse,false,'No wheel cancellation over the canvas');
 assert.notEqual(config.input.keyboard,false,'Keyboard controls stay enabled');
});

test('rapid repeated offer attempts advance only one exchange while the button is busy',()=>{
 const h=harness();
 for(let n=0;n<9;n++){h.s.offer();h.tick(50);}
 assert.equal(h.s.count,0);assert.equal(h.s.busy,true);
 h.tick(600);h.s.offer();assert.equal(h.s.count,1);h.tick(970);assert.equal(h.s.count,2);
});

test('rapid alternating actions cannot duplicate a Thanks departure or revive an offer',()=>{
 const h=harness();h.s.offer();h.tick(60);h.s.thank();
 for(let n=0;n<8;n++){h.s.offer();h.s.thank();h.tick(50);}
 assert.equal(h.s.count,0);assert.equal(h.s.seated,true);assert.equal(h.s.reason,'thanks');
 h.tick(2000);assert.equal(h.s.phase,'result');assert.equal(h.s.count,0);
});

test('repeated repel attempts cannot consume or replay a vanished intruder',()=>{
 const h=harness({random:()=>0});h.s.count=4;h.s.maybeThreat();
 assert.ok(h.s.threat);h.s.repel();const firstCooldown=h.s.cooldownUntil;
 for(let n=0;n<8;n++){h.tick(50);h.s.repel();}
 assert.equal(h.s.threat,null);assert.equal(h.s.cooldownUntil,firstCooldown);
 assert.equal(h.audioCalls.filter(name=>name==='repel').length,1);
});
