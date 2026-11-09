import test from 'node:test';
import assert from 'node:assert/strict';
import {readBeforeCoordination as readFileSync} from '../helpers/vault-air-coordination-provenance.mjs';
import * as P from '../../public/games/pole-vault/physics.mjs';
import * as audit from '../helpers/vault-air-balance-provenance.mjs';
import {JOURNEY_STAGES} from '../../public/games/pole-vault/sky-journey.mjs';
import {imperfectController,runPacedAttempt} from './helpers/pace-strategy.mjs';

const url=new URL('../../public/games/pole-vault/physics.mjs',import.meta.url);
const row=audit.validate(audit.manifest()).files.find(f=>f.path==='public/games/pole-vault/physics.mjs');
const parentSource=row.beforeText;
const parentModule=parentSource.replace(/from (['"])(\.[^'"]+)\1/g,(_,q,path)=>`from ${q}${new URL(path,url).href}${q}`);
const before=await import('data:text/javascript;base64,'+Buffer.from(parentModule).toString('base64'));
const keys=mask=>[0,1,2,3].map(i=>!!(mask&(1<<i)));
const dts=[1/120,1/60,1/30];
function airborne({time=2,j=[0,0,0,0],lean=0,momentum=0}={}){
 return Object.assign(P.fresh(),{phase:'air',t:10,airTime:time,y:101.18,altitude:100,maxHeight:100,vx:.8,vy:30,
  launchX:0,launchY:1.18,launchLean:.17,launchCharge:.82,launchSpeed:20,lastWorkTime:time,
  j:[...j],held:j.map(Boolean),lean,momentum,spin:momentum});
}
const unaltered=['t','phase','x','y','vx','vy','energy','j','held','kick','airTime','airEffort','efficiency','airWork','airLift','workUnits','lastWorkTime','difficulty','wind','combo','stats','grip','charge','plantQuality','releaseQuality'];

test('runtime changes exactly the approved angular block and reuses existing smooth',()=>{
 const source=readFileSync(url,'utf8');
 const added=' const balance=smooth((s.airTime-.32)/3.68);\n s.momentum+=dt*(torque*(.48+.32*balance)+(s.j[0]+s.j[2]-s.j[1]-s.j[3])*(.30+.15*balance)+s.wind+s.lean*(.08+.08*balance));\n s.momentum=clamp(s.momentum*Math.exp(-dt*(.65-.25*balance)),-5,5);';
 const removed=' s.momentum+=dt*(torque*.48+(s.j[0]+s.j[2]-s.j[1]-s.j[3])*.30+s.wind+s.lean*.08);\n s.momentum=clamp(s.momentum*Math.exp(-dt*.65),-5,5);';
 assert.ok(source.includes(added));assert.equal(source.replace(added,removed),parentSource);
 assert.equal(source.match(/const smooth=/g).length,1);
 assert.equal(P.fresh().ruleset,before.fresh().ruleset,'preview keeps its existing score contract');
});

for(let mask=0;mask<16;mask++)test(`limb state ${mask.toString(2).padStart(4,'0')}: grace, input transitions and earned lift remain intact`,()=>{
 for(const dt of dts){
  for(const time of [0,.12,.25,.32-dt]){
   const a=airborne({time,j:[.2,.8,.7,.1],lean:.2,momentum:-.4}),b=structuredClone(a);
   P.step(a,keys(mask),dt);before.step(b,keys(mask),dt);
   // At exactly .32s only the new coordination tracker starts; original state stays identical.
   const {balanceEdges,balanceCoordination,...original}=a;assert.deepEqual(original,b,'launch protection remains identical');
  }
  for(const time of [.5,1,2,4,10])for(let prior=0;prior<16;prior++){
   const a=airborne({time,j:keys(prior).map(Number),lean:.2,momentum:.4}),b=structuredClone(a);
   P.step(a,keys(mask),dt);before.step(b,keys(mask),dt);
   for(const key of unaltered)assert.deepEqual(a[key],b[key],`${key}: mask ${mask}, prior ${prior}, t ${time}, dt ${dt}`);
   assert.ok(Number.isFinite(a.lean)&&Number.isFinite(a.spin)&&Math.abs(a.momentum)<=5);
  }
 }
});

test('settled left and right inputs gain angular authority after grace without changing their direction',()=>{
 for(const mask of [1,2,4,8,5,10])for(const time of [.5,1,2,4,10]){
  const a=airborne({time,j:keys(mask).map(Number)}),b=structuredClone(a);
  P.step(a,keys(mask));before.step(b,keys(mask));
  assert.equal(Math.sign(a.momentum),Math.sign(b.momentum));
  assert.ok(Math.abs(a.momentum)>Math.abs(b.momentum),'post-grace imbalance requires stronger correction');
 }
});
test('the ramp is continuous near protection end and full strength, and remains bounded at supported frame sizes',()=>{
 for(const dt of dts)for(const boundary of [.32,4]){
  const a=airborne({time:boundary-dt-1e-7,j:[1,0,1,0]}),b=airborne({time:boundary-dt+1e-7,j:[1,0,1,0]});
  const oldA=structuredClone(a),oldB=structuredClone(b);
  P.step(a,[1,0,1,0],dt);P.step(b,[1,0,1,0],dt);before.step(oldA,[1,0,1,0],dt);before.step(oldB,[1,0,1,0],dt);
  // The pre-existing grace branch resets angular velocity. Check continuity
  // of the new ramp's contribution without redefining that original release.
  assert.ok(Math.abs((a.momentum-oldA.momentum)-(b.momentum-oldB.momentum))<1e-6);
  assert.ok(Math.abs((a.lean-oldA.lean)-(b.lean-oldB.lean))<1e-6);
 }
 for(const momentum of [-50,-5,0,5,50])for(const mask of [0,5,10,15])for(const dt of dts){
  const s=airborne({time:20,momentum});P.step(s,keys(mask),dt);
  assert.ok(Math.abs(s.momentum)<=5&&Number.isFinite(s.lean));
 }
});
test('run-up, planting, release and cancellation match the previous physics step for step',()=>{
 for(const dt of dts)for(const cadence of [.16,.28,.6,.8])for(const mode of ['alternating','same','both']){
  const a=P.fresh(),b=before.fresh();let cancelled=false;
  while(a.phase!=='air'&&a.phase!=='done'&&a.t<15){
   const beat=Math.floor(a.t/cadence),on=a.t%cadence<.1;
   const input=a.phase==='run'?[1,1,on&&(mode!=='alternating'||beat%2===0),on&&(mode==='both'||mode==='alternating'&&beat%2===1)]:a.phase==='plant'&&a.charge<.82?[1,1,0,0]:[];
   if(a.phase==='plant'&&a.charge>.3&&!cancelled){P.cancelMotion(a);before.cancelMotion(b);cancelled=true;}
   P.step(a,input,dt);before.step(b,input,dt);assert.deepEqual(a,b);
  }
 }
});
test('manual finish, clearance, drop and landing keep the exact pre-change state transitions',()=>{
 for(const dt of dts)for(const mask of [0,1,2,4,8,5,10,15]){
  const a=airborne({time:5,lean:.1}),b=structuredClone(a);
  assert.equal(P.requestFinish(a),before.requestFinish(b));assert.deepEqual(a,b);
  while(a.phase!=='done'&&a.t<25){P.step(a,keys(mask),dt);before.step(b,keys(mask),dt);assert.deepEqual(a,b);}
  assert.equal(a.phase,'done');assert.equal(a.scoreLockCount,1);
 }
});
for(const reaction of [.4,.55])test(`finite ${reaction}s feedback retains all 22 scenic subjects and existing intervals`,()=>{
 for(const seed of [1,7,19,41]){
  const r=runPacedAttempt(P,JOURNEY_STAGES,{controller:imperfectController(seed,{reaction,noise:.06,miss:.08})});
  assert.equal(r.state.phase,'air');assert.deepEqual(r.crossings.map(x=>x.id),JOURNEY_STAGES.map(x=>x.id));
  assert.ok(r.crossings.at(-1).airTime<390);
  for(let i=1;i<r.crossings.length;i++){const gap=r.crossings[i].airTime-r.crossings[i-1].airTime;assert.ok(gap>=7.8&&gap<=12.2);}
 }
});
test('absent corrective observation and static keys still fail through the existing ending',()=>{
 for(const controller of [()=>[],()=>[1,1,1,1],imperfectController(7,{reaction:1e9})]){
  const r=runPacedAttempt(P,JOURNEY_STAGES,{controller,seconds:45});
  assert.equal(r.state.phase,'done');assert.equal(r.crossings.length,0);assert.equal(r.state.scoreLockCount,1);
  assert.match(r.state.endReason,/失衡|升力|力氣/);
 }
});
