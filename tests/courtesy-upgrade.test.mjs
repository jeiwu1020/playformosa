import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('courtesy uses the existing platform loading screen and recoverable bootstrap',()=>{
 const d=new JSDOM(read('public/games/courtesy-contest/index.html')).window.document;
 const platform=new JSDOM(read('public/games/high-jump/index.html')).window.document;
 assert.equal(d.documentElement.dataset.pfStartup,'pending');
 d.querySelector('.pf-loading-joke').textContent=platform.querySelector('.pf-loading-joke').textContent;
 for(const id of ['pf-startup-style','pf-startup-script','pf-startup'])assert.equal(d.getElementById(id)?.outerHTML,platform.getElementById(id).outerHTML,id);
 const preloads=[...d.querySelectorAll('link[rel=modulepreload]')].map(n=>n.getAttribute('href'));
 for(const s of d.querySelectorAll('script[type=module][src]'))assert.ok(preloads.includes(s.getAttribute('src')));
 assert.match(read('public/games/courtesy-contest/index.html'),/座位準備好了，客氣還在排隊。/);
 assert.ok(d.querySelector('#pf-startup a[href="/"]'));assert.ok(d.querySelector('#pf-startup a[href=""]'));
});
test('result photo leads the compact desktop result, with ranking outside sharing',()=>{
 const d=new JSDOM(read('public/games/courtesy-contest/index.html')).window.document;
 assert.equal(d.querySelector('#result .result-card').firstElementChild.id,'result-photo');
 assert.ok(d.querySelector('#result-play #restart'));assert.ok(d.querySelector('#result-upload'));
 assert.equal(d.querySelectorAll('.pf-share-actions [data-share]').length,3);
 assert.doesNotMatch(d.querySelector('#result').textContent,/排行榜尚未開放/);
 const css=read('public/games/courtesy-contest/platform.css');
 assert.match(css,/#result-photo[^}]*object-fit:contain/);
 assert.match(css,/#result[^}]*overflow:auto/);
});
test('download card follows platform hierarchy with a content-fitted height and preserves the actual final pose',async()=>{
 let paint;try{({paintCourtesyScoreCard:paint}=await import('../public/games/courtesy-contest/score-card.mjs'));}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
 assert.equal(typeof paint,'function');
 const text=[],images=[],ctx={fillRect(){},strokeRect(){},fillText(t,x,y){text.push({t,x,y,font:this.font});},measureText(t){const size=Number(this.font.match(/(\d+)px/)[1]);return{width:[...t].length*size*.65,actualBoundingBoxAscent:size*.8,actualBoundingBoxDescent:size*.2}},drawImage(...args){images.push(args)}};
 const canvas={getContext:()=>ctx},frame={width:954,height:360};
 const out=paint(frame,{grade:'S',title:'客氣冠軍',count:12,bonus:3,status:'安全入座',remaining:'按下謝謝時剩 0.58 秒'},()=>canvas);
 assert.equal(out.width,1080);assert.ok(Number.isInteger(out.height)&&out.height>0&&out.height<1180,'compact landscape photo determines a shorter content-fitted card');
 assert.equal(text[0].t,'PLAYFORMOSA STUDIO');assert.equal(text[1].t,'客氣大賽');
 assert.ok(text.some(x=>x.t==='12 次互讓'));assert.ok(text.some(x=>x.t.includes('0.58 秒')));
 assert.ok(text.some(x=>x.t==='島遊無界 · PLAYFORMOSA'));
 assert.equal(images.length,1);assert.equal(images[0][0],frame);assert.equal(images[0].length,5,'whole frame, no crop');
 assert.ok(Math.abs(images[0][3]/images[0][4]-frame.width/frame.height)<1e-9);
 assert.ok(text.every(x=>x.y>0&&x.y<out.height));
});

test('entry explains the 30 second mutual-offer goal and safe-seating risk concisely',()=>{const source=read('public/games/courtesy-contest/platform.mjs');assert.match(source,/30 秒內和對方客氣互讓，次數越多越好；發車前有效按下謝謝就確認成功並記錄時間，沒按會跌倒！/);assert.doesNotMatch(source,/0\.3 秒/);});
