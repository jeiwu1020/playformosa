import test from 'node:test';
import assert from 'node:assert/strict';
import {StableRig,SLOPE} from '../../public/games/overtime-pinball/camera.js';
import * as T from '../../public/games/overtime-pinball/vendor/three.module.min.js';
import {MAIL_PATH} from '../../public/games/overtime-pinball/mail-run.js';
import {MAIL_BRANCHES,SHORT_PATH} from '../../public/games/overtime-pinball/office-routes.js';
for(const [w,h] of [[398,350],[536,390],[359,300],[504,375],[620,430]])for(const view of ['original','reverse'])test(`compact landscape aligns top without clipping ${w} ${h} ${view}`,()=>{
 const rig=new StableRig(view),p=rig.update(0,w,h,{x:0,z:0},null,null,false,{portrait:false,compact:true,cameraTop:0,safeBottom:0});const c=new T.PerspectiveCamera(p.fov,w/h,.1,1000);c.position.set(...p.position);c.lookAt(new T.Vector3(...p.target));c.updateMatrixWorld();
 const ps=[];for(const path of [MAIL_PATH,SHORT_PATH,...Object.values(MAIL_BRANCHES).map(b=>b.path)])for(const p of path)for(const dx of[-1.8,1.8])for(const y of[0,5])ps.push([p.x+dx,y+(p.y||0),p.z]);for(const x of[-18.8,18.8])for(const z of[-20,50.3,52.3])for(const y of(z===52.3?[2.2,6.05]:[0,5]))ps.push([x,y,z]);
 const qs=ps.map(p=>new T.Vector3(-p[0],p[1],p[2]).applyAxisAngle(new T.Vector3(1,0,0),SLOPE).project(c));assert.ok(Math.max(...qs.map(q=>q.y))>.94,'unused headroom');assert.ok(qs.every(q=>Math.abs(q.x)<=1.025&&Math.abs(q.y)<=1.025),'all route/drain bounds visible');
});
