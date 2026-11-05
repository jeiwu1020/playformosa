import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import postcss from 'postcss';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {captureFinaleImage} from '../../public/games/fast-hands/finale-image.mjs';
const root=new URL('../../public/games/fast-hands/',import.meta.url);
const pixel=(canvas,x,y)=>[...canvas.getContext('2d').getImageData(Math.floor(x),Math.floor(y),1,1).data];
for(const [w,h] of [[300,100],[100,300]])test(`actual ${w}x${h} scene keeps all four corners with transparent unused padding`,async()=>{
 const live=createCanvas(w,h),ctx=live.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,w,h);
 const colors=['#ff0000','#0000ff','#00ff00','#ffff00'],rgba=[[255,0,0,255],[0,0,255,255],[0,255,0,255],[255,255,0,255]],points=[[0,0],[w-20,0],[0,h-20],[w-20,h-20]];
 points.forEach(([x,y],i)=>{ctx.fillStyle=colors[i];ctx.fillRect(x,y,20,20)});
 const before=live.toBuffer('image/png');let output;const document={createElement:()=>{output=createCanvas(1,1);output.toBlob=fn=>fn(new Blob([output.toBuffer('image/png')],{type:'image/png'}));return output}};
 const result=await captureFinaleImage({document,canvas:live});const scale=Math.min(900/w,620/h),ox=(900-w*scale)/2,oy=(620-h*scale)/2;
 points.forEach(([x,y],i)=>assert.deepEqual(pixel(output,ox+(x+10)*scale,oy+(y+10)*scale),rgba[i]));
 assert.equal(pixel(output,1,1)[3],0,'padding is transparent, not a baked beige border');assert.deepEqual(live.toBuffer('image/png'),before,'never modify actual scene');
 const decoded=await loadImage(new Uint8Array(await result.blob.arrayBuffer()));assert.equal(decoded.width,900);assert.equal(decoded.height,620);
});
function page(mode,renderer){const dom=new JSDOM(readFileSync(new URL(mode==='duck'?'index.html':mode+'.html',root),'utf8'));dom.window.document.body.dataset.renderer=renderer;const style=dom.window.document.createElement('style');const css=(mode==='duck'?['style.css','level-nav.css']:['levels.css','level-nav.css']).concat(['club.css','finale.css']).map(p=>readFileSync(new URL(p,root),'utf8')).join('\n');const tree=postcss.parse(css);tree.walkAtRules(rule=>rule.remove());style.textContent=tree.toString();dom.window.document.head.append(style);return dom;}
for(const renderer of ['3d','fallback'])test(`normal duel ${renderer} mode hides the technical scene badge but not errors`,()=>{const dom=page('duel',renderer);try{const d=dom.window.document,css=dom.window.getComputedStyle(d.getElementById('renderMode'));assert.equal(css.display,'none');const error=d.getElementById('artStatus');error.hidden=false;error.textContent='道具圖像載入失敗，請重試後再開始。';assert.notEqual(dom.window.getComputedStyle(error).display,'none');assert.equal(error.getAttribute('role'),'status');assert.match(d.querySelector('.level-help-content').textContent,/2D 相容畫面/)}finally{dom.window.close()}});
test('pending duel and catch technical status are preserved',()=>{for(const [mode,renderer] of [['duel','pending'],['catch','3d'],['catch','fallback']]){const dom=page(mode,renderer);try{assert.notEqual(dom.window.getComputedStyle(dom.window.document.getElementById('renderMode')).display,'none')}finally{dom.window.close()}}});
for(const mode of ['duck','catch','duel'])test(`${mode} result picture blends into the ticket and preserves contain-fit`,()=>{const dom=page(mode,'fallback');try{const d=dom.window.document,picture=dom.window.getComputedStyle(d.querySelector('.finale-picture')),img=dom.window.getComputedStyle(d.querySelector('.finale-picture img'));assert.ok(['rgba(0, 0, 0, 0)','transparent'].includes(picture.backgroundColor),picture.backgroundColor);assert.equal(img.objectFit,'contain');assert.equal(picture.borderTopWidth,'0px');assert.equal(picture.boxShadow,'none');assert.equal(img.borderTopWidth,'0px');assert.equal(img.boxShadow,'none');assert.ok(parseFloat(dom.window.getComputedStyle(d.querySelector('.finale-picture figcaption')).fontSize)>=15)}finally{dom.window.close()}});
