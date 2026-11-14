import {ASSISTS} from './assist-machines.js';
import {createRaffleMachine} from './raffle-machine.js';
import {lotteryPresentation} from './lottery-events.js';
/** Decorative only. All coordinates are physics-space; mapX handles renderer mirroring.
 * Caller owns the real gate and actual collision geometry. No hit targets/input here.
 */
export function createLotteryVisuals(T,{scene,shape,stations=[],mapX=x=>x,createCanvas=()=>globalThis.document?.createElement('canvas'),coworkers=null,view='reverse'}={}){
 if(!scene||!shape||![shape.x,shape.z,shape.hx,shape.hz].every(Number.isFinite))throw new TypeError('scene and shared rectangular collider required');
 const root=new T.Group();root.name='tailPartyLottery';scene.add(root);
 const ownedG=new Set(),ownedM=new Set(),ownedTex=new Set();
 const mat=(color)=>{const m=new T.MeshBasicMaterial({color});ownedM.add(m);return m;};
 const gold=mat(0xffcc38),ink=mat(0x192c35),red=mat(0xc4444d),cyan=mat(0x67ddff),pink=mat(0xff83cc),paper=mat(0xfff1cf);
 const mesh=(g,m,parent,pos)=>{ownedG.add(g);const o=new T.Mesh(g,m);parent.add(o);if(pos)o.position.set(...pos);return o;};
 const cube=(x,y,z,m,p,at)=>mesh(new T.BoxGeometry(x,y,z),m,p,at);
 const ring=(r,m,p,at)=>{const n=mesh(new T.TorusGeometry(r,.075,5,24),m,p,at);n.rotation.x=Math.PI/2;return n;};
 const box=new T.Group();box.position.set(mapX(shape.x),0,shape.z);root.add(box);
 const machine=createRaffleMachine(T,{parent:box,shape});
 const effects={};for(const id of ['gate','upgrade','busy']){effects[id]=new T.Group();root.add(effects[id]);effects[id].visible=false;}
 // Physical gate is rendered by the host; these stripes visibly highlight its location.
 for(const x of [-7.6,7.6])cube(.25,1.6,.25,gold,effects.gate,[mapX(x),.85,46.5]);
 cube(15.2,.16,.16,gold,effects.gate,[0,1.65,46.5]);
 const halos=[];for(const p of Object.entries(ASSISTS).filter(([id])=>id!=='center').map(([,o])=>o))halos.push(ring(2.3,cyan,effects.upgrade,[mapX(p.x),.15,p.z]));
 for(const x of [-17.2,17.2])cube(.15,.12,46,pink,effects.busy,[mapX(x),.13,12]);
 const chain=new T.Group();root.add(chain);chain.visible=false;
 const links=[];for(let i=0;i<2;i++)links.push(cube(.08,.08,1,pink,chain,[0,.4,0]));
 const geometry=new T.PlaneGeometry(.25,.38);ownedG.add(geometry);const confetti=new T.InstancedMesh(geometry,paper,12);effects.busy.add(confetti);const dummy=new T.Object3D();
 const stationMap=new Map(stations.map(s=>[s.id,s]));let chainUntil=0,lastVisualClock=0,disposed=false,lastText='';
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
  if(effects.upgrade.visible)halos.forEach((n,i)=>n.scale.setScalar(1+Math.sin(now*5+i)*.08));
  if(effects.busy.visible){for(let i=0;i<12;i++){const lane=i%2?1:-1,t=(now*.7+i*.17)%1;dummy.position.set(lane*(5+i%4*2)+Math.sin(now+i)*.3,1+t*2,-7+(i*7%42));dummy.rotation.set(now+i,0,now*.7+i);dummy.updateMatrix();confetti.setMatrixAt(i,dummy.matrix);}confetti.instanceMatrix.needsUpdate=true;}
  chain.visible=now<chainUntil;chain.scale.y=1+Math.sin(now*24)*.2;
  coworkers?.update(effects.busy.visible,now);

 }
 function dispose(){if(disposed)return;disposed=true;root.removeFromParent();machine.dispose();coworkers?.dispose();ownedG.forEach(g=>g.dispose());ownedM.forEach(m=>m.dispose());ownedTex.forEach(t=>t.dispose());}
 return {root,box,machine,label,effects,chain,update,consume,dispose};
}
