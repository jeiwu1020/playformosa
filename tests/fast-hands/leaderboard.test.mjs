import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {NOTE_FLOOR_MS} from '../../public/games/fast-hands/challenge.mjs';

// Fails clearly until the dedicated controller exists. Import after the assertion
// so the first RED reports the missing feature, not an unresolved-import error.
let module;
try { module = await import('../../public/games/fast-hands/leaderboard.mjs'); } catch (error) { if(error.code!=='ERR_MODULE_NOT_FOUND')throw error; }
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const valid={phase:'success',elapsedMs:532.123456};
const uuid='12345678-1234-4234-8234-123456789abc';
const ok=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
const deferred=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve};};
function fixture({fetcher,storageBlocked=false,uuidBlocked=false}={}){
 assert.ok(module,'dedicated Fast Hands leaderboard controller must exist');
 const dom=new JSDOM(readFileSync(new URL('../../public/games/fast-hands/index.html',import.meta.url),'utf8'),{url:'https://playformosa.test/games/fast-hands/'}),w=dom.window,d=w.document;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
 w.HTMLDialogElement.prototype.close=function(){if(!this.open)return;this.open=false;this.dispatchEvent(new w.Event('close'))};
 if(storageBlocked)Object.defineProperty(w,'localStorage',{get(){throw Error('blocked')}});
 if(uuidBlocked)w.crypto.randomUUID=()=>{throw Error('no crypto')};
 const requests=[],returns=[];let n=0;
 if(!uuidBlocked)w.crypto.randomUUID=()=>`${uuid.slice(0,-3)}${String(++n).padStart(3,'0')}`;
 const controller=module.mountFastHandsLeaderboard({document:d,fetcher:async(url,options)=>{requests.push({url,options});const response=await (fetcher?fetcher(url,options):ok({entries:[]}));if(!options.method){const data=await response.json(),mode=new URL(url,'https://test').searchParams.get('mode');return {...response,json:async()=>({game:'fast-hands',rules:'shuttle-v3-'+mode,unit:'ms',...data})}}return response;},onOpen(dialog){for(const other of d.querySelectorAll('dialog[open]'))other.close();dialog.showModal()},onClose:origin=>returns.push(origin)});
 const $=id=>d.getElementById(id);
 const cleanup=()=>{controller.destroy();dom.window.close()};
 const capture=(state=valid,mode='mouse',opts={})=>controller.captureResult(state,mode,opts);
 const upload=()=>{controller.showUpload();$('rankingNickname').value='快手玩家';$('rankingConsent').checked=true;};
 const click=()=>{$('rankingSubmit').click();return flush()};
 return {dom,w,d,$,controller,requests,returns,cleanup,capture,upload,click};
}

test('capture accepts only an actual positive success strictly before the physical floor',()=>{
 assert.ok(module,'dedicated Fast Hands leaderboard controller must exist');
 const freeze=module.freezeLeaderboardResult;
 for(const phase of ['idle','armed','outbound','returning','failed','cancelled'])assert.equal(freeze({...valid,phase},'mouse'),null);
 for(const elapsedMs of [0,-1,NaN,Infinity,'532',NOTE_FLOOR_MS,NOTE_FLOOR_MS+1])assert.equal(freeze({...valid,elapsedMs},'mouse'),null);
 assert.equal(freeze(valid,'auto'),null);assert.equal(freeze(valid,'mouse',{demo:true}),null);
 const result=freeze(valid,'touch');assert.deepEqual(result,{mode:'touch',rules:'shuttle-v3-touch',score:532.123456});assert.ok(Object.isFrozen(result));
});

test('no request on mount, success, demo, invalid result, or merely opening the upload panel',()=>{
 const h=fixture();try{h.capture();h.upload();assert.equal(h.requests.length,0);h.controller.reset();assert.equal(h.$('resultUpload').disabled,true);h.controller.showUpload();assert.equal(h.$('rankingDialog').open,false);}finally{h.cleanup()}
});

test('board GETs select independent modes and never include an upload payload',async()=>{
 const h=fixture();try{h.controller.showBoard({origin:'entry',mode:'mouse'});await flush();h.$('rankingTouch').click();await flush();assert.deepEqual(h.requests.map(x=>x.url),['/api/leaderboard?game=fast-hands&mode=mouse','/api/leaderboard?game=fast-hands&mode=touch']);assert.ok(h.requests.every(x=>!x.options.method&&!x.options.body));assert.equal(h.$('rankingTouch').getAttribute('aria-pressed'),'true');assert.equal(h.$('rankingMouse').getAttribute('aria-pressed'),'false');h.$('rankingClose').click();assert.deepEqual(h.returns,['entry']);}finally{h.cleanup()}
});

test('manual upload freezes original touch raw milliseconds despite changing viewed board and displayed text',async()=>{
 const h=fixture({fetcher:(url)=>url.includes('submissions')?ok({accepted:true,bestUpdated:true}):ok({entries:[]})});try{h.capture(valid,'touch');h.controller.showBoard({origin:'result',mode:'mouse'});await flush();h.$('rankingMouse').click();h.$('rankingClose').click();h.$('resultTime').textContent='0.001';h.upload();await h.click();const posts=h.requests.filter(x=>x.options.method==='POST');assert.equal(posts.length,1);const body=JSON.parse(posts[0].options.body);assert.deepEqual(Object.keys(body).sort(),['deviceId','game','nickname','rules','score','status','submissionId','unit'].sort());assert.equal(body.game,'fast-hands');assert.equal(body.rules,'shuttle-v3-touch');assert.equal(body.unit,'ms');assert.equal(body.status,'success');assert.equal(body.score,532.123456);assert.match(body.deviceId,/^[a-f\d-]{36}$/i);assert.notEqual(body.deviceId,body.submissionId);assert.match(h.$('rankingFrozenScore').textContent,/觸控/);assert.equal(h.$('rankingSubmit').disabled,true);assert.match(h.$('rankingUploadStatus').textContent,/已收錄|最佳/);}finally{h.cleanup()}
});

test('invalid nickname or absent consent never posts; Unicode length counts code points',async()=>{
 const h=fixture({fetcher:()=>ok({accepted:true})});try{h.capture();h.upload();for(const name of ['', ' ', 'x'.repeat(21),'<b>', 'hello\u0001', 'a\u200db']){h.$('rankingNickname').value=name;await h.click();assert.equal(h.requests.length,0,name)}h.$('rankingNickname').value='😀'.repeat(20);h.$('rankingConsent').checked=false;await h.click();assert.equal(h.requests.length,0);h.$('rankingConsent').checked=true;await h.click();assert.equal(h.requests.length,1);assert.equal(JSON.parse(h.requests[0].options.body).nickname,'😀'.repeat(20));}finally{h.cleanup()}
});

test('same-round reopen and recapture preserve completed upload and prevent a second post',async()=>{
 const h=fixture({fetcher:()=>ok({accepted:true,bestUpdated:false})});try{const state={...valid};h.capture(state);h.upload();await h.click();h.$('rankingClose').click();h.capture(state);h.upload();await h.click();assert.equal(h.requests.length,1);assert.equal(h.$('rankingSubmit').textContent,'已提交');assert.equal(h.$('rankingNickname').disabled,true);assert.equal(h.$('rankingConsent').disabled,true);}finally{h.cleanup()}
});

test('pending double-click posts once and close reports uncertainty without unlocking payload',async()=>{
 const waiting=deferred(),h=fixture({fetcher:()=>waiting.promise});try{h.capture();h.upload();h.$('rankingSubmit').click();h.$('rankingSubmit').click();assert.equal(h.requests.length,1);h.$('rankingClose').click();assert.equal(h.requests[0].options.signal.aborted,true);h.upload();assert.match(h.$('rankingUploadStatus').textContent,/可能已收錄/);assert.equal(h.$('rankingNickname').disabled,true);waiting.resolve(ok({accepted:true,bestUpdated:true}));await flush();assert.match(h.$('rankingUploadStatus').textContent,/可能已收錄/);}finally{h.cleanup()}
});

test('errors permit at most three manual attempts with identical payload across close and reopen',async()=>{
 const h=fixture({fetcher:()=>ok({error:'busy'},503)});try{h.capture();h.upload();for(let i=0;i<4;i++){await h.click();h.$('rankingClose').click();h.upload();h.$('rankingNickname').value='changed';}assert.equal(h.requests.length,3);assert.equal(new Set(h.requests.map(x=>x.options.body)).size,1);assert.equal(h.$('rankingSubmit').disabled,true);assert.match(h.$('rankingUploadStatus').textContent,/3次|次數/);}finally{h.cleanup()}
});

test('429 rate limit is actionable and repeated nonretryable errors stop further attempts',async()=>{
 for(const status of [429,400,403,409,503]){const h=fixture({fetcher:()=>ok({error:'error'},status)});try{h.capture();h.upload();await h.click();assert.match(h.$('rankingUploadStatus').textContent,status===429?/達限|稍後/:/無法|未確認|稍後|拒絕|變更/);if([400,403,409].includes(status)){await h.click();assert.equal(h.requests.length,1)}}finally{h.cleanup()}}
});

test('new round invalidates pending upload response and a new success gets a fresh submission ID',async()=>{
 const waiting=deferred();let first=true;const h=fixture({fetcher:()=>first?(first=false,waiting.promise):ok({accepted:true})});try{h.capture();h.upload();h.$('rankingSubmit').click();const old=JSON.parse(h.requests[0].options.body);h.controller.reset();assert.equal(h.$('rankingDialog').open,false);assert.equal(h.$('resultUpload').disabled,true);assert.equal(h.requests[0].options.signal.aborted,true);h.capture({...valid,elapsedMs:42.1},'touch');h.upload();await h.click();waiting.resolve(ok({accepted:true,bestUpdated:true}));await flush();const next=JSON.parse(h.requests[1].options.body);assert.notEqual(next.submissionId,old.submissionId);assert.equal(next.score,42.1);assert.match(h.$('rankingFrozenScore').textContent,/觸控/);assert.equal(h.$('rankingSubmit').textContent,'已提交');}finally{h.cleanup()}
});

test('a slower board response cannot overwrite a newer selected mode or reopen a closed view',async()=>{
 const waiting=deferred(),h=fixture({fetcher:url=>url.endsWith('mouse')?waiting.promise:ok({entries:[{rank:1,nickname:'觸控王',score:100.25}]})});try{h.controller.showBoard({origin:'entry',mode:'mouse'});h.$('rankingTouch').click();await flush();assert.match(h.$('rankingEntries').textContent,/觸控王/);waiting.resolve(ok({entries:[{rank:1,nickname:'舊滑鼠',score:10}]}));await flush();assert.doesNotMatch(h.$('rankingEntries').textContent,/舊滑鼠/);h.$('rankingClose').click();assert.equal(h.$('rankingDialog').open,false);}finally{h.cleanup()}
});

test('ranking rows use text safely and show raw-ms ordering without fabricated own-best',async()=>{
 const h=fixture({fetcher:()=>ok({entries:[{rank:1,nickname:'<img src=x onerror=evil()>',score:0.1},{rank:2,nickname:'Second',score:532.123456},{rank:3,nickname:'Bad',score:NaN}],own:null})});try{h.controller.showBoard();await flush();assert.equal(h.$('rankingEntries').querySelector('img'),null);assert.equal(h.$('rankingEntries').children.length,2);assert.match(h.$('rankingEntries').textContent,/<0\.001/);assert.match(h.$('rankingEntries').textContent,/0\.532/);assert.match(h.$('rankingOwn').textContent,/尚無|還沒有/);}finally{h.cleanup()}
});

test('keyboard input never bubbles into gameplay and Enter never implicitly uploads',async()=>{
 const h=fixture();try{h.capture();h.upload();let keys=0;h.w.addEventListener('keydown',()=>keys++);for(const id of ['rankingNickname','rankingConsent','rankingSubmit']){h.$(id).dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));}await flush();assert.equal(keys,0);assert.equal(h.requests.length,0);h.$('rankingNickname').dispatchEvent(new h.w.KeyboardEvent('keydown',{key:' ',bubbles:true}));assert.equal(keys,0);}finally{h.cleanup()}
});

test('storage failure remains playable and a crypto failure prevents upload with a visible explanation',async()=>{
 for(const uuidBlocked of [false,true]){const h=fixture({storageBlocked:true,uuidBlocked,fetcher:()=>ok({accepted:true})});try{h.capture();h.upload();await h.click();assert.equal(h.requests.length,uuidBlocked?0:1);if(uuidBlocked)assert.match(h.$('rankingUploadStatus').textContent,/識別|編號/)}finally{h.cleanup()}}
});

test('existing anonymous browser and nickname keys are reused without claiming an account login',async()=>{
 const h=fixture({fetcher:()=>ok({accepted:true})});try{h.w.localStorage.setItem('pf-leaderboard-device-v1',uuid);h.capture();h.upload();await h.click();assert.equal(JSON.parse(h.requests[0].options.body).deviceId,uuid);assert.equal(h.w.localStorage.getItem('pf-leaderboard-nickname-v1'),'快手玩家');assert.match(h.$('rankingPrivacy').textContent,/匿名|瀏覽器/);assert.match(h.$('rankingPrivacy').textContent,/不是登入|非登入/);assert.match(h.$('rankingPrivacy').textContent,/暱稱.*成績.*測試榜/);assert.match(h.$('rankingDisclaimer').textContent,/玩家回報.*非.*驗證/);}finally{h.cleanup()}
});


test('wrong or missing response metadata never displays a different board as the selected mode',async()=>{
 for(const metadata of [{game:'other'},{game:undefined},{rules:'shuttle-v3-touch'},{rules:undefined},{unit:'s'},{unit:undefined},{mode:'touch'}]){
  const h=fixture({fetcher:()=>ok({...metadata,entries:[{rank:1,nickname:'Wrong board',score:42}]})});try{h.controller.showBoard({mode:'mouse'});await flush();assert.equal(h.$('rankingEntries').children.length,0);assert.match(h.$('rankingBoardStatus').textContent,/無法讀取/);}finally{h.cleanup()}
 }
});

test('accepted upload displays a valid online own-best without replacing the frozen score',async()=>{
 const h=fixture({fetcher:()=>ok({accepted:true,bestUpdated:false,own:{rank:7,nickname:'快手玩家',score:450.1234,gap:12.34}})});try{h.capture(valid,'touch');h.upload();await h.click();assert.match(h.$('rankingUploadStatus').textContent,/第 7 名/);assert.match(h.$('rankingUploadStatus').textContent,/0\.450 秒/);assert.match(h.$('rankingFrozenScore').textContent,/0\.532/);}finally{h.cleanup()}
});

test('GET and POST time out after ten seconds even if fetch never settles',async()=>{
 for(const action of ['board','upload']){const h=fixture({fetcher:()=>new Promise(()=>{})});try{let timer;const real=h.w.setTimeout;h.w.setTimeout=(fn,ms)=>{assert.equal(ms,10000);timer=fn;return 1};h.w.clearTimeout=()=>{};if(action==='board')h.controller.showBoard();else{h.capture();h.upload();h.$('rankingSubmit').click()}assert.equal(typeof timer,'function');timer();await flush();assert.equal(h.requests[0].options.signal.aborted,true);assert.match(h.$(action==='board'?'rankingBoardStatus':'rankingUploadStatus').textContent,action==='board'?/無法讀取/:/未確認/);if(action==='upload')assert.equal(h.$('rankingSubmit').disabled,false);h.w.setTimeout=real;}finally{h.cleanup()}}
});
