import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{JSDOM}from'jsdom';
import {mountLevel} from '../../public/games/fast-hands/levels-app.mjs';
import {mountLevelSharing} from '../../public/games/fast-hands/levels-sharing.mjs';
function harness(mode='catch',options={}){
 const dom=new JSDOM(readFileSync(new URL(`../../public/games/fast-hands/${mode}.html`,import.meta.url),'utf8'),{url:`https://game.test/games/fast-hands/${mode}.html`,pretendToBeVisual:true});let now=0,frame;const calls={cue:0,unlock:0,capture:[],images:[],reset:0,force:0,cards:[]},urls=[];
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};dom.window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new dom.window.Event('close'));};dom.window.URL.createObjectURL=()=>`blob:result-${urls.length+1}`;dom.window.URL.revokeObjectURL=url=>urls.push(url);
 const $=id=>dom.window.document.getElementById(id);let rankingOptions,muted=false;
 const app=mountLevel({document:dom.window.document,window:dom.window,clock:()=>now,random:()=>.5,requestFrame:fn=>(frame=fn,1),cancelFrame:()=>{},clubFactory:()=>({destroy(){},blocked:()=>false}),stageLoader:()=>null,
 sharingFactory:opts=>mountLevelSharing({...opts,createImage:async args=>{calls.cards.push(args);return{blob:new dom.window.Blob(['score PNG'],{type:'image/png'}),filename:'test-card.png'};}}),
 soundFactory:()=>({unlock(){calls.unlock++;},cue(){calls.cue++;},setMuted(v){muted=v;},get muted(){return muted;},destroy(){}}),
 rankingFactory:opts=>(rankingOptions=opts,{captureResult:s=>calls.capture.push(s),reset(){calls.reset++;},showBoard(){const d=dom.window.document.createElement('dialog');dom.window.document.body.append(d);rankingOptions.onOpen(d,'result');calls.rankingDialog=d;},destroy(){}}),
 imageCapture:args=>{calls.images.push(args);return Promise.resolve({blob:new dom.window.Blob(['png'],{type:'image/png'})});},...options});
 const tick=target=>{while(now+100<target){now+=100;frame(now);}now=target;frame(now);};
 return {dom,app,$,calls,urls,tick,get now(){return now;},click:id=>$(id).click(),next(){tick(now+1700);$('roundButton').click();},finish(){this.click('roundButton');this.click('actionButton');this.next();if(mode==='catch'){this.click('actionButton');}else for(let i=0;i<10;i++){this.click('actionButton');if(i<9)this.next();}},rankingReturn(){calls.rankingDialog.close();rankingOptions.onClose('result');}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('live cue fires once per actual onset and replay cannot score, cue or recapture',async()=>{
 const h=harness();h.click('roundButton');h.tick(h.app.state.readyAt);h.tick(h.now+100);assert.equal(h.calls.cue,1);assert.ok(h.calls.unlock);h.click('actionButton');h.next();h.tick(h.app.state.readyAt);h.tick(h.now+100);h.click('actionButton');h.tick(h.now+600);await flush();
 assert.equal(h.calls.capture.length,1);assert.equal(h.calls.images.length,1);const state=h.app.state,cues=h.calls.cue;
 h.click('summaryReplay');assert.equal(h.$('replayReturn').hidden,false);assert.equal(h.$('roundButton').hidden,true);h.click('actionButton');h.tick(h.now+4000);assert.equal(h.app.state,state);assert.equal(h.calls.cue,cues);assert.equal(h.calls.capture.length,1);assert.equal(h.calls.images.length,1);h.click('replayReturn');assert.equal(h.$('summary').open,true);h.app.destroy();
});
test('finale image appears only after successful actual capture and is reused across ranking/replay',async()=>{
 const h=harness();h.finish();assert.equal(h.$('summary').open,false);h.tick(h.now+520);await flush();assert.equal(h.calls.images.length,1);assert.equal(h.$('summaryImage').hidden,false);assert.match(h.$('summaryImage').src,/blob:result/);assert.equal(h.calls.cards.length,1);assert.equal(h.calls.cards[0].result.mode,'catch');assert.equal(h.$('summaryDownload').disabled,false);
 h.click('summaryRanking');assert.equal(h.$('summary').open,false);h.rankingReturn();assert.equal(h.$('summary').open,true);assert.equal(h.calls.images.length,1);h.click('summaryAgain');assert.equal(h.$('summaryImage').hidden,true);assert.equal(h.urls.length,1);assert.equal(h.app.state.phase,'waiting');h.app.destroy();
});
test('catch success cannot start again before its 1100ms hand lowering is complete',()=>{
 const h=harness();h.click('roundButton');h.tick(h.app.state.readyAt);h.tick(h.app.state.targetAt);h.click('actionButton');const result=h.app.state;h.tick(h.now+520);h.click('roundButton');assert.equal(h.app.state,result);h.tick(h.now+580);h.click('roundButton');assert.equal(h.app.state.phase,'waiting');h.app.destroy();
});
test('duel preserves final-round loser before revealing overall winner and waits 1600ms for summary',async()=>{
 const h=harness('duel');h.click('roundButton');h.click('actionButton');h.next();for(let i=0;i<9;i++){h.tick(h.app.state.readyAt);h.tick(h.now+100);h.click('actionButton');h.next();}h.click('actionButton');assert.equal(h.app.state.results.at(-1).winner,'ai');assert.match(h.$('signal').textContent,/太早|快手王/);h.tick(h.now+900);assert.match(h.$('roundStatus').textContent,/你贏|9/);assert.equal(h.$('summary').open,false);h.tick(h.now+700);await flush();assert.equal(h.$('summary').open,true);assert.equal(h.calls.capture.length,1);assert.equal(h.calls.images.length,1);h.app.destroy();
});
test('failed image exposes no stock image and failed clipboard offers current result text',async()=>{
 const h=harness('catch',{imageCapture:()=>Promise.reject(Error('denied'))});h.finish();h.tick(h.now+520);await flush();assert.equal(h.$('summaryImage').hidden,true);assert.equal(h.$('summaryImage').hasAttribute('src'),false);h.click('summaryCopy');await flush();assert.equal(h.$('summaryShareText').hidden,false);assert.match(h.$('summaryShareText').value,/0 關|0關/);assert.match(h.$('summaryShareText').value,/catch.html/);h.app.destroy();
});
test('3D finale requests forced fresh pixels before encoding and never recaptures on replay',async()=>{
 const paints=[];let captures=0;
 const h=harness('catch',{stageLoader:()=>({available:true,artReady:true,render:(s,n,opts)=>(paints.push({s,n,opts}),true),dispose(){}}),imageCapture:args=>{captures++;assert.ok(args.canvas);assert.equal(args.renderFrame(),true);assert.equal(paints.at(-1).opts.force,true);assert.equal(paints.at(-1).s.phase,'done');return Promise.resolve({blob:new Blob(['png'],{type:'image/png'})});}});
 h.finish();h.tick(h.now+520);await flush();assert.equal(captures,1);assert.equal(h.$('summaryImage').hidden,false);h.click('summaryReplay');h.tick(h.now+3000);assert.equal(captures,1);h.app.destroy();
});
test('late image completion after retry cannot install the old result image',async()=>{
 let resolve;const h=harness('catch',{imageCapture:()=>new Promise(r=>resolve=r)});h.finish();h.tick(h.now+520);assert.equal(h.$('summary').open,true);h.click('summaryAgain');resolve({blob:new Blob(['png'],{type:'image/png'})});await flush();assert.equal(h.$('summaryImage').hidden,true);assert.equal(h.$('summaryImage').hasAttribute('src'),false);assert.equal(h.$('summaryDownload').hasAttribute('href'),false);h.app.destroy();
});
test('last-round replay labels its true tenth round and auto-returns to the same reusable result',async()=>{
 const h=harness('duel');h.finish();h.tick(h.now+1600);await flush();const state=h.app.state,image=h.$('summaryImage').src;h.click('summaryReplay');assert.match(h.$('roundLabel').textContent,/10/);assert.equal(h.$('roundDots').children.length,1);assert.match(h.$('roundDots').children[0].getAttribute('aria-label'),/第 10 回合/);h.tick(h.now+600);assert.equal(h.$('summary').open,true);assert.equal(h.$('replayReturn').hidden,true);assert.equal(h.app.state,state);assert.equal(h.$('summaryImage').src,image);h.click('summaryReplay');assert.equal(h.$('summary').open,false);h.click('replayReturn');assert.equal(h.$('summary').open,true);assert.equal(h.calls.images.length,1);h.app.destroy();
});
test('catch replay preserves original stage label and backgrounding returns to result',()=>{
 const h=harness();h.click('roundButton');h.click('actionButton');h.next();for(let i=0;i<2;i++){h.tick(h.app.state.readyAt);h.tick(h.app.state.targetAt);h.click('actionButton');h.next();}h.click('actionButton');h.tick(h.now+520);h.click('summaryReplay');assert.equal(h.$('opponentScore').textContent,'3');assert.match(h.$('roundDots').children[0].getAttribute('aria-label'),/第 3 關/);h.dom.window.dispatchEvent(new h.dom.window.Event('blur'));assert.equal(h.$('summary').open,true);assert.equal(h.$('replayReturn').hidden,true);h.app.destroy();
});
test('opening the club during replay stops playback without stacking the result dialog',async()=>{
 let menu=false;const h=harness('catch',{clubFactory:()=>({destroy(){},blocked:()=>menu})});h.finish();h.tick(h.now+520);await flush();h.click('summaryReplay');menu=true;h.tick(h.now+100);assert.equal(h.$('replayReturn').hidden,true);assert.equal(h.$('summary').open,false);menu=false;h.tick(h.now+100);assert.equal(h.$('summary').open,true);assert.equal(h.calls.images.length,1);h.app.destroy();
});

test('both completed levels hand the frozen result and original image promise to the sharing adapter exactly once',async()=>{for(const mode of ['catch','duel']){const calls=[];let resets=0,destroys=0;const h=harness(mode,{sharingFactory:()=>({prepare:(state,frame)=>calls.push({state,frame}),reset(){resets++},destroy(){destroys++}})});h.finish();h.tick(h.now+1700);await flush();assert.equal(calls.length,1);assert.equal(calls[0].state,h.app.state);assert.ok(calls[0].frame instanceof Promise);assert.equal((await calls[0].frame).blob.type,'image/png');h.click('summaryReplay');h.tick(h.now+10000);assert.equal(calls.length,1);assert.equal(h.$('summary').open,true);h.click('summaryAgain');assert.ok(resets>=2);h.app.destroy();assert.equal(destroys,1);}});

for(const mode of ['catch','duel'])test(`${mode} direct result upload uses the existing frozen result and keeps consent inside summary`,async()=>{
 const {mountLevelLeaderboard}=await import('../../public/games/fast-hands/levels-leaderboard.mjs');const h=harness(mode,{rankingFactory:mountLevelLeaderboard});const requests=[];h.dom.window.fetch=async(url,options)=>{requests.push({url,options});return{ok:true,status:200,json:async()=>({accepted:true,bestUpdated:true,own:{rank:27,score:mode==='catch'?1:10,nickname:'新玩家'}})}};
 try{h.click('roundButton');h.click('actionButton');h.next();const rounds=mode==='catch'?1:10;for(let n=0;n<rounds;n++){h.tick(h.app.state.readyAt);h.tick(mode==='catch'?h.app.state.targetAt:h.now+100);h.click('actionButton');if(n<rounds-1||mode==='catch')h.next();}if(mode==='catch')h.click('actionButton');h.tick(h.now+1700);await flush();assert.equal(h.$('summary').open,true);assert.equal(h.$('summaryUpload').disabled,false);const state=h.app.state;h.click('summaryUpload');assert.equal(h.$('summary').open,true);assert.equal(h.$('levelRankingDialog').open,false);assert.ok(h.$('summaryUploadHost').contains(h.$('levelRankingUpload')));assert.equal(requests.length,0);
 h.$('levelRankingNickname').value='新玩家';h.click('levelRankingSubmit');await flush();assert.equal(requests.length,0);h.$('levelRankingConsent').checked=true;h.click('levelRankingSubmit');await flush();assert.equal(requests.length,1);assert.equal(JSON.parse(requests[0].options.body).score,mode==='catch'?1:10);assert.match(h.$('levelRankingUploadStatus').textContent,/27/);assert.equal(h.app.state,state);h.click('summaryReplay');h.tick(h.now+10000);assert.equal(h.$('summary').open,true);assert.equal(h.$('summaryUpload').disabled,true);assert.equal(h.app.state,state);assert.equal(requests.length,1);
 }finally{h.app.destroy();h.dom.window.close()}
});
