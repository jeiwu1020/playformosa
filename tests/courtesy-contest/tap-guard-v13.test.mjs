import test from 'node:test';
import assert from 'node:assert/strict';
import {installButtonTapGuard} from '../../public/games/courtesy-contest/touch-controls.js';
function harness(){
 const handlers={},options={};let time=0;
 let hit;const root={isConnected:true,contains:()=>true},doc={elementFromPoint(){return hit;},addEventListener(type,fn,opts){handlers[type]=fn;options[type]=opts;}};
 const button={isConnected:true,disabled:false,clicks:0,closest:s=>s==='button'?button:s==='.app, #instructions, #rank-dialog'?root:null,click(){if(!this.disabled)this.clicks++;}};
 const child={closest:s=>s==='button'?button:s==='.app, #instructions, #rank-dialog'?root:null};
 hit=child;installButtonTapGuard(doc,()=>time);
 const p=(id=1,x=10,y=10)=>({identifier:id,clientX:x,clientY:y});
 function event(type,{target=child,touches,changedTouches=[p()],cancelable=true,defaultPrevented=false,cancellationWorks=true}={}){const e={target,touches:touches??(type==='touchend'||type==='touchcancel'?[]:[p()]),changedTouches,cancelable,prevented:false,defaultPrevented,preventDefault(){if(cancellationWorks){this.prevented=true;this.defaultPrevented=true;}}};handlers[type](e);return e;}
 function tap(target=child,wait=70){hit=target;event('touchstart',{target});time+=wait;const e=event('touchend',{target});if(!e.prevented&&target.closest?.('button'))target.closest('button').click();return e;}
 return{handlers,options,button,child,root,event,tap,p,setHit:target=>hit=target,advance:ms=>time+=ms};
}
test('first tap stays native; rapid second tap activates exactly once without zoom default',()=>{const h=harness();assert.equal(h.tap().prevented,false);h.advance(80);assert.equal(h.tap().prevented,true);assert.equal(h.button.clicks,2);});
test('repeated taps preserve one activation per completed tap',()=>{const h=harness();for(let i=0;i<12;i++){h.advance(50);h.tap();}assert.equal(h.button.clicks,12);});
test('disabled button transitions do not produce extra gameplay activations',()=>{const h=harness();h.tap();h.button.disabled=true;h.advance(80);assert.equal(h.tap().prevented,true);assert.equal(h.button.clicks,1);h.button.disabled=false;h.advance(80);h.tap();assert.equal(h.button.clicks,2);});
test('nearby button transitions preserve activation; outside game is untouched',()=>{const h=harness();h.tap();const other={...h.button,closest:s=>s==='button'?other:s==='.app, #instructions, #rank-dialog'?h.root:null};h.advance(50);assert.equal(h.tap(other).prevented,true);h.advance(50);assert.equal(h.tap({closest:()=>null}).prevented,false);});
test('slow second tap stays native',()=>{const h=harness();h.tap();h.advance(400);assert.equal(h.tap().prevented,false);});
test('long press stays native and clears the quick-tap sequence',()=>{const h=harness();h.tap();h.advance(30);assert.equal(h.tap(h.child,600).prevented,false);h.advance(30);assert.equal(h.tap().prevented,false);});
test('scrolling or sliding off button does not get cancelled or synthesize clicks',()=>{const h=harness();h.tap();h.event('touchstart');h.event('touchmove',{changedTouches:[h.p(1,40,50)],touches:[h.p(1,40,50)]});assert.equal(h.event('touchend',{changedTouches:[h.p(1,40,50)]}).prevented,false);assert.equal(h.button.clicks,1);});
test('multi-touch pinch including a second finger outside the game never gets cancelled',()=>{const h=harness();h.tap();h.event('touchstart');h.event('touchstart',{target:{closest:()=>null},touches:[h.p(),h.p(2)],changedTouches:[h.p(2)]});h.event('touchend',{target:{closest:()=>null},touches:[h.p()],changedTouches:[h.p(2)]});assert.equal(h.event('touchend').prevented,false);assert.equal(h.button.clicks,1);});
test('touchcancel clears the sequence',()=>{const h=harness();h.tap();h.event('touchstart');h.event('touchcancel');h.advance(30);assert.equal(h.tap().prevented,false);});
test('noncancelable touchend never synthesizes a duplicate click',()=>{const h=harness();h.tap();h.event('touchstart');h.advance(50);assert.equal(h.event('touchend',{cancelable:false}).prevented,false);assert.equal(h.button.clicks,1);});
test('gesture observers are passive; only scoped final tap can cancel',()=>{const h=harness();for(const type of ['touchstart','touchmove','touchcancel'])assert.equal(h.options[type].passive,true);assert.equal(h.options.touchend.passive,false);});

test('ending over another target never synthesizes a click on the original button',()=>{const h=harness();h.tap();h.event('touchstart');h.setHit({closest:()=>null});h.advance(50);assert.equal(h.event('touchend').prevented,false);assert.equal(h.button.clicks,1);});
test('removed buttons are never activated',()=>{const h=harness();h.tap();h.event('touchstart');h.button.isConnected=false;h.advance(50);assert.equal(h.event('touchend').prevented,false);assert.equal(h.button.clicks,1);});

test('already cancelled touch never synthesizes a click',()=>{const h=harness();h.tap();h.event('touchstart');h.advance(50);h.event('touchend',{defaultPrevented:true});assert.equal(h.button.clicks,1);});
test('failed cancellation never adds a synthetic click',()=>{const h=harness();h.tap();h.event('touchstart');h.advance(50);h.event('touchend',{cancellationWorks:false});assert.equal(h.button.clicks,1);});
