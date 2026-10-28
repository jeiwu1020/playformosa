// Run after npm run build. Test-only renderer substitution; production is untouched.
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..'),source=path.join(root,'dist/games/long-jump'),target=path.join(root,'dist/qa-root-origin');
await fs.rm(target,{recursive:true,force:true});await fs.mkdir(target,{recursive:true});
async function linkTree(from,to){for(const entry of await fs.readdir(from,{withFileTypes:true})){const a=path.join(from,entry.name),b=path.join(to,entry.name);if(entry.isDirectory()){await fs.mkdir(b);await linkTree(a,b);}else if(!['game.mjs','index.html'].includes(entry.name))await fs.link(a,b);}}
await linkTree(source,target);
const renderer=`import * as RealTHREE from './vendor/three.module.min.js';
const THREE={...RealTHREE,WebGLRenderer:class{constructor(){this.domElement=document.createElement('canvas');this.shadowMap={};}setPixelRatio(){}setSize(w,h){this.domElement.width=w;this.domElement.height=h;}render(){}}};`;
const inspect=`
let qaSavedState;
window.qaRememberAttempt=()=>{qaSavedState=state;};
window.qaInspect=()=>({playing,paused,sameAttempt:state===qaSavedState,held:[...input],dialogOpen:$('overlay').open,nativeModal:$('overlay').matches(':modal')});
`;
const game=(await fs.readFile(path.join(source,'game.mjs'),'utf8')).replace("import * as THREE from './vendor/three.module.min.js';",renderer)+inspect;
await fs.writeFile(path.join(target,'game.mjs'),game);
const setup=`<script>Object.defineProperty(navigator,'standalone',{value:new URLSearchParams(location.search).get('mode')!=='browser',configurable:true});</script>`;
await fs.writeFile(path.join(target,'index.html'),(await fs.readFile(path.join(source,'index.html'),'utf8')).replace('<script type="module" src="layout.mjs">',setup+'<script type="module" src="layout.mjs">'));
await fs.copyFile(path.join(root,'tests/long-jump/browser-root-origin.html'),path.join(root,'dist/qa-root-origin.html'));
console.log('Prepared /qa-root-origin.html: real DOM/input/game handlers; renderer only is stubbed. Not iOS compositor acceptance.');
