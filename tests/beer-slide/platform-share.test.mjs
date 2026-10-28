import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const moduleURL=new URL('../../public/games/beer-slide/platform.mjs',import.meta.url);
async function api(){assert.ok(existsSync(moduleURL),'platform sharing implementation exists');return import(moduleURL);}
function fixture({nativeShare,clipboard,hidden=false}={}){
 class Element{constructor(text=''){this.textContent=text;this.hidden=false;this.handlers={};this.attributes={};this.open=false;}addEventListener(t,f){this.handlers[t]=f;}click(){return this.handlers.click?.({preventDefault:()=>{this.prevented=true;}});}setAttribute(k,v){this.attributes[k]=v;}removeAttribute(k){delete this.attributes[k];if(k==='href')delete this.href;}getAttribute(k){return k==='href'?(this.href??null):(this.attributes[k]??null);}focus(){this.focused=true;}select(){this.selected=true;}showModal(){this.open=true;}close(){this.open=false;}}
 const values={score:'8.7',verdict:'杯子到站，啤酒平安。',finalDistance:'22 cm',finalSpill:'14 mL'};
 const ids=['result','stage','platformShare','platformCopy','platformThreads','platformShareStatus','platformCopyDialog','platformCopyText','platformCopyClose',...Object.keys(values)];
 const els=Object.fromEntries(ids.map(id=>[id,new Element(values[id])]));els.result.hidden=hidden;
 let mutation=()=>{};class Observer{constructor(fn){mutation=fn;}observe(){}}
 const document={getElementById:id=>els[id]},navigator={...(nativeShare?{share:nativeShare}:{}),...(clipboard?{clipboard:{writeText:clipboard}}:{})};
 return {els,document,navigator,location:{origin:'https://preview.example.com',pathname:'/games/beer-slide/',search:'?debug=1',hash:'#private'},MutationObserver:Observer,mutate:()=>mutation()};
}
test('beer result share uses actual result and current game host, never query/hash/private prototype',async()=>{
 const {resultShareData}=await api(),f=fixture(),data=resultShareData(f.document,f.location);
 assert.equal(data.url,'https://preview.example.com/games/beer-slide/');assert.match(data.text,/8\.7 \/ 10\.0/);assert.match(data.text,/22 cm/);assert.match(data.text,/14 mL/);
 f.els.result.hidden=true;assert.equal(resultShareData(f.document,f.location),null);
});
test('native cancellation is quiet and a later click can retry without duplicate concurrent shares',async()=>{
 const {wirePlatformSharing}=await api();let calls=[],finish;
 const f=fixture({nativeShare:payload=>{calls.push(payload);return new Promise((resolve,reject)=>{finish=reject;});}});wirePlatformSharing(f);
 const pending=f.els.platformShare.click();await f.els.platformShare.click();assert.equal(calls.length,1);assert.equal(calls[0].url,'https://preview.example.com/games/beer-slide/');assert.equal(calls[0].files,undefined);
 finish(Object.assign(new Error('cancel'),{name:'AbortError'}));await pending;assert.match(f.els.platformShareStatus.textContent,/取消/);assert.equal(f.els.platformCopyDialog.open,false);
 const again=f.els.platformShare.click();assert.equal(calls.length,2);finish(Object.assign(new Error('cancel'),{name:'AbortError'}));await again;
});
test('clipboard denial preserves copyable result in separate dialog; close returns focus',async()=>{
 const {wirePlatformSharing}=await api(),f=fixture({clipboard:async()=>{throw new Error('denied');}});wirePlatformSharing(f);
 await f.els.platformCopy.click();assert.equal(f.els.platformCopyDialog.open,true);assert.match(f.els.platformCopyText.value,/8\.7/);assert.match(f.els.platformCopyText.value,/https:\/\/preview\.example\.com\/games\/beer-slide\//);assert.equal(f.els.platformCopyText.selected,true);
 f.els.platformCopyClose.click();assert.equal(f.els.platformCopyDialog.open,false);assert.equal(f.els.platformCopy.focused,true);
});
test('unavailable native share falls back to copied text and Threads prepares the same score and link',async()=>{
 const {wirePlatformSharing}=await api();let copied;
 const f=fixture({clipboard:async t=>{copied=t;}});wirePlatformSharing(f);await f.els.platformShare.click();assert.match(copied,/8\.7/);assert.match(f.els.platformShareStatus.textContent,/已複製/);
 f.els.platformThreads.click();const u=new URL(f.els.platformThreads.href);assert.equal(u.origin,'https://www.threads.net');assert.equal(u.searchParams.get('text'),copied);
 f.els.result.hidden=true;f.els.platformThreads.click();assert.equal(f.els.platformThreads.prevented,true);
});
test('retry hides an open copy dialog and old async failure cannot expose the previous score',async()=>{
 const {wirePlatformSharing}=await api();let fail;const f=fixture({nativeShare:()=>new Promise((_,r)=>fail=r)});wirePlatformSharing(f);
 const pending=f.els.platformShare.click();f.els.result.hidden=true;f.mutate();fail(new Error('unavailable'));await pending;assert.equal(f.els.platformCopyDialog.open,false);assert.equal(f.els.platformShareStatus.textContent,'');
 f.els.result.hidden=false;await f.els.platformCopy.click();assert.equal(f.els.platformCopyDialog.open,true);f.els.result.hidden=true;f.mutate();assert.equal(f.els.platformCopyDialog.open,false);assert.equal(f.els.stage.focused,true);
});

test('Threads link is current before any click so middle-click and Open link use this result',async()=>{
 const {wirePlatformSharing}=await api(),f=fixture();wirePlatformSharing(f);
 assert.match(decodeURIComponent(f.els.platformThreads.href??''),/8\.7 \/ 10\.0/);
 f.els.result.hidden=true;f.mutate();assert.equal(f.els.platformThreads.getAttribute('href'),null);
 f.els.score.textContent='3.2';f.els.result.hidden=false;f.mutate();
 const url=new URL(f.els.platformThreads.href);assert.match(url.searchParams.get('text'),/3\.2 \/ 10\.0/);assert.doesNotMatch(url.searchParams.get('text'),/8\.7/);
});
test('pending old native share cannot overwrite a new result after retry',async()=>{
 const {wirePlatformSharing}=await api();let complete;
 const f=fixture({nativeShare:()=>new Promise(resolve=>complete=resolve)});wirePlatformSharing(f);
 const pending=f.els.platformShare.click();f.els.result.hidden=true;f.mutate();f.els.score.textContent='1.1';f.els.result.hidden=false;f.mutate();
 complete();await pending;assert.equal(f.els.platformShareStatus.textContent,'');assert.match(decodeURIComponent(f.els.platformThreads.href),/1\.1 \/ 10\.0/);
});
