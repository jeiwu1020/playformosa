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
 cube(shape.hx*2,1.65,shape.hz*2,red,box,[0,.825,0]);cube(shape.hx*2+.15,.15,shape.hz*2+.15,gold,box,[0,1.7,0]);cube(shape.hx*.9,.025,.16,ink,box,[0,1.79,0]);cube(.16,1.66,shape.hz*2+.025,gold,box,[0,.825,0]);
 const wheel=new T.Group();wheel.position.set(0,2.2,0);box.add(wheel);
 for(let i=0;i<6;i++){const n=mesh(new T.CylinderGeometry(.45,.45,.08,3),[gold,cyan,pink][i%3],wheel);n.position.set(Math.cos(i*Math.PI/3)*.55,0,Math.sin(i*Math.PI/3)*.55);n.rotation.y=-i*Math.PI/3;}
 const aura=ring(Math.max(shape.hx,shape.hz)+.35,gold,box,[0,.13,0]);
 const bulbs=[];for(let i=0;i<3;i++)bulbs.push(mesh(new T.SphereGeometry(.13,8,6),gold,box,[(i-1)*.42,1.2,-shape.hz-.035]));
 const effects={};for(const id of ['gate','upgrade','busy']){effects[id]=new T.Group();root.add(effects[id]);effects[id].visible=false;}
 // Physical gate is rendered by the host; these stripes visibly highlight its location.
 for(const x of [-7.6,7.6])cube(.25,1.6,.25,gold,effects.gate,[mapX(x),.85,46.5]);
 cube(15.2,.16,.16,gold,effects.gate,[0,1.65,46.5]);
 const halos=[];for(const p of [{x:-10.5,z:1.5},{x:10.5,z:1.5},{x:-12.6,z:-8.8},{x:12.6,z:-8.8}])halos.push(ring(2.3,cyan,effects.upgrade,[mapX(p.x),.15,p.z]));
 for(const x of [-17.2,17.2])cube(.15,.12,46,pink,effects.busy,[mapX(x),.13,12]);
 const chain=new T.Group();root.add(chain);chain.visible=false;
 const links=[];for(let i=0;i<2;i++)links.push(cube(.08,.08,1,pink,chain,[0,.4,0]));
 const geometry=new T.PlaneGeometry(.25,.38);ownedG.add(geometry);const confetti=new T.InstancedMesh(geometry,paper,12);effects.busy.add(confetti);const dummy=new T.Object3D();
 const stationMap=new Map(stations.map(s=>[s.id,s]));let chainUntil=0,lastVisualClock=0,disposed=false,lastText='';
 const canvas=createCanvas?.();let label=null,context=null,texture=null;
 if(canvas){canvas.width=768;canvas.height=128;context=canvas.getContext('2d');if(context){texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;ownedTex.add(texture);const m=new T.SpriteMaterial({map:texture,depthTest:true});ownedM.add(m);label=new T.Sprite(m);label.position.set(view==='original'?7.2:0,3.2,0);label.scale.set(6.4,1.067,1);box.add(label);if(view==='original'){const g=new T.BufferGeometry().setFromPoints([new T.Vector3(shape.hx+.1,1.8,0),new T.Vector3(4.1,3.2,0)]),m=new T.LineBasicMaterial({color:0xffcc38});ownedG.add(g);ownedM.add(m);const leader=new T.Line(g,m);leader.name='lottery-label-leader';box.add(leader);}}}
 function consume(command,now){
  if(disposed||command.type!=='lotteryChain'||!Number.isFinite(now))return;
  const from=stationMap.get(command.stationId);if(!from)return;
  links.forEach((link,i)=>{const to=stationMap.get(command.targets?.[i]);link.visible=!!to;if(!to)return;const dx=mapX(to.x)-mapX(from.x),dz=to.z-from.z;link.position.set((mapX(to.x)+mapX(from.x))/2,.4,(to.z+from.z)/2);link.scale.z=Math.hypot(dx,dz);link.rotation.y=Math.atan2(dx,dz);});chainUntil=now+.65;
 }
 function update(state,now,{camera=null,frame=null,compact=false}={}){
  if(disposed)return;if(state?.phase==='ended'||now<lastVisualClock)chainUntil=0;lastVisualClock=now;const p=lotteryPresentation(state,now);root.visible=p.phase!=='ended';
  for(const id of Object.keys(effects))effects[id].visible=p.phase==='active'&&state.prize===id&&p.remaining>0;
  wheel.rotation.y=p.phase==='drawing'?now*22:Math.floor((now%20)/20)*0;wheel.visible=p.phase==='drawing'||p.phase==='ready';
  aura.visible=p.phase==='ready'||p.phase==='drawing';aura.scale.setScalar(1+Math.sin(now*5)*.045);
  bulbs.forEach((n,i)=>{n.visible=p.phase==='ready'||p.phase==='drawing'||i<(state?.charged?.length||0);});
  halos.forEach((n,i)=>n.scale.setScalar(1+Math.sin(now*5+i)*.08));
  if(effects.busy.visible){for(let i=0;i<12;i++){const lane=i%2?1:-1,t=(now*.7+i*.17)%1;dummy.position.set(lane*(5+i%4*2)+Math.sin(now+i)*.3,1+t*2,-7+(i*7%42));dummy.rotation.set(now+i,0,now*.7+i);dummy.updateMatrix();confetti.setMatrixAt(i,dummy.matrix);}confetti.instanceMatrix.needsUpdate=true;}
  chain.visible=now<chainUntil;chain.scale.y=1+Math.sin(now*24)*.2;
  coworkers?.update(effects.busy.visible,now);
  // Phones use the existing HUD message slot, not a world-space floating sign.
  const text=p.text;if(label){label.visible=!compact;label.scale.set(6.4,1.067,1);label.userData.compact=compact;label.userData.text=text;}const leader=box.getObjectByName('lottery-label-leader');if(leader)leader.visible=!compact;
  const paintKey=String(compact)+text;
  if(context&&!compact&&paintKey!==lastText){lastText=paintKey;context.clearRect(0,0,768,128);context.fillStyle='#192c35';context.fillRect(0,0,768,128);context.strokeStyle='#ffcc38';context.lineWidth=6;context.strokeRect(3,3,762,122);context.fillStyle='#fff1cf';context.textAlign='center';context.textBaseline='middle';context.font='bold 38px sans-serif';context.fillText(text,384,64,730);texture.needsUpdate=true;}
 }
 function dispose(){if(disposed)return;disposed=true;root.removeFromParent();coworkers?.dispose();ownedG.forEach(g=>g.dispose());ownedM.forEach(m=>m.dispose());ownedTex.forEach(t=>t.dispose());}
 return {root,box,label,effects,chain,update,consume,dispose};
}
