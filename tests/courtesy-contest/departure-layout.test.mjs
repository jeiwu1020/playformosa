import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers/scene-harness.mjs';
for(const reason of ['stolen','timer','thanks'])test(`${reason} reserves the controls' measured height through departure and result, then resets on replay`,()=>{
 const h=harness(),controls=h.node('controls'),app=h.node('app');controls.offsetHeight=152;
 if(reason==='thanks'){h.s.thank();h.tick(300);}else if(reason==='stolen'){h.s.threat={type:0};h.s.steal();}else h.s.depart(false,'timer');
 assert.equal(h.s.phase,'depart');assert.equal(controls.hidden,true);assert.equal(controls.style.height,'152px');assert.equal(app.classList.contains('is-departing'),true);
 assert.equal(h.node('offer').disabled,true);assert.equal(h.node('thanks').disabled,true);
 h.tick(1800);assert.equal(h.s.phase,'result');assert.equal(app.classList.contains('is-departing'),true);assert.equal(controls.style.height,'152px');
 h.s.start();assert.equal(h.s.phase,'play');assert.equal(controls.hidden,false);assert.equal(controls.style.height,'');assert.equal(app.classList.contains('is-departing'),false);
 controls.offsetHeight=180;h.s.depart(false,'timer');assert.equal(controls.style.height,'180px','a new round captures current layout, not stale height');
});
