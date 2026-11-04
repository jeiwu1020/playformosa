import {itemArtFrame} from './levels-rules.mjs';
import {createRig} from './three3d/rig.mjs';
import {createCharacter} from '../javelin/character3d.mjs';

const clamp = n => Math.max(0,Math.min(1,n));
const ease = n => {n=clamp(n);return n*n*(3-2*n);};
const finite = (n,fallback) => Number.isFinite(n)?n:fallback;

// Presentation is deterministic and independent from input/scoring. Original
// duck and sports character files are reused, never rewritten or approximated.
export function createLevelWorld(THREE,{mode='duel'}={}) {
  if(!['catch','duel'].includes(mode))throw new TypeError('Unknown level');
  const catching=mode==='catch',scene=new THREE.Scene();
  scene.background=new THREE.Color('#142537');
  const palette={khaki:'#b8a178',khakiLight:'#c6b18b',khakiDark:'#97825d',iris:'#7b8b82',skin:'#f1bd83',skinShade:'#e7a66e',orange:'#f47625',orangeDark:'#d8521e',navy:'#243d54',navyLight:'#35556b',brown:'#2e2825',brownLight:'#40332c',white:'#fff8e8',ink:'#211e1b',ear:'#d98c68',table:'#365d66',edge:'#1a3547',leg:'#112839',floor:'#192e40',teal:'#63d8bc',gold:'#ffd282',blue:'#437993',red:'#dc725c'};
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
  const kingRest=v(.49,1.20,.27),kingTarget=v(.015,1.14,.38),catchTarget=v(.05,1.33,.35);
  const kingHandRotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,catching?-.95:0,catching?0:Math.PI/2));
  const kingLocalHandRotation=inverseKing.clone().multiply(kingHandRotation);
  const kingOuterRotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(.9,0,-.55));
  function kingPose(target,grip,breath){
    king.root.position.set(0,0,0);king.root.quaternion.identity();king.root.updateMatrixWorld(true);
    const wrist=target.clone().sub(kingGripOffset.clone().applyQuaternion(kingHandRotation)).sub(kingPosition).applyQuaternion(inverseKing);
    const anatomy=king.update({torso:{lean:0,yaw:0},hand:{wrist:[.43,1.12,.19],quaternion:kingOuterRotation.toArray(),pinch:0,duckGrip:0},restHand:{wrist:wrist.toArray(),quaternion:kingLocalHandRotation.toArray(),gun:0},bill:{rotation:[0,0,0]},regrip:0});
    kingInner.pose(grip*.98,grip,false,0);
    king.root.position.copy(kingPosition);king.root.quaternion.copy(kingRotation);
    king.head.rotation.x+=breath;
    king.root.updateMatrixWorld(true);
    return anatomy;
  }

  const athlete=catching?null:createCharacter(THREE,scene);
  const athletePosition=v(-.62,0,0),athleteRotation=new THREE.Quaternion().setFromAxisAngle(v(0,1,0),-Math.PI/2),inverseAthlete=athleteRotation.clone().invert();
  const athleteGripOffset=v(0,-.075,.030),athleteHandRotation=new THREE.Quaternion().setFromAxisAngle(v(0,0,1),Math.PI/2);
  const athleteRest=v(-.51,1.18,.27),athleteTarget=v(-.015,1.14,.38);
  const athletePalm=athlete?node(athlete.group.getObjectByName('hand-1'),'athlete-grip-contact'):null;
  if(athletePalm)athletePalm.position.copy(athleteGripOffset);
  function solve(a,c,l1,l2,pole){
    const delta=c.clone().sub(a),d=delta.length();
    if(d>l1+l2+1e-8||d<Math.abs(l1-l2)+1e-8)throw new RangeError('Level pose exceeds fixed bone reach');
    const direction=delta.normalize(),along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));
    const normal=pole.clone().addScaledVector(direction,-pole.dot(direction)).normalize();
    return a.clone().addScaledVector(direction,along).addScaledVector(normal,height);
  }
  const asPoint=(p,baseZ=0)=>({x:p.x,y:p.y,z:p.z-baseZ});
  function athletePose(target,grip,breath){
    if(!athlete)return null;
    const handTarget=target.clone().sub(athleteGripOffset.clone().applyQuaternion(athleteHandRotation)).sub(athletePosition).applyQuaternion(inverseAthlete);
    const points={hip:{x:0,y:.95,z:0},shoulder:{x:0,y:1.50,z:0},head:{x:0,y:1.89,z:0}},anatomy={arms:[],legs:[]};
    for(let i=0;i<2;i++){
      const z=i===0?.205:-.205,shoulder=v(0,1.50,z),wrist=i===1?handTarget:v(.22,1.13,.27);
      const elbow=solve(shoulder,wrist,.34,.32,v(-.4,-1,i===0?1:-1));
      points['elbow'+i]=asPoint(elbow,z);points['hand'+i]=asPoint(wrist,z);
      const hip=v(0,.95,z),ankle=v(.01,.12,z+(i===0?.045:-.045)),knee=solve(hip,ankle,.55,.55,v(.8,0,0));
      points['knee'+i]=asPoint(knee,z);points['foot'+i]=asPoint(ankle,z);
      anatomy.arms.push({shoulder:shoulder.toArray(),elbow:elbow.toArray(),wrist:wrist.toArray()});
      anatomy.legs.push({hip:hip.toArray(),knee:knee.toArray(),ankle:ankle.toArray()});
    }
    athlete.update(points,{phase:'done',lean:0});
    // The sports mesh was authored for a side-on running camera. Its original
    // body/head are turned toward this camera without touching its geometry.
    athlete.group.getObjectByName('body').rotation.set(0,Math.PI/2+.12,0);
    athlete.group.getObjectByName('head').rotation.set(breath,Math.PI/2+.08,0);
    const hand=athlete.group.getObjectByName('hand-1');hand.quaternion.copy(inverseAthlete).multiply(athleteHandRotation);
    for(let i=0;i<4;i++)athlete.group.getObjectByName('finger-1-'+i).rotation.x=-grip*1.35;
    athlete.group.getObjectByName('thumb-1').rotation.x=-grip*.9;
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
  // rounded soft nose. Keep the original -.225…+.035 silhouette/contact range.
  const dartProfile=[new THREE.Vector2(0,-.225),new THREE.Vector2(.033,-.225),new THREE.Vector2(.036,-.222),new THREE.Vector2(.036,-.001)];
  for(let i=1;i<=12;i++){const angle=i/12*Math.PI/2;dartProfile.push(new THREE.Vector2(.036*Math.cos(angle),-.001+.036*Math.sin(angle)));}
  const dartTip=mesh(dart,'foam-dart-body',new THREE.LatheGeometry(dartProfile,32),'orange');dartTip.rotation.z=-Math.PI/2;
  const dartContact=node(dart,'foam-dart-contact');
  const launcher=node(scene,'foam-launcher');launcher.visible=catching;launcher.position.set(-1.02,1.32,.35);
  const barrel=mesh(launcher,'launcher-barrel',new THREE.CylinderGeometry(.092,.105,.34,20),'blue',-.04,0,0);barrel.rotation.z=-Math.PI/2;
  const muzzle=mesh(launcher,'launcher-soft-rim',new THREE.TorusGeometry(.09,.018,8,24),'teal',.135,0,0);muzzle.rotation.y=Math.PI/2;
  box(launcher,'launcher-base','edge',-.11,-.21,0,.16,.31,.15);
  const catchRing=mesh(scene,'catch-target-ring',new THREE.TorusGeometry(.17,.011,8,40),'teal',.035,1.33,.35);catchRing.rotation.y=-.95;catchRing.visible=catching;
  const trail=node(scene,'dart-trail');trail.visible=false;
  const trailMaterial=new THREE.MeshBasicMaterial({color:'#9ae9da',transparent:true,opacity:.55,depthWrite:false});
  for(let i=0;i<3;i++)box(trail,'dart-speed-line-'+i,trailMaterial,-.34-i*.09,(i-1)*.07,-.02,.12-i*.025,.008,.008);

  function settleTime(state,result,now){
    if(result?.reason==='early'&&!Number.isFinite(state.liveAt))return finite(state.startedAt,now);
    if(catching)return finite(state.targetAt,now)+finite(result?.offsetMs,100);
    return finite(state.liveAt,now)+finite(result?.playerMs,finite(state.aiMs,180));
  }
  let lastSample=null;
  function update({state={},now=0}={}){
    now=finite(now,0);const phase=state.phase||'idle',feedback=phase==='feedback'||phase==='done',result=feedback?state.results?.at(-1):null;
    const live=phase==='live',elapsed=now-finite(state.liveAt,now),after=feedback?Math.max(0,now-settleTime(state,result,now)):0;
    const winner=result?.winner,won=winner==='player',kingWon=winner==='ai';
    const breath=['idle','waiting'].includes(phase)?Math.sin(now*.002)*.014:0;
    let grip=0,kingReach=0,athleteReach=0,itemAttachedTo=null,dartAttached=false;
    if(catching){
      grip=feedback?ease(after/115):0;
      kingReach=1;
    }else{
      kingReach=live?ease((elapsed/Math.max(1,finite(state.aiMs,180))-.08)/.92):feedback?(kingWon?1:1-ease(after/180)*.45):0;
      athleteReach=feedback?ease(after/145)*(won?1:.68):0;
      grip=feedback&&kingWon?ease(after/110):0;
      if(feedback&&won&&after>=145)itemAttachedTo='athlete';
      if(feedback&&kingWon)itemAttachedTo='king';
    }
    const kingAim=catching?catchTarget.clone():kingRest.clone().lerp(kingTarget,kingReach);
    if(catching&&won)kingAim.x+=ease(after/150)*.035;
    const kingAnatomy=kingPose(kingAim,grip,breath);
    const athleteAnatomy=athletePose(athleteRest.clone().lerp(athleteTarget,athleteReach),feedback?ease(after/120):0,breath);
    const palm=worldPosition(kingInner.gripAnchor),playerPalm=athletePalm?worldPosition(athletePalm):null;
    item.position.set(0,1.14,.38);item.rotation.set(0,0,0);
    if(itemAttachedTo==='king')item.position.copy(palm);
    if(itemAttachedTo==='athlete')item.position.copy(playerPalm);
    if(!feedback)itemArt.position.y=.045+Math.sin(now*.0025)*.012;
    const currentItem=state.items?.[Math.max(0,Math.min((state.items?.length||1)-1,(state.results?.length||0)-(feedback?1:0)))];selectArt(currentItem?.artIndex);
    targetRing.material=won&&feedback?materials.teal:kingWon&&feedback?materials.orange:materials.gold;
    catchRing.material=won&&feedback?materials.gold:materials.teal;
    if(catching){
      const launch=v(-.85,1.33,.35),duration=Math.max(1,finite(state.flightMs,400));
      let progress=live||feedback&&Number.isFinite(state.liveAt)?(now-state.liveAt)/duration:0;
      dartAttached=feedback&&won;
      if(dartAttached)dart.position.copy(palm);
      else {progress=Math.max(0,Math.min(2.5,progress));dart.position.copy(launch).lerp(catchTarget,progress);dart.position.y+=Math.sin(Math.min(1,progress)*Math.PI)*.055;if(progress>1)dart.position.y-=(progress-1)*.24;}
      dart.visible=live||feedback&&Number.isFinite(state.liveAt);
      dart.rotation.z=dartAttached?0:progress>1?-(progress-1)*.25:0;
      trail.visible=live&&progress>.07&&progress<1.1;trail.position.copy(dart.position);
      catchRing.scale.setScalar(live?1+Math.sin(now*.013)*.04:1);
    }
    scene.updateMatrixWorld(true);
    lastSample={phase,grip,kingReach,athleteReach,itemAttachedTo,dartAttached,anatomy:{king:kingAnatomy,athlete:athleteAnatomy},contacts:{kingPalm:palm.toArray(),athletePalm:playerPalm?.toArray()||null,kingHead:worldPosition(king.head).toArray(),athleteHead:athlete?worldPosition(athlete.group.getObjectByName('head')).toArray():null,item:item.position.toArray(),dartTip:worldPosition(dartContact).toArray()}};
    return lastSample;
  }
  function diagnostics(){let meshes=0,triangles=0;scene.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});return{mode,meshes,triangles,tableTop:1.004,characterSources:['fast-hands/three3d/rig.mjs',...(!catching?['javelin/character3d.mjs']:[])]};}
  function dispose(){const geometries=new Set(),mats=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));});geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());itemTexture?.dispose();scene.clear();}
  update();
  return {scene,update,dispose,diagnostics,setItemTexture,actors:{king,athlete},objects:{table,item,itemArt,dart,dartTip,catchRing,targetRing},get sample(){return lastSample;}};
}
