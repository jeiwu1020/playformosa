import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {mountLevel} from '../../public/games/fast-hands/levels-app.mjs';
const root=new URL('../../public/games/fast-hands/',import.meta.url);
function fixture(mode){
 const dom=new JSDOM(readFileSync(new URL(`${mode}.html`,root),'utf8'),{url:`https://qa.test/games/fast-hands/${mode}`,pretendToBeVisual:true});let now=0,frame,blocked=false;
 const $=id=>dom.window.document.getElementById(id);
 const app=mountLevel({document:dom.window.document,window:dom.window,clock:()=>now,random:()=>.5,requestFrame:fn=>(frame=fn,1),cancelFrame:()=>{},clubFactory:()=>({blocked:()=>blocked,destroy(){}}),stageLoader:()=>null,imageCapture:()=>Promise.reject(Error('No pixel capture needed')),soundFactory:()=>({unlock(){},cue(){},destroy(){},muted:false,setMuted(){}})});
 function tick(target){while(now+100<target){now+=100;frame(now);}now=target;frame(now);}
 return {dom,app,$,tick,get now(){return now;},block(value){blocked=value;},click(id){$(id)?.click();},complete(win){this.click('roundButton');if(win){tick(app.state.readyAt);tick(mode==='catch'?app.state.targetAt:now+100);}this.click('actionButton');},close(){app.destroy();dom.window.close();}};
}
for(const mode of ['catch','duel'])for(const win of [false,true]){
 test(`${mode} ${win?'won':'lost'} practice offers explicit fixed-slot repeat and formal choices without automatic start`,()=>{
  const h=fixture(mode);try{h.complete(win);assert.equal(h.app.state.practice,true);assert.equal(h.app.state.phase,'done');const original=h.app.state;
   assert.ok(h.$('practiceAgain'),'dedicated repeat-practice button');assert.equal(h.$('practiceAgain').parentElement,h.$('roundButton').parentElement);assert.equal(h.$('practiceAgain').hidden,false);assert.equal(h.$('practiceAgain').textContent,'再練一次');assert.equal(h.$('roundButton').textContent,'正式開始');assert.equal(h.dom.window.document.body.dataset.practiceChoices,'true');assert.equal(h.$('practiceButton').hidden,true);
   h.tick(h.now+5000);assert.equal(h.app.state,original);assert.equal(h.$('summary').open,false);assert.equal(h.$('practiceAgain').disabled,false);assert.equal(h.$('roundButton').disabled,false);
   h.click('roundButton');assert.equal(h.app.state.practice,false);assert.equal(h.app.state.phase,'waiting');assert.equal(h.app.state.results.length,0);assert.equal(h.$('practiceAgain').hidden,true);assert.equal(h.$('roundButton').hidden,true);assert.equal(h.dom.window.document.body.dataset.practiceChoices,'false');
  }finally{h.close()}
 });
 test(`${mode} ${win?'won':'lost'} practice can repeat directly without leaking results or requiring a second click`,()=>{
  const h=fixture(mode);try{h.complete(win);h.tick(h.now+1700);h.click('practiceAgain');assert.equal(h.app.state.practice,true);assert.equal(h.app.state.phase,'waiting');assert.equal(h.app.state.results.length,0);const waiting=h.app.state;h.click('practiceAgain');assert.equal(h.app.state,waiting);assert.equal(h.$('summary').open,false);
  }finally{h.close()}
 });
}
for(const mode of ['catch','duel'])test(`${mode} repeat choice respects motion and modal blocking`,()=>{
 const h=fixture(mode);try{h.complete(true);const result=h.app.state;h.click('practiceAgain');assert.equal(h.app.state,result);h.tick(h.now+1700);h.block(true);h.click('practiceAgain');assert.equal(h.app.state,result);h.block(false);h.click('practiceAgain');assert.equal(h.app.state.phase,'waiting');assert.equal(h.app.state.practice,true);}finally{h.close()}
});
