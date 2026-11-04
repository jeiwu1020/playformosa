import {itemArtFrame} from './levels-rules.mjs';
import {sampleLevelMotion} from './levels-motion.mjs';
import {createRig} from './three3d/rig.mjs';
import {createCharacter} from '../javelin/character3d.mjs';

const finite = (n,fallback) => Number.isFinite(n)?n:fallback;

// Presentation is deterministic and independent from input/scoring. Original
// duck and sports character files are reused, never rewritten or approximated.
export function createLevelWorld(THREE,{mode='duel'}={}) {
  if(!['catch','duel'].includes(mode))throw new TypeError('Unknown level');
  const catching=mode==='catch',scene=new THREE.Scene();
  scene.background=new THREE.Color('#142537');
  const palette={trousers:'#827b6e',trousersSeam:'#746e62',trousersBelt:'#292824',trousersBuckle:'#77716a',khaki:'#b8a178',khakiLight:'#c6b18b',khakiDark:'#97825d',iris:'#7b8b82',skin:'#f1bd83',skinShade:'#e7a66e',orange:'#f47625',orangeDark:'#d8521e',navy:'#243d54',navyLight:'#35556b',brown:'#2e2825',brownLight:'#40332c',white:'#fff8e8',ink:'#211e1b',ear:'#d98c68',table:'#365d66',edge:'#1a3547',leg:'#112839',floor:'#192e40',teal:'#63d8bc',gold:'#ffd282',blue:'#437993',red:'#dc725c'};
  const materials=Object.fromEntries(Object.entries(palette).map(([key,color])=>[key,new THREE.MeshStandardMaterial({color,roughness:.7})]));
  materials.teal.emissive.set('#286d5c');materials.teal.emissiveIntensity=.55;
  materials.gold.emissive.set('#735221');materials.gold.emissiveIntensity=.25;
  const geos={sphere:new THREE.SphereGeometry(1,16,12),box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,24)};
  const caps=new Map();
  function mesh(parent,name,geometry,material,x=0,y=0,z=0,sx=1,sy=1,sz=1){const o=new THREE.Mesh(geometry,typeof material==='string'?materials[material]:material);o.name=name;o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o;}
  function sphere(parent,name,material,x=0,y=0,z=0,sx=1,sy=sx,sz=sx){return mesh(parent,name,geos.sphere,material,x,y,z,sx,sy,sz);}
  function box(parent,name,material,x=0,y=0,z=0,sx=1,sy=1,sz=1){return mesh(parent,name,geos.box,material,x,y,z,sx,sy,sz);}
  function capsule(parent,name,material,length,r,x=0,y=0,z=0){const key=`${length}:${r}`;if(!caps.has(key))caps.set(key,new THREE.CapsuleGeometry(r,Math.max(.001,length-2*r),4,10));return mesh(parent,name,caps.get(key),material,x,y,z);}
  function node(parent,name){const object=new THREE.Group();object.name=name;parent.add(object);return object;}
  const kit={mesh,sphere,box,capsule,node,materials,geos};
  const v=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
  const worldPosition=object=>object.getWorldPosition(v());
  scene.add(new THREE.HemisphereLight('#fff5df','#415770',2.6));
  const key=new THREE.DirectionalLight('#fff0d7',3);key.position.set(-2,4,5);scene.add(key);
  const rim=new THREE.DirectionalLight('#a2e5e0',2.1);rim.position.set(3,3,-2);scene.add(rim);
  const fill=new THREE.DirectionalLight('#a8caff',.8);fill.position.set(-3,1,1);scene.add(fill);
  mesh(scene,'arena-floor',geos.cylinder,'floor',0,-.09,0,3,.12,2);
  mesh(scene,'arena-plinth',geos.cylinder,'edge',0,-.005,0,1.52,.07,.85);
  // Broad tabletop, narrow pedestal, and painted lanes make the shared target
  // unambiguous even in a small portrait viewport.
  const table=node(scene,'level-table');
  mesh(table,'table-pedestal',geos.cylinder,'leg',0,.46,.39,.42,.88,.29);
  mesh(table,'table-rim',geos.cylinder,'edge',0,.948,.39,1.28,.09,.52);
  mesh(table,'tabletop',geos.cylinder,'table',0,.995,.39,1.25,.018,.50);
  for(const side of [-1,1])box(table,'table-lane-'+side,side<0?'orange':'teal',side*.67,1.008,.34,.57,.004,.016);
  const targetRing=mesh(table,'shared-target-ring',new THREE.TorusGeometry(.205,.012,7,44),'gold',0,1.012,.38);targetRing.rotation.x=-Math.PI/2;targetRing.visible=!catching;
  const targetPad=mesh(table,'shared-target-pad',geos.cylinder,'edge',0,1.008,.38,.18,.004,.18);targetPad.visible=!catching;
  for(let i=0;i<7;i++)box(scene,'backdrop-light-'+i,i%2?'blue':'teal',-1.5+i*.5,.75,-1.1,.012,.20+(i%3)*.18,.016);

  // createRig solves from world shoulder coordinates. Reset its placement for
  // every pose calculation, then place the whole character after local IK.
  const kingSpace=new THREE.Group(),king=createRig(THREE,kingSpace,kit);
  scene.add(king.root);
  const kingPosition=v(.62,0,0),kingYaw=-.18;
  const kingRotation=new THREE.Quaternion().setFromAxisAngle(v(0,1,0),kingYaw);
  const inverseKing=kingRotation.clone().invert();
  const kingInner=king.hands[1],kingGripOffset=v(-.022,.066,.078);
  const kingHandRotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,catching?-.95:0,catching?0:Math.PI/2));
  const kingRestRotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(.12,-.45,Math.PI-.12));
  const kingOuterRotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(.9,0,-.55));
  function kingPose(target,grip,breath,rotation=kingHandRotation,gun=0){
    rotation=rotation.clone().slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,Math.PI/2)),gun);
    const outerWrist=v(.43,1.12,.19).lerp(v(.43,1.14,.19),gun),outerRotation=kingOuterRotation.clone().slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,-Math.PI/2)),gun);
    king.root.position.set(0,0,0);king.root.quaternion.identity();king.root.updateMatrixWorld(true);
    const wrist=target.clone().sub(kingGripOffset.clone().applyQuaternion(rotation)).sub(kingPosition).applyQuaternion(inverseKing);
    const anatomy=king.update({torso:{lean:0,yaw:0},hand:{wrist:outerWrist.toArray(),quaternion:outerRotation.toArray(),pinch:0,duckGrip:0},restHand:{wrist:wrist.toArray(),quaternion:inverseKing.clone().multiply(rotation).toArray(),gun:0},bill:{rotation:[0,0,0]},regrip:0});
    kingInner.pose(grip*.98,grip,true,gun);
    king.hands[0].pose(0,0,true,gun);
    king.root.position.copy(kingPosition);king.root.quaternion.copy(kingRotation);
    king.head.rotation.x+=breath;
    king.root.updateMatrixWorld(true);
    return anatomy;
  }

  const athlete=catching?null:createCharacter(THREE,scene);
  const athletePosition=v(-.62,0,0),athleteRotation=new THREE.Quaternion().setFromAxisAngle(v(0,1,0),-Math.PI/2),inverseAthlete=athleteRotation.clone().invert();
  const athleteGripOffset=v(0,-.075,.030),athleteHandRotation=new THREE.Quaternion().setFromAxisAngle(v(0,0,1),Math.PI/2);
  
  const athletePalm=athlete?node(athlete.group.getObjectByName('hand-1'),'athlete-grip-contact'):null;
  if(athletePalm)athletePalm.position.copy(athleteGripOffset);
  // reaction-rod's front-facing hero uses a .50 singlet, .76 head and .445
  // legs. The runner's .55 legs folded deeply when forced between y=.95 and
  // y=.12, and its shoes inherited the calf pitch. Adapt only this instance:
  // retain the canonical geometry and all existing arm/hand joint poses.
  const athleteFacing=new THREE.Quaternion().setFromAxisAngle(v(0,1,0),Math.PI/2+.12);
  const athletePelvis=v(0,1.04,0),athleteLegLength=.445;
  const athleteLegs=[];
  if(athlete){
    const part=name=>athlete.group.getObjectByName(name);
    part('singlet').position.set(0,.18,.02);part('singlet').scale.set(.17/.215,.50/.64,.17/.215);
    part('shorts').position.set(0,0,.015);part('shorts').scale.set(.18,.13,.16);
    part('waistband').position.set(0,.08,.03);part('waistband').scale.set(.16,.035,.11);
    part('bib').position.set(0,.29,.195);part('bib').scale.set(.20,.145,.018);
    part('neck').position.set(0,.47,.015);part('neck').scale.set(.055,.0605,.055);
    part('collar').position.set(0,.43,.015);part('collar').scale.setScalar(.08/.102);
    part('head').scale.setScalar(.76);
    for(let i=0;i<2;i++){
      const leg=Object.fromEntries(['thigh','knee','shin','shorts-leg','shorts-hem','sock','sock-band','shoe'].map(name=>[name,part(name+'-'+i)]));
      leg.knee.scale.setScalar(.05);athleteLegs.push(leg);
      // The reference's shoulder caps bridge its narrower singlet to the
      // preserved duel arm anchors, without moving or stretching either arm.
      const shoulder=sphere(part('body'),'athlete-shoulder-'+i,part('thigh-'+i).material,i===0?-.17:.17,.41,.02,.08);
      shoulder.castShadow=true;
    }
  }
  function athleteLegSegment(mesh,a,b,radius,sourceRadius=1,sourceLength=1){
    const direction=b.clone().sub(a);
    mesh.position.copy(a).add(b).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(v(0,1,0),direction.clone().normalize());
    mesh.scale.set(radius/sourceRadius,direction.length()/sourceLength,radius/sourceRadius);
  }
  function athleteStandingLeg(i){
    const side=i===0?-1:1,local=p=>p.applyQuaternion(athleteFacing).add(athletePelvis);
    const hip=local(v(side*.105,-.03,.035)),ankle=local(v(side*.15,.13-athletePelvis.y,.08));
    const knee=solve(hip,ankle,athleteLegLength,athleteLegLength,v(0,0,1).applyQuaternion(athleteFacing)),leg=athleteLegs[i];
    athleteLegSegment(leg.thigh,hip,knee,.06,.097,.55);
    athleteLegSegment(leg.shin,knee,ankle,.045,.078,.55);
    leg.knee.position.copy(knee);
    athleteLegSegment(leg['shorts-leg'],hip,hip.clone().lerp(knee,.32),.072);
    athleteLegSegment(leg['shorts-hem'],hip.clone().lerp(knee,.29),hip.clone().lerp(knee,.33),.074);
    athleteLegSegment(leg.sock,knee.clone().lerp(ankle,.62),ankle,.047);
    athleteLegSegment(leg['sock-band'],knee.clone().lerp(ankle,.62),knee.clone().lerp(ankle,.70),.049);
    leg.shoe.position.copy(ankle);leg.shoe.rotation.set(0,.12,0);
    // The reused runner shoe points along local +X. Keep its sole horizontal,
    // and match the reference's .18 depth and .195 width in the facing frame.
    leg.shoe.scale.set(.5,1,.0975/.102);
    return{hip:hip.toArray(),knee:knee.toArray(),ankle:ankle.toArray()};
  }
  function solve(a,c,l1,l2,pole){
    const delta=c.clone().sub(a),d=delta.length();
    if(d>l1+l2+1e-8||d<Math.abs(l1-l2)+1e-8)throw new RangeError('Level pose exceeds fixed bone reach');
    const direction=delta.normalize(),along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));
    const normal=pole.clone().addScaledVector(direction,-pole.dot(direction)).normalize();
    return a.clone().addScaledVector(direction,along).addScaledVector(normal,height);
  }
  const asPoint=(p,baseZ=0)=>({x:p.x,y:p.y,z:p.z-baseZ});
  function athletePose(target,grip,breath,gun=0){
    if(!athlete)return null;
    const handRotation=athleteHandRotation.clone().slerp(new THREE.Quaternion().setFromAxisAngle(v(0,0,1),Math.PI/2),gun);
    const handTarget=target.clone().sub(athleteGripOffset.clone().applyQuaternion(handRotation)).sub(athletePosition).applyQuaternion(inverseAthlete);
    const headPosition=v(0,.70,-.055).applyQuaternion(athleteFacing).add(athletePelvis);
    const points={hip:asPoint(athletePelvis),shoulder:{x:0,y:1.50,z:0},head:asPoint(headPosition)},anatomy={arms:[],legs:[]};
    for(let i=0;i<2;i++){
      const z=i===0?.205:-.205,shoulder=v(0,1.50,z),wrist=i===1?handTarget:v(.22,1.13,.27).lerp(v(.15,1.16,.27),gun);
      const elbow=solve(shoulder,wrist,.34,.32,v(-.4,-1,i===0?1:-1));
      points['elbow'+i]=asPoint(elbow,z);points['hand'+i]=asPoint(wrist,z);
      // createCharacter also updates its runner legs. Supply finite temporary
      // anchors; the front-facing connected stance below owns their final pose.
      points['knee'+i]={x:0,y:.57,z:0};points['foot'+i]={x:0,y:.13,z:0};
      anatomy.arms.push({shoulder:shoulder.toArray(),elbow:elbow.toArray(),wrist:wrist.toArray()});
    }
    athlete.update(points,{phase:'done',lean:0});
    // The sports mesh was authored for a side-on running camera. Its original
    // body/head are turned toward this camera without touching its geometry.
    athlete.group.getObjectByName('body').quaternion.copy(athleteFacing);
    athlete.group.getObjectByName('head').rotation.set(breath,Math.PI/2+.08,0);
    for(let i=0;i<2;i++){
      // Reference limb radii change silhouette only. The original IK lengths,
      // joint positions, joint rotations and receiving hands remain exact.
      const upper=athlete.group.getObjectByName('upper-arm-'+i),lower=athlete.group.getObjectByName('forearm-'+i);
      upper.scale.x=upper.scale.z=.048/.074;lower.scale.x=lower.scale.z=.038/.065;
      athlete.group.getObjectByName('elbow-'+i).scale.setScalar(.043);
      anatomy.legs.push(athleteStandingLeg(i));
    }
    const hand=athlete.group.getObjectByName('hand-1');hand.quaternion.copy(inverseAthlete).multiply(handRotation);
    for(let i=0;i<4;i++)athlete.group.getObjectByName('finger-1-'+i).rotation.x=-grip*1.35;
    athlete.group.getObjectByName('thumb-1').rotation.x=-grip*.9;
    const outer=athlete.group.getObjectByName('hand-0');outer.quaternion.copy(inverseAthlete).multiply(new THREE.Quaternion().setFromAxisAngle(v(0,0,1),-gun*Math.PI/2));
    for(let side=0;side<2;side++){
      for(let i=0;i<4;i++){const finger=athlete.group.getObjectByName('finger-'+side+'-'+i);const base=side===1?-grip*1.35:0;finger.rotation.x=base*(1-gun)+(i===0?0:-1.55)*gun;finger.position.y=(-.068+Math.abs(i-1.5)*.004)*(1-gun)+(i===0?-.10:-.06)*gun;finger.position.x=(i-1.5)*.027*(1-gun)+(i===0?(side===1?.04:-.04):(i-1.5)*.027)*gun;}
      const thumb=athlete.group.getObjectByName('thumb-'+side);thumb.rotation.x=(side===1?-grip*.9:0)*(1-gun);thumb.rotation.z=-.8*(1-gun)+(side===1?1.45:-1.45)*gun;thumb.position.x=-.065*(1-gun)+(side===1?.065:-.065)*gun;
    }
    athlete.group.position.copy(athletePosition);athlete.group.quaternion.copy(athleteRotation);athlete.group.updateMatrixWorld(true);
    return anatomy;
  }

  const item=node(scene,'duel-prize');
  const itemFallback=mesh(item,'prize-core',new THREE.IcosahedronGeometry(.105,1),'gold');
  const artMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.86,transparent:true,alphaTest:.06,side:THREE.DoubleSide});
  const itemArt=mesh(item,'generated-prize-art',new THREE.PlaneGeometry(.56,.56),artMaterial,0,.045,.018);
  itemArt.visible=false;item.visible=!catching;
  let itemTexture=null,artIndex=-1;
  function setItemTexture(texture){
    if(itemTexture&&itemTexture!==texture)itemTexture.dispose();
    itemTexture=texture;texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.ClampToEdgeWrapping;texture.wrapT=THREE.ClampToEdgeWrapping;
    artMaterial.map=texture;artMaterial.needsUpdate=true;itemArt.visible=true;itemFallback.visible=false;artIndex=-1;
  }
  function selectArt(index){
    index=Math.max(0,Math.min(15,Number.isInteger(index)?index:0));
    if(!itemTexture||index===artIndex)return;
    artIndex=index;const frame=itemArtFrame(index);
    itemTexture.repeat.set(frame.width,frame.height);itemTexture.offset.set(frame.left,1-frame.top-frame.height);itemTexture.needsUpdate=true;
  }

  const dart=node(scene,'foam-dart');dart.visible=catching;
  // One foam-colored surface: a flat tail, straight barrel and a same-width
  // rounded soft nose. Shorten the tail to 65% length; keep the +.035 nose/contact alignment.
  const dartProfile=[new THREE.Vector2(0,-.134),new THREE.Vector2(.033,-.134),new THREE.Vector2(.036,-.131),new THREE.Vector2(.036,-.001)];
  for(let i=1;i<=12;i++){const angle=i/12*Math.PI/2;dartProfile.push(new THREE.Vector2(.036*Math.cos(angle),-.001+.036*Math.sin(angle)));}
  const dartMaterial=new THREE.MeshStandardMaterial({color:'#29a9ff',roughness:.7});
  const dartTip=mesh(dart,'foam-dart-body',new THREE.LatheGeometry(dartProfile,32),dartMaterial);dartTip.rotation.z=-Math.PI/2;
  const dartContact=node(dart,'foam-dart-contact');
  const launcher=node(scene,'foam-launcher');launcher.visible=catching;launcher.position.set(-1.02,1.32,.35);
  const barrel=mesh(launcher,'launcher-barrel',new THREE.CylinderGeometry(.092,.105,.34,20),'blue',-.04,0,0);barrel.rotation.z=-Math.PI/2;
  const muzzle=mesh(launcher,'launcher-soft-rim',new THREE.TorusGeometry(.09,.018,8,24),'teal',.135,0,0);muzzle.rotation.y=Math.PI/2;
  box(launcher,'launcher-base','edge',-.11,-.21,0,.16,.31,.15);
  const catchRing=mesh(scene,'catch-target-ring',new THREE.TorusGeometry(.17,.011,8,40),'teal',.035,1.33,.35);catchRing.rotation.y=-.95;catchRing.visible=false;
  const trail=node(scene,'dart-trail');trail.visible=false;
  const trailMaterial=new THREE.MeshBasicMaterial({color:'#9ae9da',transparent:true,opacity:.55,depthWrite:false});
  for(let i=0;i<3;i++)box(trail,'dart-speed-line-'+i,trailMaterial,-.34-i*.09,(i-1)*.07,-.02,.12-i*.025,.008,.008);

  let lastSample=null;
  function update({state={},now=0}={}){
    now=finite(now,0);const motion=sampleLevelMotion({mode,state,now});
    const {phase,feedback,winner,kingReach,athleteReach,grip,itemAttachedTo,dartAttached}=motion;
    const live=phase==='live',won=winner==='player',kingWon=winner==='ai';
    const breath=['idle','waiting'].includes(phase)?Math.sin(now*.002)*.014:0;
    const rotation=catching?kingRestRotation.clone().slerp(kingHandRotation,kingReach*(won?1:1-motion.kingReturn)):kingHandRotation;
    const kingAnatomy=kingPose(v(...motion.kingPalm),grip,breath,rotation,motion.kingGun);
    const athleteAnatomy=athletePose(v(...(motion.athletePalm||[0,0,0])),motion.athleteGrip,breath,motion.athleteGun);
    const palm=worldPosition(kingInner.gripAnchor),playerPalm=athletePalm?worldPosition(athletePalm):null;
    item.position.fromArray(motion.item);item.rotation.set(0,0,0);
    itemArt.position.y=.045;
    if(!feedback)itemArt.position.y=.045+Math.sin(now*.0025)*.012;
    const currentItem=state.items?.[Math.max(0,Math.min((state.items?.length||1)-1,(state.results?.length||0)-(feedback?1:0)))];selectArt(currentItem?.artIndex);
    const ringWinner=motion.durationMs===1600&&motion.after>=720?motion.celebrationWinner:winner;
    targetRing.material=feedback&&ringWinner==='player'?materials.teal:feedback&&ringWinner==='ai'?materials.orange:materials.gold;
    catchRing.material=won&&feedback?materials.gold:materials.teal;
    if(catching){
      const duration=Math.max(1,finite(state.flightMs,400)),progress=Number.isFinite(state.liveAt)?(now-state.liveAt)/duration:0;
      dart.position.fromArray(motion.dartPosition);
      dart.visible=live||feedback&&Number.isFinite(state.liveAt);
      dart.rotation.z=0;
      trail.visible=live&&progress>.07&&progress<1.1;trail.position.copy(dart.position);
      catchRing.scale.setScalar(live?1+Math.sin(now*.013)*.04:1);
    }
    scene.updateMatrixWorld(true);
    lastSample={...motion,phase,grip,kingReach,athleteReach,itemAttachedTo,dartAttached,anatomy:{king:kingAnatomy,athlete:athleteAnatomy},contacts:{kingPalm:palm.toArray(),kingOuterPalm:worldPosition(king.hands[0].gripAnchor).toArray(),athletePalm:playerPalm?.toArray()||null,kingHead:worldPosition(king.head).toArray(),athleteHead:athlete?worldPosition(athlete.group.getObjectByName('head')).toArray():null,item:item.position.toArray(),dartTip:worldPosition(dartContact).toArray()}};
    return lastSample;
  }
  function diagnostics(){let meshes=0,triangles=0;scene.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});return{mode,meshes,triangles,tableTop:1.004,characterSources:['fast-hands/three3d/rig.mjs',...(!catching?['javelin/character3d.mjs']:[])]};}
  function dispose(){const geometries=new Set(),mats=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));});geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());itemTexture?.dispose();scene.clear();}
  update();
  return {scene,update,dispose,diagnostics,setItemTexture,actors:{king,athlete},objects:{table,item,itemArt,dart,dartTip,catchRing,targetRing},get sample(){return lastSample;}};
}
