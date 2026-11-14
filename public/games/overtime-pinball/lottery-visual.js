import {ASSISTS} from './assist-machines.js';
import {createRaffleMachine} from './raffle-machine.js';
import {lotteryPresentation} from './lottery-events.js';
/** Decorative only. All coordinates are physics-space; mapX handles renderer mirroring.
 * Caller owns the real gate and actual collision geometry. No hit targets/input here.
 */
export function createLotteryVisuals(T,{scene,shape,stations=[],mapX=x=>x,createCanvas=()=>globalThis.document?.createElement('canvas'),coworkers=null,view='reverse',reducedMotion=false}={}){
 if(!scene||!shape||![shape.x,shape.z,shape.hx,shape.hz].every(Number.isFinite))throw new TypeError('scene and shared rectangular collider required');
 const root=new T.Group();root.name='tailPartyLottery';scene.add(root);
 const ownedG=new Set(),ownedM=new Set(),ownedTex=new Set();
 const mat=(color)=>{const m=new T.MeshBasicMaterial({color});ownedM.add(m);return m;};
 const gold=mat(0xffcc38),pink=mat(0xff83cc),paper=mat(0xfff1cf);
 const mesh=(g,m,parent,pos)=>{ownedG.add(g);const o=new T.Mesh(g,m);parent.add(o);if(pos)o.position.set(...pos);return o;};
 const cube=(x,y,z,m,p,at)=>mesh(new T.BoxGeometry(x,y,z),m,p,at);
 const ringField=(name,positions,color,opacity,parent,radius,tube)=>{const geometry=new T.TorusGeometry(1,tube,6,32);ownedG.add(geometry);const material=new T.MeshBasicMaterial({color,transparent:true,opacity,blending:T.AdditiveBlending,side:T.DoubleSide,depthWrite:false,forceSinglePass:true});ownedM.add(material);const mesh=new T.InstancedMesh(geometry,material,positions.length);mesh.name=name;parent.add(mesh);return{mesh,positions,radius,opacity,y:.13};};
 const box=new T.Group();box.position.set(mapX(shape.x),0,shape.z);root.add(box);
 const machine=createRaffleMachine(T,{parent:box,shape,reducedMotion});
 const effects={};for(const id of ['gate','upgrade','busy']){effects[id]=new T.Group();root.add(effects[id]);effects[id].visible=false;}
 // Physical gate is rendered by the host; these stripes visibly highlight its location.
 for(const x of [-7.6,7.6])cube(.25,1.6,.25,gold,effects.gate,[mapX(x),.85,46.5]);
 cube(15.2,.16,.16,gold,effects.gate,[0,1.65,46.5]);
 const assistPositions=Object.entries(ASSISTS).filter(([id])=>id!=='center').map(([,o])=>({x:o.x,z:o.z,scale:1}));
 const halos={outer:ringField('lottery-upgrade-pink-halos',assistPositions,0xff83cc,.24,effects.upgrade,2.8,.12),core:ringField('lottery-upgrade-pink-core',assistPositions,0xff83cc,.88,effects.upgrade,2.25,.055),inner:ringField('lottery-upgrade-cyan-halos',assistPositions,0x67ddff,.72,effects.upgrade,1.9,.045)};
 const busyPositions=stations.filter(s=>Number.isFinite(s.x)&&Number.isFinite(s.z)).map(s=>({x:s.x,z:s.z,scale:Math.max(.85,(s.r||1.1)/1.45)}));
 const busyHalos=ringField('lottery-busy-station-halos',busyPositions,0xff83cc,.24,effects.busy,1.9,.12),busyCore=ringField('lottery-busy-station-core',busyPositions,0xff83cc,.9,effects.busy,1.55,.055),ringDummy=new T.Object3D();
 for(const x of [-17.2,17.2])cube(.15,.12,46,pink,effects.busy,[mapX(x),.13,12]);
 const chain=new T.Group();root.add(chain);chain.visible=false;
 const links=[];for(let i=0;i<2;i++)links.push(cube(.08,.08,1,pink,chain,[0,.4,0]));
 const geometry=new T.PlaneGeometry(.25,.38);ownedG.add(geometry);const confetti=new T.InstancedMesh(geometry,paper,12);effects.busy.add(confetti);const dummy=new T.Object3D();
 const stationMap=new Map(stations.map(s=>[s.id,s]));let chainUntil=0,lastVisualClock=0,disposed=false,lastText='';
 function pulseField(field,now,rate,phase){if(!field.mesh.count)return;for(let i=0;i<field.positions.length;i++){const p=field.positions[i],pulse=(Math.sin(now*rate+i*phase)+1)/2;ringDummy.position.set(mapX(p.x),field.y+.035*pulse,p.z);ringDummy.rotation.set(Math.PI/2,0,now*.22+i*.11);ringDummy.scale.setScalar(field.radius*(p.scale||1)*(.88+.24*pulse));ringDummy.updateMatrix();field.mesh.setMatrixAt(i,ringDummy.matrix);}field.mesh.instanceMatrix.needsUpdate=true;field.mesh.material.opacity=field.opacity*(.48+.52*(.5+.5*Math.sin(now*rate)));}
 // Station-labels owns the unified title. No giant floating sign/leader here.
 const label=null;
 function consume(command,now){
  if(disposed||command.type!=='lotteryChain'||!Number.isFinite(now))return;
  const from=stationMap.get(command.stationId);if(!from)return;
  links.forEach((link,i)=>{const to=stationMap.get(command.targets?.[i]);link.visible=!!to;if(!to)return;const dx=mapX(to.x)-mapX(from.x),dz=to.z-from.z;link.position.set((mapX(to.x)+mapX(from.x))/2,.4,(to.z+from.z)/2);link.scale.z=Math.hypot(dx,dz);link.rotation.y=Math.atan2(dx,dz);});chainUntil=now+.65;
 }
 function update(state,now,{camera=null,frame=null,compact=false}={}){
  if(disposed)return;if(state?.phase==='ended'||now<lastVisualClock)chainUntil=0;lastVisualClock=now;const p=lotteryPresentation(state,now);root.visible=p.phase!=='ended';
  for(const id of Object.keys(effects))effects[id].visible=p.phase==='active'&&state.prize===id&&p.remaining>0;
  machine.update(state,now);
  if(effects.upgrade.visible){pulseField(halos.outer,now,6,.85);pulseField(halos.core,now,6,1.05);pulseField(halos.inner,now,6,1.15);}
  if(effects.busy.visible){pulseField(busyHalos,now,7,.72);pulseField(busyCore,now,7,1.08);}
  if(effects.busy.visible){for(let i=0;i<12;i++){const lane=i%2?1:-1,t=(now*.7+i*.17)%1;dummy.position.set(lane*(5+i%4*2)+Math.sin(now+i)*.3,1+t*2,-7+(i*7%42));dummy.rotation.set(now+i,0,now*.7+i);dummy.updateMatrix();confetti.setMatrixAt(i,dummy.matrix);}confetti.instanceMatrix.needsUpdate=true;}
  chain.visible=now<chainUntil;chain.scale.y=1+Math.sin(now*24)*.2;
  coworkers?.update(effects.busy.visible,now);

 }
 function dispose(){if(disposed)return;disposed=true;root.removeFromParent();machine.dispose();coworkers?.dispose();ownedG.forEach(g=>g.dispose());ownedM.forEach(m=>m.dispose());ownedTex.forEach(t=>t.dispose());}
 return {root,box,machine,label,effects,halos,busyHalos,busyCore,chain,update,consume,dispose};
}
