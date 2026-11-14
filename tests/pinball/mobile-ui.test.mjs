import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const {LabelPreference,poolNotice}=await import('../../public/games/overtime-pinball/mobile-ui.js').catch(()=>({}));
test('equipment names default off, explicit choice persists without altering existing records',()=>{
 assert.equal(typeof LabelPreference,'function');
 const values=new Map([['other-record','123']]),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const p=new LabelPreference(storage);assert.equal(p.enabled,false);p.set(true);assert.equal(new LabelPreference(storage).enabled,true);p.set(false);assert.equal(new LabelPreference(storage).enabled,false);assert.equal(values.get('other-record'),'123');
});
test('malformed and blocked label storage stay safe; current-session choice still works',()=>{
 assert.equal(typeof LabelPreference,'function');
 for(const value of ['true','{}','garbage'])assert.equal(new LabelPreference({getItem:()=>value}).enabled,false);
 const p=new LabelPreference({getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}});p.set(true);assert.equal(p.enabled,true);assert.equal(p.saved,false);
});
test('collecting pool is quiet, frenzy appears briefly and claim deadline remains visible',()=>{
 assert.equal(typeof poolNotice,'function');
 let state={key:null,until:0};
 assert.equal(poolNotice(state,{phase:'collecting'},0),false);
 assert.equal(poolNotice(state,{phase:'frenzy'},1),true);
 assert.equal(poolNotice(state,{phase:'frenzy'},4.1),false);
 assert.equal(poolNotice(state,{phase:'claim'},10),true);
 assert.equal(poolNotice(state,{phase:'claim'},19),true);
 assert.equal(poolNotice(state,{phase:'collecting'},20),false);
 assert.equal(poolNotice(state,{phase:'frenzy'},21),true);
 assert.equal(poolNotice(state,{phase:'frenzy'},0),true);
});
test('mobile fixed cue prioritizes rescue over lottery without changing original controls',async()=>{
 const {mountMobileUI}=await import('../../public/games/overtime-pinball/mobile-ui.js');
 const dom=new JSDOM('<body><input class="label-names-option" type="checkbox"><p class="label-save-notice"></p><div id="doorWarning">L 救球</div><div id="bossStatus" hidden></div><div id="lotteryStatus">封門保護 9秒</div></body>');
 const calls=[],ui=mountMobileUI({document:dom.window.document,labels:{setNamesVisible:v=>calls.push(v)}});ui.sync({playClock:0});
 assert.equal(dom.window.document.getElementById('mobileCue')?.textContent,'L 救球');
 dom.window.document.getElementById('doorWarning').hidden=true;ui.sync({playClock:1});assert.equal(dom.window.document.getElementById('mobileCue').textContent,'封門保護 9秒');
 assert.equal(dom.window.document.getElementById('lotteryStatus').textContent,'封門保護 9秒');assert.deepEqual(calls,[false]);dom.window.close();
});
test('pause keeps current pool readable after its mobile banner expires',async()=>{
 const {mountMobileUI}=await import('../../public/games/overtime-pinball/mobile-ui.js');
 const dom=new JSDOM('<body><section id="pauseScreen"><div class="pause-settings"></div></section><div id="overtimeStatus">影分身掉落才退場 · 待核准 $750</div></body>');
 const ui=mountMobileUI({document:dom.window.document,labels:{setNamesVisible(){}}});ui.sync({overtime:{phase:'frenzy'},playClock:0});ui.sync({overtime:{phase:'frenzy'},playClock:4});
 assert.equal(dom.window.document.body.dataset.poolNotice,'false');assert.equal(dom.window.document.getElementById('poolDetails')?.textContent,'影分身掉落才退場 · 待核准 $750');dom.window.close();
});
test('names toggle changes only equipment tags, not hint or lottery ownership',async()=>{
 const T=await import('../../public/games/overtime-pinball/vendor/three.module.min.js');
 const {createStationLabels}=await import('../../public/games/overtime-pinball/station-labels.js');
 const dom=new JSDOM('<body><div id="playStatus"></div></body>');Object.assign(globalThis,{document:dom.window.document,innerWidth:390,innerHeight:844});
 try{const office=new T.Group(),camera=new T.PerspectiveCamera(38,390/844,.1,200);camera.position.set(0,10,30);camera.lookAt(0,0,0);camera.updateMatrixWorld();const labels=createStationLabels(T,[{id:'chair',x:0,z:0}]);const args={office,camera,game:{ball:{x:0,z:0},round:{},interaction:null},mode:'playing',time:1,frame:{x:0,y:0,w:390,h:844}};
 labels.update(args);const tag=labels.root.querySelector('[data-station="chair"]');assert.equal(tag.hidden,true);assert.ok(document.getElementById('stationHint').textContent);assert.ok(labels.root.querySelector('[data-station="lottery"]'));
 labels.setNamesVisible(true);labels.update(args);assert.equal(tag.hidden,false);const anchor=[tag.style.left,tag.style.top];labels.setNamesVisible(false);labels.update(args);assert.equal(tag.hidden,true);assert.deepEqual([tag.style.left,tag.style.top],anchor);
 }finally{dom.window.close();delete globalThis.document;delete globalThis.innerWidth;delete globalThis.innerHeight;}
});
