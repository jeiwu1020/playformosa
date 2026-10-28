import {PIT} from './physics.mjs';

// Scenery only. This module reads the real pose/contact and never writes to the athlete.
const LENGTH=7.2,WIDTH=3.35,END=PIT+LENGTH;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createSandpits(THREE,scene){
 const group=new THREE.Group();group.name='long-jump-sandpits';scene.add(group);
 const materials=new Map(),geometries=new Set();
 function material(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:1}));return materials.get(color);}
 const box=new THREE.BoxGeometry(1,1,1),sphere=new THREE.SphereGeometry(1,12,7),ring=new THREE.TorusGeometry(1,.105,6,28),grain=new THREE.IcosahedronGeometry(1,0);
 for(const geometry of [box,sphere,ring,grain])geometries.add(geometry);
 function mesh(parent,name,geometry,color,x,y,z,sx,sy,sz){const m=new THREE.Mesh(geometry,material(color));m.name=name;m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.receiveShadow=true;parent.add(m);return m;}
 function pit(name){
  const p=new THREE.Group();p.name=name;group.add(p);
  mesh(p,'sand-bed',box,'#e8ca86',0,.018,0,LENGTH,.035,WIDTH);
  for(const z of [-1,1]){
   mesh(p,'sandpit-side-rim',box,'#d3b17a',0,.06,z*(WIDTH/2+.065),LENGTH+.26,.10,.13);
   mesh(p,'rim-highlight',box,'#f4ddb1',0,.115,z*(WIDTH/2+.065),LENGTH+.26,.015,.13);
  }
  for(const x of [-1,1])mesh(p,'sandpit-end-rim',box,'#d3b17a',x*(LENGTH/2+.065),.06,0,.13,.10,WIDTH);
  // Freshly raked sand, not a repeated new texture/image asset.
  for(let i=0;i<10;i++)mesh(p,'rake-line',box,'#dcbc7d',(i-4.5)*.65,.038,0,.015,.003,WIDTH-.22);
  const speckles=new THREE.InstancedMesh(grain,material('#f8dfa4'),58),matrix=new THREE.Matrix4();speckles.name='sand-grains';
  for(let i=0;i<58;i++){const x=((i*37%59)/59-.5)*(LENGTH-.3),z=((i*17%61)/61-.5)*(WIDTH-.25),s=.013+(i%3)*.005;matrix.makeScale(s,.006,s);matrix.setPosition(x,.041,z);speckles.setMatrixAt(i,matrix);}p.add(speckles);
  return p;
 }
 const ordinary=pit('ordinary-sandpit'),delivered=pit('delivered-sandpit');
 // A light wooden frame is deliberately carried in from the right, not an endless sand strip.
 delivered.visible=false;
 const impact=new THREE.Group();impact.name='sand-impact';impact.visible=false;group.add(impact);
 const variants={};
 const impression=(kind,name,x,z,sx,sz)=>{const m=mesh(impact,kind+'-'+name,sphere,'#b79760',x,.04,z,sx,.014,sz);(variants[kind]??=[]).push(m);return m;};
 const rim=(kind,x,z,sx,sz)=>{const m=mesh(impact,kind+'-pushed-sand',ring,'#f2d499',x,.058,z,sx,sz,.25);m.rotation.x=-Math.PI/2;(variants[kind]??=[]).push(m);return m;};
 const feet=[.205,-.205].map((z,i)=>({mark:impression('feet',i?'right':'left',0,z,.22,.11),skid:impression('feet','heel-skid',-.28,z,.28,.055),rim:rim('feet',0,z,.25,.14)}));
 impression('seat','depression',0,0,.64,.43);rim('seat',0,0,.68,.46);
 impression('seat','left-cheek',-.16,.13,.3,.24);impression('seat','right-cheek',.16,-.13,.3,.24);
 impression('head','crater',0,0,.33,.31);rim('head',0,0,.40,.36);
 for(let i=0;i<6;i++){const angle=i*Math.PI/3;const m=mesh(impact,'head-sand-clump',sphere,'#e8ca86',Math.cos(angle)*.44,.065,Math.sin(angle)*.36,.11,.055,.08);variants.head.push(m);}
 impression('body','depression',0,0,.73,.32);rim('body',0,0,.76,.36);
 for(const key of ['seat','head','body'])impression(key,'contact-skid',0,0,.12,key==='head'?.18:.25);
 for(const objects of Object.values(variants))for(const object of objects)object.userData.offsetX=object.position.x;
 const spray=new THREE.Group();spray.name='sand-spray';group.add(spray);
 const particles=[];for(let i=0;i<32;i++){const m=mesh(spray,'sand-spray-grain',grain,i%3?'#e8ca86':'#f5dfa9',0,0,0,.04,.04,.04);m.visible=false;particles.push(m);}
 let sliding=false,slideAge=0,slideFrom=0,center=0,contactWorld=null,age=0,kind='body',contactKey='hip';
 function reset(){sliding=false;slideAge=0;contactWorld=null;age=0;delivered.visible=false;delivered.scale.x=1;impact.visible=false;for(const m of particles)m.visible=false;}
 function update(state,points,{elapsed=0,paused=false}={}){
  const origin=state.origin||0,wx=state.x+origin,dt=paused?0:clamp(elapsed,0,.1),landed=state.phase==='land'||state.phase==='done';
  ordinary.position.x=PIT+LENGTH/2-origin;
  ordinary.visible=wx<END+25; // Keep distant cities and space completely unchanged.
  if(state.phase==='run'){if(contactWorld!==null||sliding)reset();return;}
  const eligible=!state.fallen&&(state.jumped||wx>=PIT);
  if(eligible&&state.phase==='air'&&state.vy<0&&wx>END){
   const low=Math.min(...Object.values(points).map(p=>p.y));
   if(low<3.1){
    const target=wx+state.vx*clamp((low-.15)/Math.max(.1,-state.vy),0,.7);
    if(!sliding){sliding=true;slideAge=0;slideFrom=target+9;}
    slideAge+=dt;const t=clamp(slideAge/.48,0,1),ease=1-(1-t)**3;
    center=slideFrom+(target-slideFrom)*ease;delivered.visible=true;
   }
  }
  if(landed&&eligible&&(state.landingWorldX??wx)>=PIT){
   if(contactWorld===null){
    contactWorld=Number.isFinite(state.landingWorldX)?state.landingWorldX:wx;
    const part=state.landingPart||state.firstPart||'';kind=/腳/.test(part)?'feet':part==='屁股'?'seat':/頭/.test(part)?'head':'body';
    impact.userData.kind=kind;impact.visible=true;age=Math.max(0,state.landTime||0);
    for(const [key,objects] of Object.entries(variants))for(const object of objects)object.visible=key===kind;
    contactKey=({'左腳':'foot0','右腳':'foot1','屁股':'hip','額頭':'head','左手':'hand0','右手':'hand1','左膝':'knee0','右膝':'knee1','左肘':'elbow0','右肘':'elbow1','肩膀':'shoulder'})[part]||'hip';
   }else if(state.phase!=='done')age+=dt; // Hold the final tableau through a delayed first capture.
   // Follow the real landing slide, never move the athlete to the first-contact mark.
   const offset=(points[contactKey]?.x??state.x)+origin-contactWorld;
   const skid=(object,x)=>{object.position.x=x/2;object.scale.x=Math.min(5,Math.abs(x)/2+.12);};
   if(kind==='feet')for(let i=0;i<2;i++){
    const x=points['foot'+i].x+origin-contactWorld;feet[i].mark.position.x=x;feet[i].rim.position.x=x;skid(feet[i].skid,x);
   }else for(const object of variants[kind]){
    if(object.name.endsWith('contact-skid'))skid(object,offset);else object.position.x=object.userData.offsetX+offset;
   }
   // Contact + complete pose with a conservative skin/mark envelope. A fixed
   // pool can stretch only to 10 units (the physics bounds landing speed at 28).
   const xs=Object.values(points).map(p=>p.x+origin),low=Math.min(contactWorld-.85,...xs.map(x=>x-.6)),high=Math.max(contactWorld+.85,...xs.map(x=>x+.6));
   if(contactWorld>END||low<PIT||high>END){
    delivered.visible=true;const length=clamp(high-low+.3,LENGTH,10);delivered.scale.x=length/LENGTH;
    center=clamp(contactWorld,high+.15-length/2,low-.15+length/2);
   }
  }
  delivered.position.x=center-origin;
  if(contactWorld!==null){
   impact.position.x=contactWorld-origin;spray.position.x=contactWorld-origin;
   for(let i=0;i<particles.length;i++){
    const m=particles[i],life=1.45+(i%4)*.14;m.visible=age<life;
    if(!m.visible)continue;
    const angle=i*2.39996,speed=(kind==='head'?1.45:kind==='seat'?1.25:.85)*(1+(i%5)*.12),lift=(kind==='head'?2.7:2.05)+(i%7)*.14;
    const spread=(1-Math.exp(-age*2))*.7;
    m.position.set(Math.cos(angle)*speed*spread,Math.max(.055,.09+lift*age-1.6*age*age),Math.sin(angle)*speed*spread);
    m.scale.setScalar((.025+(i%4)*.009)*Math.min(1,(life-age)*3));m.rotation.set(age*(i%3+1),angle,age*2);
   }
  }
 }
 function dispose(){scene.remove(group);for(const geometry of geometries)geometry.dispose();for(const value of materials.values())value.dispose();}
 reset();return{group,update,reset,dispose};
}
