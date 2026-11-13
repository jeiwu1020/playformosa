import {LOTTERY_PRIZES} from './lottery-events.js';
/** Office raffle appliance. Shared collision footprint is authoritative; all solid
 * decoration stays within it. No labels, lights, input, physics or full-screen FX.
 */
export function createRaffleMachine(T,{parent,shape}){
 if(!parent||![shape?.hx,shape?.hz].every(v=>Number.isFinite(v)&&v>0))throw new TypeError('positive shared raffle footprint required');
 const root=new T.Group();root.name='company-raffle-machine';parent.add(root);
 const geometries=new Set(),materials=new Set();const C={ink:0x192c35,teal:0x3d8d85,cream:0xfff1cf,gold:0xf4d274,blue:0x67ddff,pink:0xe8a6b4};
 const material=(color,vertexColors=false)=>{const m=new T.MeshToonMaterial({color,vertexColors});materials.add(m);return m;};
 const batch=parts=>{const ps=[],ns=[],cs=[];for(const part of parts){const g=part.geometry.index?part.geometry.toNonIndexed():part.geometry.clone();const transform=new T.Object3D();transform.position.set(...(part.at||[0,0,0]));transform.rotation.set(...(part.rotation||[0,0,0]));transform.updateMatrix();g.applyMatrix4(transform.matrix);const p=g.getAttribute('position'),n=g.getAttribute('normal'),c=new T.Color(part.color);for(let i=0;i<p.count;i++){ps.push(p.getX(i),p.getY(i),p.getZ(i));ns.push(n.getX(i),n.getY(i),n.getZ(i));cs.push(c.r,c.g,c.b);}g.dispose();part.geometry.dispose();}const merged=new T.BufferGeometry();merged.setAttribute('position',new T.Float32BufferAttribute(ps,3));merged.setAttribute('normal',new T.Float32BufferAttribute(ns,3));merged.setAttribute('color',new T.Float32BufferAttribute(cs,3));merged.computeBoundingSphere();geometries.add(merged);return merged;};
 const part=(x,y,z,color,at)=>({geometry:new T.BoxGeometry(x,y,z),color,at});
 const marker=(name,at)=>{const n=new T.Group();n.name=name;n.position.set(...at);root.add(n);return n;};
 const w=shape.hx*2,d=shape.hz*2,scale=Math.min(shape.hx,shape.hz,1.15),r=.59*scale;
 const parts=[part(w*.94,.18,d*.94,C.ink,[0,.09,0]),part(w*.88,1.02,d*.88,C.teal,[0,.69,0]),part(w*.94,.16,d*.94,C.cream,[0,1.28,0]),part(w*.38,.14,d*.4,C.ink,[0,1.42,0])];
 // Matching front/back control faces keep the silhouette legible in both cameras.
 for(const sign of [-1,1]){
  parts.push(part(w*.64,.5,.035,C.cream,[0,.86,sign*d*.447]),part(w*.42,.075,.04,C.ink,[0,1.015,sign*d*.46]),part(w*.33,.2,.04,C.ink,[0,.69,sign*d*.46]));
  for(let i=0;i<3;i++)parts.push(part(w*.06,.08,.045,[C.gold,C.blue,C.pink][i],[(-.14+i*.14)*w,.86,sign*d*.47]));
 }
 // A recognisable ticket slit and prize-ball tray, not a wrapped gift box.
 marker('raffle-ticket-slot',[0,1.015,-d*.46]);marker('raffle-prize-outlet',[0,.41,-d*.34]);
 parts.push({geometry:new T.CylinderGeometry(.27*scale,.23*scale,.11,12),color:C.gold,at:[0,.38,-d*.34]});
 const shell=new T.Mesh(batch(parts),material(0xffffff,true));shell.name='raffle-appliance-shell';root.add(shell);
 const drum=new T.Group();drum.name='raffle-ball-drum';drum.position.y=1.92;root.add(drum);
 const cage=[];for(const z of [-.26,0,.26])cage.push({geometry:new T.TorusGeometry(r,.028*scale,4,16),color:C.gold,at:[0,0,z*scale]});
 for(let i=0;i<8;i++){const a=i*Math.PI/4;cage.push(part(.035*scale,.035*scale,.52*scale,C.cream,[Math.cos(a)*r,Math.sin(a)*r,0]));}
 const cageMesh=new T.Mesh(batch(cage),material(0xffffff,true));drum.add(cageMesh);
 const sphere=new T.SphereGeometry(.11*scale,8,6);geometries.add(sphere);const balls=new T.InstancedMesh(sphere,material(0xffffff),6);balls.name='raffle-drum-balls';drum.add(balls);const dummy=new T.Object3D();
 for(let i=0;i<6;i++){const a=i*Math.PI/3;dummy.position.set(Math.cos(a)*r*.62,Math.sin(a)*r*.62,(i%2?1:-1)*.1*scale);dummy.updateMatrix();balls.setMatrixAt(i,dummy.matrix);balls.setColorAt(i,new T.Color([C.gold,C.blue,C.pink][i%3]));}balls.instanceMatrix.needsUpdate=true;
 const prizeBall=new T.Mesh(sphere,material(C.gold));prizeBall.name='raffle-awarded-ball';prizeBall.position.set(0,.52,-d*.34);prizeBall.visible=false;root.add(prizeBall);
 const ledGeometry=new T.SphereGeometry(.07*scale,6,4);geometries.add(ledGeometry);const leds=new T.InstancedMesh(ledGeometry,material(C.gold),3);root.add(leds);
 const ringGeometry=new T.TorusGeometry(Math.min(shape.hx,shape.hz)*.91,.035,4,24);geometries.add(ringGeometry);const readyRing=new T.Mesh(ringGeometry,material(C.gold));readyRing.rotation.x=Math.PI/2;readyRing.position.y=.2;root.add(readyRing);
 const sparkGeometry=new T.BoxGeometry(.035,.15,.035);geometries.add(sparkGeometry);const sparks=new T.InstancedMesh(sparkGeometry,material(C.gold),10);sparks.name='raffle-local-burst';sparks.visible=false;root.add(sparks);
 let disposed=false;
 function update(state,now){
  if(disposed)return;const phase=state?.phase,active=phase==='active'&&now<state.until,draw=phase==='drawing';root.visible=phase!=='ended';
  drum.rotation.z=draw?now*16:Math.sin(now*.8)*.06;drum.rotation.y=draw?Math.sin(now*9)*.15:0;
  readyRing.visible=phase==='ready'||draw;readyRing.scale.setScalar(1+Math.sin(now*4)*.03);
  const lit=phase==='ready'||draw?3:phase==='charging'?(state.charged?.length||0):0;
  for(let i=0;i<3;i++){dummy.position.set((i-1)*w*.18,1.385,d*.23);dummy.scale.setScalar(i<lit?1:.25);dummy.rotation.set(0,0,0);dummy.updateMatrix();leds.setMatrixAt(i,dummy.matrix);}leds.instanceMatrix.needsUpdate=true;
  prizeBall.visible=active;const color=LOTTERY_PRIZES[state?.prize]?.color||C.gold;prizeBall.material.color.setHex(color);const reveal=active?Math.max(0,Math.min(1,(now-state.drawUntil)/.55)):1;prizeBall.position.y=.52+Math.sin(reveal*Math.PI)*.25;prizeBall.scale.setScalar(1.4);
  sparks.visible=draw||(active&&now-state.drawUntil<.7);if(sparks.visible){const burst=draw?(now*1.7)%1:Math.min(1,(now-state.drawUntil)/.7);for(let i=0;i<10;i++){const a=i*Math.PI/5;dummy.position.set(Math.cos(a)*scale*(.65+burst*.35),1.85+Math.sin(a)*scale*(.35+burst*.2),Math.sin(i*2)*scale*.5);dummy.rotation.set(0,0,-a);dummy.scale.setScalar(1-burst*.45);dummy.updateMatrix();sparks.setMatrixAt(i,dummy.matrix);}sparks.instanceMatrix.needsUpdate=true;}
 }
 function dispose(){if(disposed)return;disposed=true;root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
 return {root,shell,drum,prizeBall,sparks,update,dispose};
}
