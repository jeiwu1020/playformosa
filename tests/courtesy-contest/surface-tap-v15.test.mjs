import test from 'node:test';
import assert from 'node:assert/strict';
import {installButtonTapGuard} from '../../public/games/courtesy-contest/touch-controls.js';
const surfaceSelector='.app, #instructions, #rank-dialog';
function harness(){
 const handlers={};let at=0,hit;
 const root={isConnected:true};
 function element(kind='plain',scope=root){const el={isConnected:true,disabled:false,clicks:0,closest(selector){if(selector===surfaceSelector)return scope;if(selector==='button')return kind==='button'?el:null;return selector.includes(kind)&&!['plain','button','canvas'].includes(kind)?el:null;},click(){this.clicks++;}};return el;}
 const plain=element(),canvas=element('canvas'),button=element('button');
 const doc={elementFromPoint(){return hit;},addEventListener(type,fn){handlers[type]=fn;}};
 installButtonTapGuard(doc,()=>at);
 const point=(x=50,y=50,id=1)=>({clientX:x,clientY:y,identifier:id});
 const fire=(type,target=plain,options={})=>{const event={target,touches:type==='touchend'||type==='touchcancel'?[]:[point()],changedTouches:[point()],cancelable:true,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...options};handlers[type](event);return event;};
 function tap(target=plain,{x=50,y=50,duration=60}={}){hit=target;fire('touchstart',target,{touches:[point(x,y)]});at+=duration;return fire('touchend',target,{changedTouches:[point(x,y)]});}
 return{root,plain,canvas,button,element,point,fire,tap,advance:ms=>at+=ms,hit:el=>hit=el};
}
test('rapid double tap on the canvas cancels only the second zoom default',()=>{const h=harness();assert.equal(h.tap(h.canvas).defaultPrevented,false);h.advance(80);assert.equal(h.tap(h.canvas).defaultPrevented,true);assert.equal(h.canvas.clicks,0);});
test('nearby non-input descendants share the same guarded game surface',()=>{const h=harness();h.tap(h.canvas);h.advance(80);assert.equal(h.tap(h.plain,{x:56,y:53}).defaultPrevented,true);});
test('distant taps do not form a zoom gesture',()=>{const h=harness();h.tap();h.advance(80);assert.equal(h.tap(h.canvas,{x:160}).defaultPrevented,false);});
for(const kind of ['input','textarea','select','label','contenteditable','data-selectable','a[href]'])test(`${kind} interaction is never cancelled`,()=>{const h=harness(),el=h.element(kind);h.tap(el);h.advance(80);assert.equal(h.tap(el).defaultPrevented,false);});
test('outside the game or across different game dialogs is never cancelled',()=>{const h=harness(),outside=h.element('plain',null),dialog=h.element('plain',{isConnected:true});h.tap(outside);h.advance(50);assert.equal(h.tap(outside).defaultPrevented,false);h.tap();h.advance(50);assert.equal(h.tap(dialog).defaultPrevented,false);});
test('non-input background drags preserve native scrolling',()=>{const h=harness();h.tap();h.fire('touchstart');h.fire('touchmove',h.plain,{touches:[h.point(50,90)]});h.hit(h.plain);assert.equal(h.fire('touchend',h.plain,{changedTouches:[h.point(50,90)]}).defaultPrevented,false);});
test('two-finger zoom on background is not cancelled, including its final finger',()=>{const h=harness();h.tap();h.fire('touchstart');h.fire('touchstart',h.plain,{touches:[h.point(),h.point(70,50,2)]});h.fire('touchend',h.plain,{touches:[h.point()],changedTouches:[h.point(70,50,2)]});assert.equal(h.fire('touchend').defaultPrevented,false);});
test('long press and cancelled gesture reset the background sequence',()=>{const h=harness();h.tap();assert.equal(h.tap(h.plain,{duration:600}).defaultPrevented,false);assert.equal(h.tap().defaultPrevented,false);h.fire('touchcancel');assert.equal(h.tap().defaultPrevented,false);});
test('moving outside the game on release is not swallowed',()=>{const h=harness();h.tap();h.fire('touchstart');h.hit(h.element('plain',null));h.advance(80);assert.equal(h.fire('touchend').defaultPrevented,false);});
test('buttons still get exactly one replacement click on repeat, no background click',()=>{const h=harness();h.tap(h.button);h.advance(80);assert.equal(h.tap(h.button).defaultPrevented,true);assert.equal(h.button.clicks,1);h.advance(80);assert.equal(h.tap(h.plain).defaultPrevented,true);assert.equal(h.plain.clicks,0);});

test('a repelled intruder button may disappear between taps without re-enabling zoom',()=>{const h=harness();h.tap(h.button);h.button.isConnected=false;h.advance(80);assert.equal(h.tap(h.canvas).defaultPrevented,true);assert.equal(h.canvas.clicks,0);});
test('a new button under the second tap is activated once, not the previous target',()=>{const h=harness();h.tap(h.plain);h.advance(80);assert.equal(h.tap(h.button).defaultPrevented,true);assert.equal(h.button.clicks,1);});
