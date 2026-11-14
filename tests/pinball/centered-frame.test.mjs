import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {centeredPlayFrame} from '../../public/games/overtime-pinball/play-layout.js';
for(const [name,w,h,left,right]of [['forced',724,390,4,720],['natural-safe',844,390,64,780],['narrow',647,390,4,643]])test(`projected central axis matches real controls ${name}`,()=>{const r={left:168,width:w-168,height:h,top:0,bottom:h},a={left,width:132},b={left:right-132,width:132};const f=centeredPlayFrame(r,h,a,b);assert.equal(f.x+f.w/2,(a.left+a.width/2+b.left+b.width/2)/2);assert.equal(f.w,r.width);assert.equal(f.h,r.height);assert.equal(f.y,0);});
test('native portrait shares semitransparent control rules',()=>{const s=fs.readFileSync(new URL('../../public/games/overtime-pinball/mobile-ui.css',import.meta.url),'utf8');assert.match(s,/@media\(orientation:portrait\)[^{]*\{[^]*?\.flipper\{opacity:\.68/);});
import {StableRig,SLOPE} from '../../public/games/overtime-pinball/camera.js';
import * as T from '../../public/games/overtime-pinball/vendor/three.module.min.js';
import {MAIL_PATH} from '../../public/games/overtime-pinball/mail-run.js';
import {MAIL_BRANCHES,SHORT_PATH} from '../../public/games/overtime-pinball/office-routes.js';
for(const[W,h]of[[724,390],[756,370],[647,390],[567,320]])for(const view of ['original','reverse'])test(`drain/flipper axis and HUD clearance ${W} ${h} ${view}`,()=>{
 const w=W-168,f=centeredPlayFrame({left:168,width:w,height:h,bottom:h},h,{left:4,width:132},{left:W-136,width:132});
 const p=new StableRig(view).update(0,w,h,{x:0,z:0},null,null,false,{portrait:false,compact:true,edgeFrame:true,cameraTop:0,safeBottom:0}),c=new T.PerspectiveCamera(p.fov,w/h,.1,1000);c.position.set(...p.position);c.lookAt(new T.Vector3(...p.target));c.updateMatrixWorld();
 const project=(x,y,z)=>{const q=new T.Vector3(-x,y,z).applyAxisAngle(new T.Vector3(1,0,0),SLOPE).project(c);return{x:f.x+(q.x+1)*w/2,y:(1-q.y)*h/2};};
 for(const z of[42,46,49])assert.ok(Math.abs(project(0,0,z).x-W/2)<1e-8,'axis truly projected at controls midpoint');
 for(const path of[MAIL_PATH,SHORT_PATH,...Object.values(MAIL_BRANCHES).map(b=>b.path)])for(const p of path)for(const dx of[-1.8,1.8])for(const y of[0,5]){const q=project(p.x+dx,y+(p.y||0),p.z),hudWidth=h<=340?(q.y<96?144:140):164;assert.ok(!(q.x>0&&q.x<hudWidth&&q.y>0&&q.y<Math.min(240,h-80)),'route/actor not under HUD');}
});
