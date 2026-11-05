import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const module = await import('../../public/games/fast-hands/share.mjs').catch(error => {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  return {};
});
const result = {title:'挑戰成功！',timeText:'0.532',bestText:'0.500 秒',deltaText:'比本機最佳慢 0.032 秒',comment:'一手包辦，鈔鴨雙收。',modeText:'滑鼠',success:true};
const flush = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject}; };
const png = (text='current') => ({blob:new Blob([text],{type:'image/png'}),filename:'fast-hands-mouse-0p532s.png'});

function fixture({mobile=null,coarse=false,ua='Desktop',touchPoints=0,share,canShare=()=>true,clipboard=async()=>{},createImage=async()=>png()}={}) {
  assert.equal(typeof module.mountFastHandsSharing,'function','sharing controller must exist');
  const dom=new JSDOM('<!doctype html><body><dialog id="resultDialog" open><img id="resultPortrait"><a id="resultThreads"></a><button id="resultDownload">下載成績圖</button><button id="resultCopy">複製成績與網址</button><p id="downloadStatus" aria-live="polite"></p><section id="shareFallback" hidden><img id="shareFallbackImage"><textarea id="shareFallbackText"></textarea><button id="shareFallbackClose">關閉</button></section></dialog></body>',{url:'https://preview.example/games/fast-hands/?debug=1#private'});
  const {window:win}=dom,document=win.document,$=id=>document.getElementById(id);
  const created=[],revoked=[],downloads=[],encodes=[],writes=[],timers=new Map();let serial=0;
  win.File=File;win.matchMedia=()=>({matches:coarse});
  Object.defineProperty(win.navigator,'userAgent',{value:ua,configurable:true});
  Object.defineProperty(win.navigator,'maxTouchPoints',{value:touchPoints,configurable:true});
  Object.assign(win.navigator,{canShare,share,clipboard:clipboard?{writeText:text=>{writes.push(text);return clipboard(text);}}:undefined});
  win.URL.createObjectURL=blob=>{const url='blob:test-'+(++serial);created.push({url,blob});return url;};
  win.URL.revokeObjectURL=url=>revoked.push(url);
  win.setTimeout=(fn,ms)=>{const id=++serial;timers.set(id,{fn,ms});return id;};win.clearTimeout=id=>timers.delete(id);
  win.HTMLAnchorElement.prototype.click=function(){downloads.push({href:this.href,download:this.download});};
  const control=module.mountFastHandsSharing({document,createImage:args=>{encodes.push(args);return createImage(args);},...(mobile===null?{}:{mobile:()=>mobile})});
  const click=id=>{const event=new win.MouseEvent('click',{bubbles:true,cancelable:true});$(id).dispatchEvent(event);return event;};
  const close=()=>{$('resultDialog').removeAttribute('open');$('resultDialog').dispatchEvent(new win.Event('close'));};
  return{win,document,$,control,click,close,created,revoked,downloads,encodes,writes,timers};
}

test('prepares PNG before clicking and freezes the current result and input mode',async()=>{
  const pending=deferred(),f=fixture({createImage:()=>pending.promise}),input={...result};
  f.control.prepare(input,'touch');input.timeText='9.999';assert.equal(f.$('resultDownload').disabled,true);
  assert.equal(f.encodes.length,1);assert.deepEqual(f.encodes[0].result,{...result,modeText:'觸控'});assert.equal(f.encodes[0].mode,'touch');assert.ok(Object.isFrozen(f.encodes[0].result));
  assert.equal(f.encodes[0].portrait,f.$('resultPortrait'));pending.resolve(png());await flush();
  f.click('resultDownload');assert.equal(f.encodes.length,1);assert.equal(f.downloads.length,1);f.control.destroy();
});

test('desktop and touch-enabled desktop download instead of opening a native share sheet',async()=>{
  for(const touchPoints of [0,10]){let shares=0;const f=fixture({mobile:undefined,touchPoints,share:()=>shares++});
    await f.control.prepare(result,'touch');f.click('resultDownload');assert.equal(shares,0);assert.equal(f.downloads.length,1);assert.match(f.$('resultDownload').textContent,/下載/);assert.match(f.downloads[0].download,/\.png$/);f.control.destroy();}
});

test('coarse pointers and mobile user agents share prebuilt files immediately with a files-only payload',async()=>{
  for(const opts of [{coarse:true},{ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'},{ua:'Mozilla/5.0 (Linux; Android 15; Tablet)'}]){
    let shared,probed;const pending=deferred();const f=fixture({...opts,mobile:undefined,canShare:p=>{probed=p;return true;},share:p=>{shared=p;return pending.promise;}});
    await f.control.prepare(result,'mouse');f.click('resultDownload');assert.ok(shared,'share must run before click returns');
    assert.deepEqual(Object.keys(shared),['files']);assert.deepEqual(probed,shared);assert.equal(shared.files[0].type,'image/png');assert.equal(await shared.files[0].text(),'current');assert.equal(f.downloads.length,0);
    pending.resolve();await flush();assert.match(f.$('downloadStatus').textContent,/交給系統/);f.control.destroy();
  }
});

test('native cancellation never downloads or opens fallback and the same image can be retried',async()=>{
  let calls=0;const waiting=deferred();const f=fixture({mobile:true,share:()=>{calls++;return waiting.promise;}});
  await f.control.prepare(result,'touch');f.click('resultDownload');f.click('resultDownload');assert.equal(calls,1);
  waiting.reject(Object.assign(Error('cancel'),{name:'AbortError'}));await flush();assert.equal(f.downloads.length,0);assert.equal(f.$('shareFallback').hidden,true);assert.match(f.$('downloadStatus').textContent,/取消/);assert.equal(f.$('resultDownload').disabled,false);
  f.click('resultDownload');assert.equal(calls,2);await flush();f.control.destroy();
});

test('unsupported, throwing capability probes and rejected mobile shares expose the actual PNG in place',async()=>{
  for(const opts of [{share:undefined},{canShare:()=>false,share:async()=>{}},{canShare:()=>{throw Error('probe');},share:async()=>{}},{share:async()=>{throw Error('denied');}}]){
    const f=fixture({mobile:true,...opts});await f.control.prepare(result,'touch');f.click('resultDownload');await flush();
    assert.equal(f.$('shareFallback').hidden,false);assert.equal(f.$('shareFallbackImage').hidden,false);assert.match(f.$('shareFallbackImage').src,/^blob:/);assert.equal(f.created.at(-1).blob.type,'image/png');assert.equal(f.downloads.length,0);
    const url=f.$('shareFallbackImage').src;f.click('shareFallbackClose');assert.equal(f.$('shareFallback').hidden,true);assert.ok(f.revoked.includes(url));assert.equal(f.document.activeElement,f.$('resultDownload'));f.control.destroy();
  }
});

test('Threads has an eager safe intent containing result and current-origin canonical route',async()=>{
  const f=fixture();await f.control.prepare(result,'touch');const anchor=f.$('resultThreads'),intent=new URL(anchor.href),text=intent.searchParams.get('text');
  assert.equal(text.split('\n')[0],'鴨沒漏補｜PlayFormosa');
  assert.equal(intent.origin,'https://www.threads.com');assert.equal(intent.pathname,'/intent/post');assert.match(text,/0\.532/);assert.match(text,/觸控/);assert.ok(text.endsWith('https://preview.example/games/fast-hands/'));assert.doesNotMatch(text,/debug|#private|chatgpt\.site/);
  assert.equal(anchor.target,'_blank');assert.match(anchor.rel,/noopener/);assert.match(anchor.rel,/noreferrer/);f.click('resultThreads');assert.match(f.$('downloadStatus').textContent,/圖片.*自行附上/);f.control.destroy();
});

test('copy waits for clipboard success and suppresses duplicate writes',async()=>{
  const pending=deferred(),f=fixture({clipboard:()=>pending.promise});await f.control.prepare(result,'mouse');f.click('resultCopy');f.click('resultCopy');
  assert.equal(f.writes[0].split('\n')[0],'鴨沒漏補｜PlayFormosa');
  assert.equal(f.writes.length,1);assert.match(f.writes[0],/0\.532/);assert.ok(f.writes[0].endsWith('https://preview.example/games/fast-hands/'));assert.doesNotMatch(f.$('downloadStatus').textContent,/已複製/);
  pending.resolve();await flush();assert.match(f.$('downloadStatus').textContent,/已複製/);f.control.destroy();
});

test('missing or denied clipboard shows readonly selected text instead of claiming success',async()=>{
  for(const clipboard of [null,async()=>{throw Error('denied');}]){const f=fixture({clipboard});await f.control.prepare(result,'mouse');f.click('resultCopy');await flush();
    const text=f.$('shareFallbackText');assert.equal(f.$('shareFallback').hidden,false);assert.equal(text.readOnly,true);assert.equal(text.hidden,false);assert.equal(f.document.activeElement,text);assert.equal(text.selectionStart,0);assert.equal(text.selectionEnd,text.value.length);assert.match(text.value,/0\.532/);assert.doesNotMatch(f.$('downloadStatus').textContent,/已複製/);f.click('shareFallbackClose');assert.equal(f.document.activeElement,f.$('resultCopy'));f.control.destroy();}
});

test('failed or empty PNG encoding can retry while Threads and copy remain available',async()=>{
  for(const failure of [()=>Promise.reject(Error('encode')),()=>Promise.resolve({blob:new Blob([],{type:'image/png'}),filename:'bad.png'}),()=>Promise.resolve({blob:new Blob(['x'],{type:'text/plain'}),filename:'bad.png'})]){
    let attempts=0;const f=fixture({createImage:()=>++attempts===1?failure():png()});await f.control.prepare(result,'mouse');assert.equal(f.$('resultDownload').disabled,false);assert.match(f.$('resultDownload').textContent,/重做|重試/);assert.match(f.$('resultThreads').href,/threads\.com/);
    f.click('resultCopy');await flush();assert.equal(f.writes.length,1);f.click('resultDownload');await flush();assert.equal(attempts,2);assert.equal(f.downloads.length,0);f.click('resultDownload');assert.equal(f.downloads.length,1);f.control.destroy();
  }
});

test('late PNG completions cannot replace a new round or reenable a destroyed controller',async()=>{
  const old=deferred(),fresh=deferred();let count=0;const f=fixture({createImage:()=>++count===1?old.promise:fresh.promise});
  f.control.prepare(result,'mouse');f.control.reset();f.control.prepare({...result,timeText:'0.700'},'touch');old.resolve(png('old'));await flush();assert.equal(f.$('resultDownload').disabled,true);
  fresh.resolve(png('fresh'));await flush();f.click('resultDownload');assert.equal(await f.created.at(-1).blob.text(),'fresh');assert.match(decodeURIComponent(f.$('resultThreads').href),/0\.700/);f.control.destroy();
  const late=deferred(),dead=fixture({createImage:()=>late.promise});dead.control.prepare(result,'mouse');dead.control.destroy();late.resolve(png());await flush();dead.click('resultDownload');assert.equal(dead.downloads.length,0);assert.equal(dead.created.length,0);
});

test('late share or copy rejection after reset does not reopen stale fallback or overwrite new status',async()=>{
  for(const action of ['resultDownload','resultCopy']){const pending=deferred(),f=fixture({mobile:true,share:()=>pending.promise,clipboard:()=>pending.promise});
    await f.control.prepare(result,'touch');f.click(action);f.control.reset();await f.control.prepare({...result,timeText:'0.700'},'mouse');const text=f.$('downloadStatus').textContent;pending.reject(Error('denied'));await flush();
    assert.equal(f.$('shareFallback').hidden,true);assert.equal(f.$('downloadStatus').textContent,text);assert.equal(f.$('resultDownload').disabled,false);f.control.destroy();}
});

test('closing or replaying result suppresses late fallback but preserves prepared image for reopening',async()=>{
  const pending=deferred(),f=fixture({mobile:true,share:()=>pending.promise});await f.control.prepare(result,'touch');f.click('resultDownload');f.close();f.$('resultDialog').setAttribute('open','');pending.reject(Error('denied'));await flush();
  assert.equal(f.$('shareFallback').hidden,true);f.win.navigator.share=undefined;f.click('resultDownload');await flush();assert.equal(f.$('shareFallback').hidden,false);assert.equal(f.encodes.length,1);f.control.destroy();
});

test('reset and destroy reclaim object URLs, clear text and remove active handlers',async()=>{
  const f=fixture({mobile:true});await f.control.prepare(result,'touch');f.click('resultDownload');const url=f.$('shareFallbackImage').src;f.control.reset();assert.ok(f.revoked.includes(url));assert.equal(f.$('shareFallbackText').value,'');assert.equal(f.$('resultThreads').hasAttribute('href'),false);assert.equal(f.$('shareFallback').hidden,true);
  await f.control.prepare(result,'mouse');f.control.destroy();f.click('resultDownload');f.click('resultCopy');assert.equal(f.writes.length,0);assert.equal(f.downloads.length,0);assert.equal(f.timers.size,0);f.control.prepare(result,'mouse');assert.equal(f.encodes.length,2);
});

test('stalled PNG encoding times out to a retry and late encoding cannot replace retry',async()=>{
  const stuck=deferred();let attempts=0;const f=fixture({createImage:()=>++attempts===1?stuck.promise:png('retry')});f.control.prepare(result,'mouse');
  const timeout=[...f.timers.values()].find(timer=>timer.ms>0);assert.ok(timeout,'PNG preparation must have a bounded timeout');timeout.fn();await flush();assert.equal(f.$('resultDownload').disabled,false);f.click('resultDownload');await flush();stuck.resolve(png('old'));await flush();f.click('resultDownload');assert.equal(await f.created.at(-1).blob.text(),'retry');f.control.destroy();
});

test('reopening or replaying the same result and mode retains one frozen PNG and pending encode',async()=>{
  const pending=deferred(),f=fixture({mobile:true,createImage:()=>pending.promise});const same=Object.freeze({...result});
  f.control.prepare(same,'touch');f.close();f.$('resultDialog').setAttribute('open','');f.control.prepare(same,'touch');assert.equal(f.encodes.length,1);
  pending.resolve(png('frozen'));await flush();f.click('resultDownload');const firstURL=f.$('shareFallbackImage').src;assert.equal(f.$('shareFallback').hidden,false);f.close();assert.ok(f.revoked.includes(firstURL));assert.equal(f.$('shareFallback').hidden,true);
  f.$('resultDialog').setAttribute('open','');await f.control.prepare(same,'touch');f.click('resultDownload');assert.equal(f.encodes.length,1);assert.equal(await f.created.at(-1).blob.text(),'frozen');f.control.destroy();
});

test('desktop download keeps the prepared filename, exact PNG and URL until cleanup',async()=>{
  const blob=new Blob(['exact frozen image'],{type:'image/png'}),f=fixture({createImage:async()=>({blob,filename:'fast-hands-touch-0p532s.png'})});
  await f.control.prepare(result,'touch');f.click('resultDownload');assert.equal(f.downloads[0].download,'fast-hands-touch-0p532s.png');assert.equal(f.created[0].blob,blob);assert.equal(f.downloads[0].href,f.created[0].url);assert.equal(f.revoked.length,0);
  const timer=[...f.timers.values()].find(value=>value.ms>0);assert.ok(timer);timer.fn();assert.deepEqual(f.revoked,[f.created[0].url]);f.control.destroy();
});

test('changing mode or preparing after reset requires a new frozen image',async()=>{
  const f=fixture(),same=Object.freeze({...result});await f.control.prepare(same,'mouse');await f.control.prepare(same,'touch');assert.equal(f.encodes.length,2);assert.equal(f.encodes[1].mode,'touch');f.control.reset();await f.control.prepare(same,'touch');assert.equal(f.encodes.length,3);f.control.destroy();
});

test('synchronous native cancellation is recoverable without a download or false success',async()=>{
  const f=fixture({mobile:true,share:()=>{throw Object.assign(Error('cancel'),{name:'AbortError'});}});await f.control.prepare(result,'touch');f.click('resultDownload');assert.equal(f.$('shareFallback').hidden,true);assert.equal(f.$('resultDownload').disabled,false);assert.match(f.$('downloadStatus').textContent,/取消/);assert.equal(f.downloads.length,0);f.control.destroy();
});

test('pending clipboard success and rejection cannot update a different round or a reopened result',async()=>{
  for(const settled of ['success','rejection'])for(const transition of ['new-round','close-reopen']){
    const pending=deferred(),f=fixture({clipboard:()=>pending.promise});await f.control.prepare(result,'mouse');f.click('resultCopy');
    if(transition==='new-round'){f.control.reset();await f.control.prepare({...result,timeText:'0.700'},'touch');}
    else{f.close();f.$('resultDialog').setAttribute('open','');}
    const status=f.$('downloadStatus').textContent;
    settled==='success'?pending.resolve():pending.reject(Error('denied'));await flush();
    assert.equal(f.$('downloadStatus').textContent,status);assert.equal(f.$('shareFallback').hidden,true);assert.equal(f.$('resultCopy').disabled,false);f.control.destroy();
  }
});

test('closing a newer image fallback retires pending clipboard success and rejection without stealing focus',async()=>{
  for(const outcome of ['success','rejection']){
    const pending=deferred(),f=fixture({mobile:true,clipboard:()=>pending.promise});await f.control.prepare(result,'touch');f.click('resultCopy');f.click('resultDownload');
    assert.equal(f.$('shareFallback').hidden,false);assert.equal(f.$('shareFallbackImage').hidden,false);f.click('shareFallbackClose');
    const status=f.$('downloadStatus').textContent;assert.equal(f.document.activeElement,f.$('resultDownload'));
    outcome==='success'?pending.resolve():pending.reject(Error('denied'));await flush();
    assert.equal(f.$('shareFallback').hidden,true);assert.equal(f.$('downloadStatus').textContent,status);assert.equal(f.document.activeElement,f.$('resultDownload'));assert.equal(f.$('resultCopy').disabled,false);
    f.win.navigator.clipboard.writeText=async()=>{};f.click('resultCopy');await flush();assert.match(f.$('downloadStatus').textContent,/已複製/);f.control.destroy();
  }
});

test('a newer copy action retires pending native share success, rejection and cancellation but unlocks image retry',async()=>{
  for(const outcome of ['success','rejection','cancel']){
    const pending=deferred(),f=fixture({mobile:true,share:()=>pending.promise});await f.control.prepare(result,'touch');f.click('resultDownload');f.click('resultCopy');await flush();
    const status=f.$('downloadStatus').textContent;assert.match(status,/已複製/);
    outcome==='success'?pending.resolve():pending.reject(Object.assign(Error('old share'),{name:outcome==='cancel'?'AbortError':'NotAllowedError'}));await flush();
    assert.equal(f.$('downloadStatus').textContent,status);assert.equal(f.$('shareFallback').hidden,true);assert.equal(f.$('resultDownload').disabled,false);
    let retries=0;f.win.navigator.share=()=>{retries++;return Promise.resolve();};f.click('resultDownload');assert.equal(retries,1);await flush();assert.match(f.$('downloadStatus').textContent,/交給系統/);f.control.destroy();
  }
});

test('Threads supersedes old clipboard and native share callbacks without clearing its attachment guidance',async()=>{
  for(const action of ['resultCopy','resultDownload'])for(const outcome of ['success','rejection','cancel']){
    const pending=deferred(),f=fixture({mobile:true,share:()=>pending.promise,clipboard:()=>pending.promise});await f.control.prepare(result,'touch');f.click(action);f.click('resultThreads');const status=f.$('downloadStatus').textContent;
    outcome==='success'?pending.resolve():pending.reject(Object.assign(Error('old operation'),{name:outcome==='cancel'?'AbortError':'NotAllowedError'}));await flush();
    assert.equal(f.$('downloadStatus').textContent,status);assert.match(status,/圖片.*自行附上/);assert.equal(f.$('shareFallback').hidden,true);assert.equal(f.$(action).disabled,false);f.control.destroy();
  }
});

test('background PNG completion keeps newer copy feedback while enabling the current image',async()=>{
  for(const outcome of ['success','rejection']){
    const pending=deferred(),f=fixture({createImage:()=>pending.promise});f.control.prepare(result,'mouse');f.click('resultCopy');await flush();const status=f.$('downloadStatus').textContent;assert.match(status,/已複製/);
    outcome==='success'?pending.resolve(png()):pending.reject(Error('late encode failure'));await flush();assert.equal(f.$('downloadStatus').textContent,status);assert.equal(f.$('resultDownload').disabled,false);
    if(outcome==='success'){f.click('resultDownload');assert.equal(f.downloads.length,1);}else assert.match(f.$('resultDownload').textContent,/重做/);f.control.destroy();
  }
});
