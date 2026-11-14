import test from 'node:test';
import assert from 'node:assert/strict';
import {ASSISTS,freshAssists,updateAssists,firstAssistContact,resolveAssist,assistColliders,ASSIST_OBSTACLES} from '../../public/games/overtime-pinball/assist-machines.js';
import {Game,STEP} from '../../public/games/overtime-pinball/physics.js';
const game=()=>({assists:freshAssists(),time:0,flipperStroke:{left:0,right:0},ball:{x:0,z:0,vx:0,vz:0,r:.65},hits:0,bonus:0,interactionReady:0,events:[],emit(type,e){this.events.push({type,...e});}});
test('upper left/right mechanisms coexist with original middle drawers',()=>{
 assert.ok(ASSISTS.upperLeft&&ASSISTS.upperRight);
 assert.equal(ASSISTS.left.z,7);assert.equal(ASSISTS.right.z,7);
 for(const id of ['upperLeft','upperRight']){assert.ok(ASSISTS[id].z< -5);assert.ok(ASSIST_OBSTACLES.some(o=>o.id==='assist-'+id));}
});
test('same-side fresh press animates upper drawer but does not remotely move ball',()=>{
 const g=game(),before={...g.ball};updateAssists(g,.03,{left:true,right:false});
 assert.ok(g.assists.upperLeft?.amount>0);assert.equal(g.assists.upperRight?.amount,0);assert.deepEqual(g.ball,before);
 const age=g.assists.upperLeft.age;g.time=.1;updateAssists(g,.03,{left:false,right:false});assert.ok(g.assists.upperLeft.age>age);
});
test('timed upper contact redirects inward and upward only once per stroke',()=>{
 for(const id of ['upperLeft','upperRight']){const g=game(),o=ASSISTS[id];assert.ok(o);g.assists[id].amount=.7;g.ball.z=o.z;
 const c={station:{assistId:id},impactAmount:.7,nx:o.inward,nz:0,poweredContact:true};resolveAssist(g,c);
 assert.ok(g.ball.vx*o.inward>20);assert.ok(g.ball.vz< -8);assert.equal(g.events.filter(e=>e.type==='assistKick').length,1);
 resolveAssist(g,c);assert.equal(g.events.filter(e=>e.type==='assistKick').length,1);
 }
});
test('upper powered face detects a fast crossing while rear stays passive',()=>{
 for(const id of ['upperLeft','upperRight']){const o=ASSISTS[id];assert.ok(o);const states=freshAssists();states[id].previousAmount=states[id].amount=.7;
 const face=o.x+o.inward*(o.hx+o.extension*.7),from={x:face+o.inward*8,z:o.z},to={x:face-o.inward*3,z:o.z};
 const c=firstAssistContact(from,to,states,.65);assert.equal(c?.station.assistId,id);assert.ok(c.poweredContact);
 const g=game();g.assists[id].amount=.7;resolveAssist(g,{station:{assistId:id},impactAmount:.7,nx:-o.inward,nz:0,poweredContact:false});assert.equal(g.events.length,0);
 }
});
test('upper input cannot repeatedly reset extended stroke or award without contact',()=>{
 const g=game();for(let i=0;i<60;i++){g.time=i/120;updateAssists(g,1/120,{left:true,right:true});}
 assert.equal(g.events.filter(e=>e.type==='assistStroke'&&e.id==='upperLeft').length,1);assert.equal(g.bonus,0);
 assert.equal(assistColliders(g.assists).length,4);
});
test('both view games retain finite trajectories with upper presses',()=>{
 for(const view of ['normal','reverse']){const g=new Game({view,patrol:false});g.start();g.interactionsEnabled=false;
 Object.assign(g.ball,{x:-7,z:-8,vx:-28,vz:5});for(let i=0;i<600;i++){g.update(STEP,{left:i%60===0,right:i%90===0});assert.ok(Number.isFinite(g.ball.x+g.ball.z+g.ball.vx+g.ball.vz));}
 }
});
test('timed press changes upper ball path in real Game, both sides and views',()=>{
 for(const view of ['original','reverse'])for(const side of ['left','right']){
  const run=pressed=>{const g=new Game({view,patrol:false});g.start();g.interactionsEnabled=false;Object.assign(g.ball,{x:side==='left'?-9:9,z:-8.8,vx:0,vz:0});g.events=[];for(let i=0;i<20;i++)g.update(STEP,{[side]:pressed&&i===0});return g;};
  const passive=run(false),active=run(true);assert.equal(passive.events.filter(e=>e.type==='assistKick').length,0);assert.equal(active.events.filter(e=>e.type==='assistKick').length,1);
  assert.ok(Math.abs(active.ball.x-passive.ball.x)>3);assert.ok(active.ball.vz< -8);assert.ok(Math.abs(passive.ball.vx)<.001);
 }
});
test('upper housings and full extension do not overlap static equipment in either view',async()=>{
 const {BUMPERS}=await import('../../public/games/overtime-pinball/physics.js');const {SOLID_PROPS}=await import('../../public/games/overtime-pinball/board-features.js');const {stationShapes}=await import('../../public/games/overtime-pinball/contact.js');
 for(const view of ['original','reverse'])for(const id of ['upperLeft','upperRight']){
  const o=ASSISTS[id],x=o.x+o.inward*o.extension/2,hx=o.hx+o.extension/2;
  for(const item of [...BUMPERS,...SOLID_PROPS])for(const shape of stationShapes(item,view)){
   const dx=Math.max(0,Math.abs(shape.x-x)-hx),dz=Math.max(0,Math.abs(shape.z-o.z)-o.hz);assert.ok(Math.hypot(dx,dz)>(shape.r||0),id+' overlaps '+item.id);
  }
 }
});
test('rendered upper drawers share physical positions and correct view-relative key labels',async()=>{
 const T=await import('../../public/games/overtime-pinball/vendor/three.module.min.js');const {buildAssists}=await import('../../public/games/overtime-pinball/assist-office.js');
 for(const view of ['original','reverse']){
  const office=new T.Group(),labels=[];const box=(w,h,d,c,p,x=0,y=0,z=0)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial({color:c}));m.position.set(x,y,z);p.add(m);return m;};
  const cylinder=(r,h,c,p,x=0,y=0,z=0)=>box(r*2,h,r*2,c,p,x,y,z);const label=(text)=>{labels.push(text);return new T.Group();};
  const visual=buildAssists({T,office,box,cylinder,label,C:{ink:0,teal:1,yellow:2,cream:3,orange:4},view});
  assert.equal(Object.keys(visual.models).length,5);
  for(const id of ['upperLeft','upperRight']){const o=ASSISTS[id],root=visual.models[id].root;assert.equal(root.position.x,-o.x);assert.equal(root.position.z,o.z);}
  assert.equal(labels[2],(view==='reverse'?'R':'L')+' 上段轉送');assert.equal(labels[3],(view==='reverse'?'L':'R')+' 上段轉送');
  const g=game();g.central={available:false};g.stationReady={};g.assists.upperLeft.amount=.6;visual.update(g);assert.equal(visual.models.upperLeft.tray.scale.x,.6);
 }
});
