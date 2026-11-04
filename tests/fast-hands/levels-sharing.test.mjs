import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const mod=await import('../../public/games/fast-hands/levels-sharing.mjs').catch(e=>{if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;return{};});
const root=new URL('../../public/games/fast-hands/',import.meta.url),flush=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const state=(mode='catch',wins=2)=>({mode,phase:'done',practice:false,results:mode==='catch'?[...Array.from({length:wins},()=>({winner:'player',reason:'caught',flightMs:340})),{winner:'none',reason:'miss',flightMs:300}]:Array.from({length:10},(_,i)=>({winner:i<6?'player':i<9?'ai':'draw',reason:'tie'}))});
const png=text=>({blob:new Blob([text||'full branded PNG'],{type:'image/png'}),filename:'fast-hands-catch-2-stages.png'});
function fixture({mode='catch',mobile=false,share,canShare=()=>true,clipboard=async()=>{},createImage=async()=>png()}={}){
 assert.equal(typeof mod.mountLevelSharing,'function','level sharing adapter must exist');
 const dom=new JSDOM(readFileSync(new URL(mode+'.html',root),'utf8'),{url:`https://preview.example/games/fast-hands/${mode}.html?secret=yes#private`});
 const win=dom.window,document=win.document,$=id=>document.getElementById(id);$('summary').hidden=false;$('summary').setAttribute('open','');
 const urls=[],revoked=[],downloads=[],writes=[],encodes=[];win.File=File;win.URL.createObjectURL=blob=>{const url=`blob:local-${urls.length}`;urls.push({blob,url});return url;};win.URL.revokeObjectURL=url=>revoked.push(url);
 win.HTMLAnchorElement.prototype.click=function(){downloads.push({href:this.href,download:this.download});};Object.assign(win.navigator,{share,canShare,clipboard:clipboard?{writeText:text=>{writes.push(text);return clipboard(text);}}:undefined});
 const control=mod.mountLevelSharing({document,mode,mobile:()=>mobile,createImage:args=>{encodes.push(args);return createImage(args);}});
 const click=id=>$(id).dispatchEvent(new win.MouseEvent('click',{bubbles:true,cancelable:true}));
 const close=()=>{$('summary').removeAttribute('open');$('summary').dispatchEvent(new win.Event('close'));};
 return{win,document,$,control,click,close,urls,revoked,downloads,writes,encodes};
}
test('both summaries contain three accessible actions and an in-dialog local fallback',()=>{
 for(const mode of ['catch','duel']){const d=new JSDOM(readFileSync(new URL(mode+'.html',root),'utf8')).window.document;
  assert.deepEqual([...d.querySelector('.result-share-actions').children].map(e=>e.id),['summaryThreads','summaryDownload','summaryCopy']);assert.equal(d.getElementById('summaryDownload').tagName,'BUTTON');assert.equal(d.getElementById('summaryDownload').disabled,true);assert.equal(d.getElementById('summaryThreads').hasAttribute('href'),false);assert.equal(d.getElementById('summaryShareFallback').hidden,true);assert.equal(d.getElementById('summaryShareText').readOnly,true);assert.ok(d.querySelector('#summary #summaryShareFallbackImage'));assert.equal(d.querySelectorAll('#summary dialog').length,0);
 }
});
test('text and Threads are immediate, mode-specific and omit private page parameters while PNG is pending',async()=>{
 for(const mode of ['catch','duel']){const pending=deferred(),f=fixture({mode,createImage:()=>pending.promise}),input=state(mode),frame=Promise.resolve({blob:new Blob(['raw']),width:900,height:620});f.control.prepare(input,frame);input.results[0].winner='none';
  assert.equal(f.encodes.length,1);assert.equal(f.encodes[0].result.mode,mode);assert.equal(f.encodes[0].frame,frame);assert.ok(Object.isFrozen(f.encodes[0].result));assert.equal(f.encodes[0].result.scoreText,mode==='catch'?'2 關通過':'6 : 3');
  const intent=new URL(f.$('summaryThreads').href),text=intent.searchParams.get('text');assert.equal(intent.origin,'https://www.threads.com');assert.deepEqual([...intent.searchParams.keys()],['text']);assert.ok(text.endsWith(`https://preview.example/games/fast-hands/${mode}.html`));assert.doesNotMatch(text,/secret|private|mouse|touch/);assert.match(text,mode==='catch'?/玩具彈接接樂/:/十回合對決/);assert.match(f.$('summaryThreads').rel,/noopener/);assert.equal(f.$('summaryThreads').target,'_blank');
  f.click('summaryCopy');await flush();assert.equal(f.writes[0],text);assert.match(f.$('summaryShareStatus').textContent,/已複製/);pending.resolve(png());await flush();assert.match(f.$('summaryShareStatus').textContent,/已複製/);f.control.destroy();f.win.close();
 }
});
test('desktop downloads full prebuilt score PNG, never the raw scene',async()=>{
 const full=png(),f=fixture({createImage:async()=>full});await f.control.prepare(state(),Promise.resolve({blob:new Blob(['raw scene'])}));f.click('summaryDownload');assert.equal(f.downloads.length,1);assert.equal(f.urls[0].blob,full.blob);assert.equal(f.downloads[0].download,full.filename);f.control.destroy();assert.ok(f.revoked.includes(f.urls[0].url));f.win.close();
});
test('mobile native sharing is files-only in the original click and cancellation is recoverable',async()=>{
 const pending=deferred();let payload,calls=0;const f=fixture({mobile:true,share:p=>{calls++;payload=p;return pending.promise;}});await f.control.prepare(state(),Promise.resolve({}));f.click('summaryDownload');f.click('summaryDownload');assert.equal(calls,1);assert.deepEqual(Object.keys(payload),['files']);assert.equal(payload.files[0].type,'image/png');assert.equal(await payload.files[0].text(),'full branded PNG');pending.reject(Object.assign(Error('cancel'),{name:'AbortError'}));await flush();assert.equal(f.$('summaryDownload').disabled,false);assert.equal(f.$('summaryShareFallback').hidden,true);assert.equal(f.downloads.length,0);assert.match(f.$('summaryShareStatus').textContent,/取消/);f.control.destroy();f.win.close();
});
test('unsupported or rejected mobile sharing exposes exact PNG with long-press and safe focus recovery',async()=>{
 for(const share of [undefined,async()=>{throw Error('denied');}]){const full=png(),f=fixture({mobile:true,share,createImage:async()=>full});await f.control.prepare(state(),Promise.resolve({}));f.click('summaryDownload');await flush();assert.equal(f.$('summaryShareFallback').hidden,false);assert.equal(f.$('summaryShareFallbackImage').hidden,false);assert.equal(f.urls.at(-1).blob,full.blob);assert.match(f.$('summaryShareStatus').textContent,/長按/);f.click('summaryShareClose');assert.equal(f.$('summaryShareFallback').hidden,true);assert.equal(f.document.activeElement,f.$('summaryDownload'));f.control.destroy();f.win.close();}
 const css=readFileSync(new URL('finale.css',root),'utf8');assert.match(css,/\.level-share-fallback img[^}]*-webkit-touch-callout:default/s);assert.match(css,/\.level-share-fallback textarea[^}]*-webkit-user-select:text/s);
});
test('clipboard rejection exposes selected readonly text and Threads explains manual image attachment',async()=>{
 const f=fixture({mode:'duel',clipboard:async()=>{throw Error('denied');}});await f.control.prepare(state('duel'),Promise.resolve({}));f.click('summaryCopy');await flush();const t=f.$('summaryShareText');assert.equal(t.hidden,false);assert.equal(t.readOnly,true);assert.equal(f.document.activeElement,t);assert.equal(t.selectionEnd,t.value.length);f.click('summaryThreads');assert.match(f.$('summaryShareStatus').textContent,/圖片.*自行附上/);f.control.destroy();f.win.close();
});
test('replay/reopen reuses a frozen image, and late share/copy callbacks cannot reopen dismissed fallback',async()=>{
 for(const action of ['summaryDownload','summaryCopy']){const pending=deferred(),f=fixture({mobile:true,share:()=>pending.promise,clipboard:()=>pending.promise}),same=state(),frame=Promise.resolve({});await f.control.prepare(same,frame);f.click(action);f.close();f.$('summary').setAttribute('open','');await f.control.prepare(same,frame);pending.reject(Error('late'));await flush();assert.equal(f.$('summaryShareFallback').hidden,true);assert.equal(f.encodes.length,1);f.control.destroy();f.win.close();}
});
test('late frame encoding and callbacks cannot replace a fresh result, reset or destroyed controller',async()=>{
 const old=deferred(),fresh=deferred();let n=0;const f=fixture({createImage:()=>++n===1?old.promise:fresh.promise});f.control.prepare(state(),Promise.resolve({}));f.control.reset();f.control.prepare(state('catch',4),Promise.resolve({}));old.resolve(png('stale'));await flush();assert.equal(f.$('summaryDownload').disabled,true);fresh.resolve(png('fresh'));await flush();f.click('summaryDownload');assert.equal(await f.urls.at(-1).blob.text(),'fresh');assert.match(new URL(f.$('summaryThreads').href).searchParams.get('text'),/4 關通過/);f.control.destroy();f.click('summaryCopy');assert.equal(f.writes.length,0);assert.equal(f.$('summaryShareText').value,'');f.win.close();
});
test('image failure retains text routes and retry uses the same frozen frame',async()=>{
 let n=0;const frame=Promise.resolve({}),f=fixture({createImage:()=>++n===1?Promise.reject(Error('encode')):png()});await f.control.prepare(state(),frame);assert.match(f.$('summaryDownload').textContent,/重做/);f.click('summaryCopy');await flush();assert.equal(f.writes.length,1);f.click('summaryDownload');await flush();assert.equal(f.encodes.length,2);assert.equal(f.encodes[1].frame,frame);assert.equal(f.encodes[0].result,f.encodes[1].result);f.click('summaryDownload');assert.equal(f.downloads.length,1);f.control.destroy();f.win.close();
});
