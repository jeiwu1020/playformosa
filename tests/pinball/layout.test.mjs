import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
const root=new URL('../../public/games/overtime-pinball/',import.meta.url);
function styled(){
 const dom=new JSDOM(readFileSync(new URL('game.html',root),'utf8'),{virtualConsole:new VirtualConsole()}),d=dom.window.document;
 const sheets=[...d.querySelectorAll('link[rel=stylesheet]')].map(n=>n.getAttribute('href'));sheets.push('../shared/leaderboard.css');
 for(const href of sheets){const style=d.createElement('style');style.textContent=readFileSync(new URL(href,root),'utf8').replace(/@import[^;]+;/g,'');d.head.append(style)}
 d.body.classList.add('playing');d.querySelector('#results').hidden=false;d.querySelector('#results').open=true;
 d.querySelector('#payroll').innerHTML='<div>基本工資 <b>100</b></div>';
 d.querySelector('#pinballUpload').innerHTML='<details class="pf-leaderboard"><summary>上傳</summary><label>名稱</label><p>僅上傳本局</p></details>';
 d.querySelector('#rankContent').innerHTML='<section class="pf-honor-board"><header><h2>排行</h2></header><p class="pf-rank-rule">規則</p><p class="pf-rank-foot">玩家回報</p></section>';
 return dom;
}
const rgb=s=>s.match(/[\d.]+/g)?.slice(0,3).map(Number);
function luminance(s){return rgb(s).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4}).reduce((s,n,i)=>s+n*[.2126,.7152,.0722][i],0)}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
test('complete stylesheet cascade keeps result, upload and ranking copy readable',()=>{
 const dom=styled(),d=dom.window.document,css=e=>dom.window.getComputedStyle(e);
 try{for(const selector of ['#resultTitle','#results .eyebrow','#results p','#payroll b','#pinballUpload summary','#pinballUpload label','.pf-rank-rule','.pf-rank-foot']){
  const el=d.querySelector(selector);let bg='';for(let p=el;p;p=p.parentElement){const c=css(p).backgroundColor;if(c&&c!=='transparent'&&c!=='rgba(0, 0, 0, 0)'){bg=c;break}}
  assert.ok(contrast(css(el).color,bg)>=4.5,`${selector}: ${css(el).color} on ${bg}`);
 }assert.equal(css(d.querySelector('#rankContent header')).pointerEvents,'auto');assert.equal(css(d.querySelector('#rankContent header')).height,'auto');}finally{dom.window.close()}
});
test('measured platform header follows resize and disconnects cleanly',async()=>{
 const m=await import('../../public/games/overtime-pinball/platform-layout.mjs');
 const dom=styled(),d=dom.window.document,w=dom.window;let height=84,callback,stopped=false;
 d.querySelector('.pf-header').getBoundingClientRect=()=>({height});w.ResizeObserver=class{constructor(cb){callback=cb}observe(){}disconnect(){stopped=true}};
 const destroy=m.observePlatformHeader(d);assert.equal(d.body.style.getPropertyValue('--pf-header-height'),'84px');height=132;callback();assert.equal(d.body.style.getPropertyValue('--pf-header-height'),'132px');destroy();assert.equal(stopped,true);dom.window.close();
});
test('intro frame clipping reserves same measured header without shifting bottom or canvas',async()=>{
 const {clipIntroFrame}=await import('../../public/games/overtime-pinball/platform-layout.mjs');
 for(const [w,h,header]of [[320,568,84],[390,844,84],[844,390,60],[1366,768,60]]){
  const f={x:12,y:20,w:w-24,h:h-96},r=clipIntroFrame(f,h,header);assert.equal(r.y,f.y);assert.equal(r.w,f.w);assert.ok(h-r.y-r.h>=header+8);assert.ok(r.h>0);
 }assert.equal(clipIntroFrame(null,568,84),null);assert.equal(clipIntroFrame({x:0,y:500,w:320,h:68},568,84),null);
});
test('fixed UI uses header and status regions while retaining portrait bottom cues',()=>{
 const css=readFileSync(new URL('platform.css',root),'utf8');
 for(const id of ['playStatus','playFrame','skipOpening','bossStatus','desktopSceneFrame'])assert.match(css,new RegExp('#'+id+'[^{}]*\\{[^{}]*var\\(--pf-header-height'));
 assert.match(css,/#intro\.menu-sheet[^{}]*\{[^{}]*var\(--pf-header-height/);
 assert.match(css,/gate-active:not\(\[data-view="original"\]\) #playDetails[^{}]*\{[^{}]*--status-height/);
 assert.match(css,/mail-active\[data-view="original"\] #mailStatus[^{}]*\{[^{}]*--status-height/);
});
