// Test-only native DOM fixture: replaces only WebGLRenderer, never production files.
// Run after build: node tests/long-jump/prepare-recovery-browser.mjs [baseline-ref]
import fs from 'node:fs/promises';import path from 'node:path';import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'../..'),dist=path.join(root,'dist'),base=process.argv[2]||'167b6e3d7c53c45aa72e7c26ca66ff5939fd916c';
const renderer=`import * as RealTHREE from './vendor/three.module.min.js';
const THREE={...RealTHREE,WebGLRenderer:class{constructor(){this.domElement=document.createElement('canvas');this.shadowMap={};this.ctx=this.domElement.getContext('2d');}setPixelRatio(){}setSize(w,h){this.domElement.width=w;this.domElement.height=h;}render(scene,camera){scene.updateMatrixWorld();camera.updateMatrixWorld();this.ctx.fillStyle=scene.background.getStyle();this.ctx.fillRect(0,0,this.domElement.width,this.domElement.height);this.ctx.fillStyle='#23464e';this.ctx.font='13px sans-serif';this.ctx.fillText('Renderer stub — actual DOM / input / physics QA',12,190);}}};`;
const setup=`<script>window.qaNative={shows:0,closes:0,presses:[],rotateNext:false};const show=HTMLDialogElement.prototype.showModal,close=HTMLDialogElement.prototype.close;HTMLDialogElement.prototype.showModal=function(){qaNative.shows++;return show.call(this);};HTMLDialogElement.prototype.close=function(){qaNative.closes++;return close.call(this);};const mode=new URLSearchParams(location.search).get('mode')==='standalone';Object.defineProperty(navigator,'standalone',{configurable:true,value:mode});const realMedia=matchMedia.bind(window);window.matchMedia=q=>q==='(pointer: coarse)'||q==='(display-mode: standalone)'?{matches:q==='(pointer: coarse)'||mode,addEventListener(){},removeEventListener(){}}:realMedia(q);</script>`;
const inspect=`
window.qaGame=()=>({playing,paused,phase:state.phase,held:[...input],pointers:[...controls.pointers.keys()],sceneWidth,sceneHeight,scenePlayHeight:typeof scenePlayHeight==='undefined'?sceneHeight:scenePlayHeight});
for(const b of buttons)b.addEventListener('pointerdown',()=>{qaNative.presses.push({limb:b.dataset.limb,held:[...input]});if(qaNative.rotateNext){qaNative.rotateNext=false;setTimeout(()=>parent.qaRotate(844,390),120);}});
`;
for(const [name,baseline]of [['qa-native-before',true],['qa-native-after',false]]){
 const target=path.join(dist,name);await fs.cp(path.join(dist,'games/long-jump'),target,{recursive:true});
 if(baseline)for(const file of ['game.mjs','layout.mjs','dialogs.mjs','controls.mjs','style.css'])await fs.writeFile(path.join(target,file),execFileSync('git',['show',`${base}:public/games/long-jump/${file}`],{cwd:root}));
 let game=await fs.readFile(path.join(target,'game.mjs'),'utf8');game=game.replace("import * as THREE from './vendor/three.module.min.js';",renderer)+inspect;await fs.writeFile(path.join(target,'game.mjs'),game);
 let html=await fs.readFile(path.join(target,'index.html'),'utf8');html=html.replace('<script type="module" src="layout.mjs">',setup+'<script type="module" src="layout.mjs">');await fs.writeFile(path.join(target,'index.html'),html);
}
await fs.copyFile(path.join(root,'tests/long-jump/browser-recovery.html'),path.join(dist,'qa-recovery.html'));
console.log('Prepared renderer-only-stub native DOM fixtures. Not production / WebGL acceptance.');
