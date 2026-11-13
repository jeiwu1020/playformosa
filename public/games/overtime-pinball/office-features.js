import {WINDOWS,LAMPS,SOLID_PROPS} from './board-features.js';
// Fixed glazing keeps the room stable. Only glass is translucent; frames stay solid.
export function stableWindow(mesh,opacity=1,enabled=true){if(!enabled)return mesh;mesh.userData.occlusionMode='keep';if(opacity<1){mesh.material.transparent=true;mesh.material.opacity=opacity;mesh.material.depthWrite=false;}return mesh;}
export function buildOfficeFeatures({T,office,box,cylinder,label,C,view,stableWindows=false}){
 const windows=new Map(),lights=[];let lastTime=0;
 const flat=(geometry,color,y=.043)=>{const m=new T.Mesh(geometry,new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:true,opacity:.6,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=y;office.add(m);return m;};
 // Broad floor bands and lit corridors create office routes without invisible rails.
 for(const [z,length,color] of [[-8,24,0x8faeaa],[11,14,0xd8ba7c],[25,14,0x8ba7bb]]){const m=flat(new T.PlaneGeometry(34,length),color,.04);m.position.z=z;}
 for(const sign of [-1,1]){
  const route=new T.CatmullRomCurve3([new T.Vector3(0,.08,-11),new T.Vector3(sign*5,.08,-5),new T.Vector3(sign*14,.08,2),new T.Vector3(sign*5,.08,11),new T.Vector3(sign*14,.08,20),new T.Vector3(sign*6,.08,30),new T.Vector3(sign*5,.08,34)]);
  const line=new T.Line(new T.BufferGeometry().setFromPoints(route.getPoints(90)),new T.LineDashedMaterial({color:0xffeaa3,dashSize:.6,gapSize:.6,transparent:true,opacity:.7}));line.computeLineDistances();office.add(line);
  const dots=new T.InstancedMesh(new T.SphereGeometry(.1,6,4),new T.MeshBasicMaterial({color:0xffe69b}),65);const matrix=new T.Matrix4();for(let n=0;n<65;n++){const p=route.getPoint(n/64);matrix.makeTranslation(p.x,p.y,p.z);dots.setMatrixAt(n,matrix);}office.add(dots);
 }
 for(const w of WINDOWS){const g=new T.Group();g.name=w.id;g.userData.stationId=w.id;if(stableWindows)g.userData.occlusionMode='keep';g.position.set(-w.side*17.7,0,w.z);office.add(g);
  const frame=box(.25,2.8,6.8,C.yellow,g,0,2.5,0);
  if(stableWindows){const outer=new T.Shape();outer.moveTo(-3.4,-1.4);outer.lineTo(3.4,-1.4);outer.lineTo(3.4,1.4);outer.lineTo(-3.4,1.4);outer.closePath();const hole=new T.Path();hole.moveTo(-3.2,-1.2);hole.lineTo(-3.2,1.2);hole.lineTo(3.2,1.2);hole.lineTo(3.2,-1.2);hole.closePath();outer.holes.push(hole);const geometry=new T.ExtrudeGeometry(outer,{depth:.25,bevelEnabled:false,steps:1});geometry.translate(0,0,-.125);geometry.rotateY(Math.PI/2);frame.geometry.dispose();frame.geometry=geometry;for(const child of frame.children)if(child.isLineSegments){child.geometry.dispose();child.geometry=new T.EdgesGeometry(geometry,28);}}
  const glass=box(.28,2.4,6.3,C.blue,g,-w.side*.08,2.5,0);glass.material=new T.MeshBasicMaterial({color:0x7fbabf,transparent:true,opacity:.65});stableWindow(glass,.28,stableWindows);
  for(const z of [-2,0,2])box(.32,2.5,.11,C.cream,g,-w.side*.12,2.5,z);
  const badge=label('窗 +20',3.3,1.15);badge.rotation.y=view==='original'?Math.PI:0;badge.position.set(-w.side*1.2,4.25,0);g.add(badge);g.userData.pulse=0;windows.set(w.id,{g,glass,frame});
 }
 for(const p of LAMPS){const pedestal=cylinder(p.r,.18,0x243e42,office,-p.x,.13,p.z,32);pedestal.userData.occludes=false;pedestal.name='word-pad-'+p.id;const ring=flat(new T.RingGeometry(p.r-.14,p.r,36),0xfff0b5,.105);ring.position.set(-p.x,.245,p.z);const tile=flat(new T.CircleGeometry(p.r-.2,36),0x425a5d,.095);tile.position.set(-p.x,.235,p.z);const icon=label(p.label,3.8,3.8,'#fff4c6','#26474b');// Bias only the printed word toward the camera; retain real depth testing and the visible pad.
 icon.material.polygonOffset=true;icon.material.polygonOffsetFactor=-1;icon.material.polygonOffsetUnits=-1;icon.rotation.x=-Math.PI/2;icon.rotation.z=view==='original'?Math.PI:0;icon.position.set(-p.x,.255,p.z);icon.userData.occludes=false;office.add(icon);lights.push({tile,ring,icon,pedestal});}
 // Furniture is shared with physics; keep each solid group visible during cutaway.
 for(const p of SOLID_PROPS){const g=new T.Group();g.position.set(-p.x,0,p.z);g.userData.stationId=p.id;g.name=p.id;office.add(g);
  if(p.type==='plant'){cylinder(.65,.8,C.cream,g,0,.4,0);for(let n=0;n<4;n++){const leaf=new T.Mesh(new T.SphereGeometry(.65,8,6),new T.MeshToonMaterial({color:n%2?0x5c9273:0x82a66e}));leaf.scale.set(.7,1.4,.7);leaf.position.set(Math.sin(n*2)*.28,1.3+n*.12,Math.cos(n*2)*.28);leaf.userData.occludes=true;g.add(leaf);}}
  else{box(2.3,1.6,3.8,p.z<0?C.cream:0xd1b182,g,0,.8,0);box(2.5,.15,4,C.ink,g,0,1.65,0);for(let n=0;n<3;n++){const folder=box(.28,.6,.7,[C.orange,C.teal,C.yellow][n],g,-.5+n*.5,2,0);folder.rotation.z=.08;}}
 }
 const meeting=flat(new T.RingGeometry(5.3,5.45,48),0xe3f0c4,.07);meeting.scale.set(.9,1.4,1);meeting.position.set(-.5,.07,24);
 const gate=new T.Group();gate.name='bonusGate';office.add(gate);const barrier=box(17.6,1.5,.2,C.yellow,gate,0,.9,46.5);barrier.material=new T.MeshBasicMaterial({color:0xffd568,transparent:true,opacity:.45,depthWrite:false});barrier.userData.occludes=false;
 for(let x=-8;x<=8;x+=2){const bar=box(.35,1.5,.25,C.ink,gate,x,.9,46.5);bar.rotation.z=-.25;bar.userData.occludes=false;}
 const plate=label('暫停下班',8,1.5,'#193b3c','#ffe08a');plate.rotation.y=view==='original'?Math.PI:0;plate.position.set(0,2.3,46.5);plate.userData.occludes=false;gate.add(plate);gate.visible=false;
 return {lights,windows,gate,flash(id){const w=windows.get(id);if(w)w.g.userData.pulse=.7;},update(game,time){const delta=Math.max(0,Math.min(1,game.effectTime-lastTime));lastTime=game.effectTime;gate.visible=game.gateClosed;for(let n=0;n<lights.length;n++){const {tile,ring}=lights[n],on=game.lamps[n];tile.material.color.setHex(on?0xffd45a:0x425a5d);tile.material.opacity=on?.85:.55;ring.material.color.setHex(game.gateClosed?0xffffff:on?0xffe286:0xc4dcce);ring.material.opacity=on?.8+.15*Math.sin(time*4):.7;}for(const w of windows.values()){const p=w.g.userData.pulse||0;w.g.userData.pulse=Math.max(0,p-delta);w.glass.material.color.setHex(p>0?0xffefae:0x7fbabf);w.frame.scale.y=1+(p>0?Math.sin(p*28)*.04:0);}}};
}
