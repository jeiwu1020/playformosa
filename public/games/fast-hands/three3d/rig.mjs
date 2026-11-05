// Canonical procedural sport hero adapted from Four Limbs Have Ideas' javelin
// character3d.mjs. The head, hair clumps, material family and proportions remain
// 3D geometry. Photo reference is not bundled or requested at runtime.
export function createRig(THREE, scene, kit) {
  const {mesh, sphere, capsule, box, node, materials:m, geos:g} = kit;
  const root=node(scene,'hero-runner');
  const body=node(root,'hero-body'); body.position.set(0,.90,-.15);
  capsule(body,'hero-shirt','khaki',.64,.215,0,.32,0);
  // Reference-inspired gray-brown casual trousers. The original pelvis volume
  // stays the same; only the garment changes, with a narrow black belt.
  sphere(body,'hero-trousers-seat','trousers',0,-.025,0,.235,.17,.225);
  mesh(body,'hero-waistband',g.cylinder,'trousers',0,.025,0,.229,.055,.218);
  mesh(body,'hero-trousers-belt',g.cylinder,'trousersBelt',0,.025,0,.235,.037,.225);
  box(body,'hero-trousers-buckle','trousersBuckle',0,.025,.228,.044,.028,.009);
  box(body,'hero-trousers-buckle-center','trousersBelt',0,.025,.234,.029,.016,.003);
  for(const side of[-1,1]){
    box(body,'hero-trousers-belt-loop-'+side,'trousers',side*.13,.026,.189,.017,.056,.019);
    const pocket=box(body,'hero-trousers-pocket-'+side,'trousersSeam',side*.168,-.043,.139,.003,.071,.003);pocket.rotation.z=side*-.33;
  }
  box(body,'hero-trousers-fly','trousersSeam',.014,-.061,.218,.003,.081,.003);
  box(body,'hero-shirt-placket','khakiLight',0,.32,.216,.025,.53,.012);
  box(body,'hero-shirt-seam','khakiDark',.015,.32,.223,.002,.52,.003);
  for(let i=0;i<4;i++)sphere(body,'hero-shirt-button-'+i,'khakiDark',0,.13+i*.12,.229,.010,.010,.004);
  sphere(body,'hero-neck','skin',0,.704,0,.099,.102,.095);
  for(const [side,name]of[[-1,'left'],[1,'right']]){
    const shape=new THREE.Shape();shape.moveTo(side*.012,.675);shape.lineTo(side*.115,.700);shape.lineTo(side*.145,.635);shape.lineTo(side*.055,.575);shape.closePath();
    const collar=mesh(body,'hero-collar-'+name,new THREE.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:false}),'khakiLight',0,0,.105);collar.rotation.x=-.08;
  }
  const head=node(body,'hero-head');head.position.set(0,.95,-.006);head.scale.setScalar(.91);
  sphere(head,'hero-face','skin',0,0,0,.272,.31,.265);
  for(const [side,x]of [['left',-.278],['right',.278]]){
    sphere(head,'hero-ear-'+side,'skin',x,-.012,0,.054,.075,.046);
    sphere(head,'hero-ear-inner-'+side,'ear',x,-.013,.035,.028,.048,.013);
  }
  const hair=node(head,'hero-hair');
  mesh(hair,'hero-hair-cap',new THREE.SphereGeometry(.305,18,10,0,Math.PI*2,0,1.06),'brown',0,.025,-.035);
  sphere(hair,'hero-hair-back','brown',0,.065,-.195,.257,.235,.12);
  for(let i=0;i<7;i++){
    const x=-.220+i*.073,r=Math.sqrt(.305*.305-x*x),points=[];
    for(let k=0;k<7;k++){const angle=.60-k/6*1.30;points.push(new THREE.Vector3(x,.025+r*Math.cos(angle),-.035+r*Math.sin(angle)));}
    mesh(hair,'hero-swept-lock-'+i,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,.007,5,false),'brownLight');
  }
  for(const side of[-1,1]){const lock=sphere(hair,'hero-side-lock-'+side,'brown',side*.251,.09,-.075,.045,.125,.095);lock.rotation.z=side*.12;}
  // Restore the original V2 colored eyes unchanged. Only their gaze transforms
  // move: iris, pupil and glint remain together and look parallel to world +Z.
  const eyePairs=[];
  const eyeCompensation=new THREE.Quaternion();
  for(const [side,x]of [['left',-.091],['right',.091]]){
    const white=sphere(head,'hero-eye-white-'+side,'white',x,.045,.238,.071,.038,.037);
    const iris=sphere(head,'hero-iris-'+side,'iris',x,.045,.271,.030,.025,.014);
    const pupil=sphere(head,'hero-pupil-'+side,'ink',x,.045,.282,.014,.019,.007);
    const glint=sphere(head,'hero-eye-glint-'+side,'white',x-.007,.055,.283,.008,.009,.004);
    eyePairs.push({white,layers:[
      {mesh:iris,offset:new THREE.Vector3(0,0,.033)},
      {mesh:pupil,offset:new THREE.Vector3(0,0,.044)},
      {mesh:glint,offset:new THREE.Vector3(-.007,.010,.045)},
    ]});
    const brow=capsule(head,'hero-brow-'+side,'brown',.15,.014,x,.130,.247);brow.rotation.z=side==='left'?-1.49:1.47;
  }
  sphere(head,'hero-nose','skinShade',.006,-.029,.281,.039,.052,.050);
  // Limited likeness cues: darker short hair, narrower eyes, mustache and chin tuft.
  for(const sign of[-1,1]){
    const stache=sphere(head,'hero-moustache-'+sign,'brown',sign*.044,-.091,.255,.057,.014,.014);stache.rotation.z=-sign*.18;
  }
  sphere(head,'hero-mouth','ink',0,-.143,.242,.065,.007,.012);
  sphere(head,'hero-lip','skinShade',0,-.153,.244,.054,.004,.006);
  sphere(head,'hero-chin-tuft','brown',0,-.209,.207,.033,.016,.012);
  const shoulders=[node(body,'hero-shoulder-right'),node(body,'hero-shoulder-left')];
  shoulders.forEach((s,i)=>{s.position.set(i===0?.225:-.225,.55,.015);sphere(s,'hero-shoulder-cap-'+i,'khaki',0,0,0,.093,.091,.089);});
  const hands=[createHand(THREE,root,kit,1),createHand(THREE,root,kit,-1)];
  const arms=hands.map((hand,i)=>({
    upper:capsule(root,'hero-upper-arm-'+i,'khaki',.35,.078),
    lower:capsule(root,'hero-forearm-'+i,'khaki',.34,.067),
    elbow:sphere(root,'hero-elbow-'+i,'khaki',0,0,0,.077),cuff:capsule(root,'hero-shirt-cuff-'+i,'khakiDark',.055,.056),hand,shoulder:shoulders[i],
  }));
  // One continuous cloth surface per leg, rather than recolored skin capsules.
  // Ring centers follow the same fixed hip/knee/ankle solution as the original
  // rig, including the knee bend; the taper ends on the untouched shoe upper.
  const trouserProfile=[[-.055,.104,.207],[.12,.117,.195],[.4,.115,.162],[.72,.105,.117],[1,.099,.098],[1.55,.091,.091],[1.8,.085,.086],[1.98,.081,.082]];
  const trouserAngles=Array.from({length:17},(_,i)=>i*Math.PI/8);
  function trouserSurface(name,profile,material,angles=trouserAngles){
    const geometry=new THREE.BufferGeometry(),indices=[],columns=angles.length;
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(profile.length*columns*3),3));
    for(let row=0;row<profile.length-1;row++)for(let column=0;column<columns-1;column++){
      const a=row*columns+column;indices.push(a,a+1,a+columns+1,a,a+columns+1,a+columns);
    }
    geometry.setIndex(indices);
    return {mesh:mesh(root,name,geometry,material),profile,angles};
  }
  function fitTrousers(surface,hip,knee,ankle){
    const positions=surface.mesh.geometry.attributes.position,center=new THREE.Vector3();let index=0;
    for(const [t,rx,rz] of surface.profile){
      if(t<=1)center.copy(hip).lerp(knee,t);else center.copy(knee).lerp(ankle,t-1);
      for(const angle of surface.angles)positions.setXYZ(index++,center.x+Math.cos(angle)*rx,center.y,center.z+Math.sin(angle)*rz);
    }
    positions.needsUpdate=true;surface.mesh.geometry.computeVertexNormals();surface.mesh.geometry.computeBoundingSphere();
  }
  const legs=[1,-1].map((side,i)=>{
    const leg={upper:capsule(root,'hero-thigh-'+i,'skin',.39,.086),lower:capsule(root,'hero-shin-'+i,'skin',.40,.067),knee:sphere(root,'hero-knee-'+i,'skinShade',0,0,0,.078)};
    leg.shorts=mesh(root,'hero-shorts-leg-'+i,g.cylinder,'navy',0,0,0,.111,.17,.111);
    leg.hem=mesh(root,'hero-shorts-hem-'+i,g.cylinder,'navyLight',0,0,0,.112,.021,.112);
    leg.sock=mesh(root,'hero-sock-'+i,g.cylinder,'white',0,0,0,.072,.17,.072);
    leg.band=mesh(root,'hero-sock-band-'+i,g.cylinder,'orange',0,0,0,.074,.024,.074);
    // Keep the anatomical meshes and their transforms for the existing rig,
    // but never render bare knees/shins, short hems or sports socks through cloth.
    for(const original of [leg.upper,leg.lower,leg.knee,leg.shorts,leg.hem,leg.sock,leg.band])original.visible=false;
    const seamAngle=side===1?0:Math.PI;
    leg.trouserSurfaces=[
      trouserSurface('hero-trousers-leg-'+i,trouserProfile,'trousers'),
      trouserSurface('hero-trousers-side-seam-'+i,trouserProfile.map(([t,rx,rz])=>[t,rx+.001,rz+.001]),'trousersSeam',[seamAngle-.012,seamAngle+.012]),
      trouserSurface('hero-trousers-cuff-'+i,[[1.94,.083,.084],[1.985,.082,.083]],'trousers'),
      trouserSurface('hero-trousers-cuff-stitch-'+i,[[1.935,.0834,.0844],[1.945,.0832,.0842]],'trousersSeam'),
    ];
    leg.foot=node(root,'hero-shoe-'+i);sphere(leg.foot,'hero-shoe-upper-'+i,'navy',0,-.026,.065,.095,.065,.149);
    sphere(leg.foot,'hero-shoe-sole-'+i,'white',0,-.079,.066,.097,.016,.151);
    box(leg.foot,'hero-shoe-stripe-'+i,'orange',0,-.012,.190,.106,.025,.012);
    for(let k=0;k<2;k++)box(leg.foot,'hero-shoe-lace-'+i+'-'+k,'white',0,.028,.07+k*.039,.062,.01,.018);
    leg.hip=new THREE.Vector3(side*.13,.89,-.15);leg.ankle=new THREE.Vector3(side*.16,.115,-.15);
    return leg;
  });
  const up=new THREE.Vector3(0,1,0);
  function bone(mesh,a,b){mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(up,new THREE.Vector3().subVectors(b,a).normalize());mesh.scale.set(1,1,1);}
  function solve(a,c,l1,l2,pole){
    const delta=new THREE.Vector3().subVectors(c,a),d=delta.length();
    if(d>l1+l2+1e-9||d<Math.abs(l1-l2)-1e-9)throw new Error('Choreography exceeds fixed bone reach');
    const dir=delta.normalize(),along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));
    const p=pole.clone().addScaledVector(dir,-pole.dot(dir)).normalize();
    return a.clone().addScaledVector(dir,along).addScaledVector(p,height);
  }
  function placeBand(mesh,a,b,f){mesh.position.copy(a).lerp(b,f);mesh.quaternion.setFromUnitVectors(up,new THREE.Vector3().subVectors(b,a).normalize());}
  function update(sample){
    body.rotation.set(sample.torso.lean,sample.torso.yaw,0);
    head.rotation.set(.025,-.04+.1*sample.hand.duckGrip,0);
    body.updateMatrixWorld(true);
    // Preserve V2 head/body choreography; only the optical axes counter-rotate.
    eyeCompensation.copy(head.getWorldQuaternion(eyeCompensation)).invert();
    for(const {white,layers} of eyePairs){
      for(const {mesh,offset} of layers){
        mesh.position.copy(offset).applyQuaternion(eyeCompensation).add(white.position);
        mesh.quaternion.copy(eyeCompensation);
      }
    }
    const active=hands[0],rest=hands[1];
    active.group.position.fromArray(sample.hand.wrist);active.group.quaternion.fromArray(sample.hand.quaternion);
    const paperNormal=new THREE.Vector3(0,0,1).applyEuler(new THREE.Euler(...sample.bill.rotation)).applyQuaternion(active.group.quaternion.clone().invert());
    active.pose(sample.hand.pinch,sample.hand.duckGrip,false,sample.regrip,paperNormal);
    rest.group.position.fromArray(sample.restHand.wrist);rest.group.quaternion.fromArray(sample.restHand.quaternion);rest.pose(0,0,true,sample.restHand.gun);
    const anatomy={arms:[],legs:[]};
    arms.forEach((arm,i)=>{
      const shoulder=arm.shoulder.getWorldPosition(new THREE.Vector3()),wrist=arm.hand.group.position.clone();
      const elbow=solve(shoulder,wrist,.35,.34,new THREE.Vector3(i===0?1:-1,-.15,-.20));
      bone(arm.upper,shoulder,elbow);bone(arm.lower,elbow,wrist);arm.elbow.position.copy(elbow);placeBand(arm.cuff,elbow,wrist,.92);
      anatomy.arms.push({shoulder:shoulder.toArray(),elbow:elbow.toArray(),wrist:wrist.toArray(),upperScale:arm.upper.scale.toArray(),lowerScale:arm.lower.scale.toArray()});
    });
    for(const leg of legs){
      const knee=solve(leg.hip,leg.ankle,.39,.40,new THREE.Vector3(0,0,1));
      bone(leg.upper,leg.hip,knee);bone(leg.lower,knee,leg.ankle);leg.knee.position.copy(knee);
      placeBand(leg.shorts,leg.hip,knee,.16);placeBand(leg.hem,leg.hip,knee,.35);placeBand(leg.sock,knee,leg.ankle,.78);placeBand(leg.band,knee,leg.ankle,.59);
      for(const surface of leg.trouserSurfaces)fitTrousers(surface,leg.hip,knee,leg.ankle);
      leg.foot.position.copy(leg.ankle);
      anatomy.legs.push({hip:leg.hip.toArray(),knee:knee.toArray(),ankle:leg.ankle.toArray()});
    }
    root.updateMatrixWorld(true);
    return anatomy;
  }
  return {root,body,head,hands,arms,legs,update};
}

function createHand(THREE,parent,kit,side){
  const {sphere,capsule,node}=kit;
  const group=node(parent,side===1?'hero-right-hand':'hero-left-hand');
  sphere(group,'palm-'+side,'skin',0,.049,0,.052,.064,.026);
  sphere(group,'thumb-pad-'+side,'skin',-side*.039,.040,.006,.026,.039,.025);
  const cuff=capsule(group,'wrist-'+side,'skin',.055,.032,0,.005,0);
  const pinchAnchor=node(group,'pinch-anchor-'+side);pinchAnchor.position.set(-side*.035,.122,.043);
  const tableAnchor=node(group,'palm-table-anchor-'+side);tableAnchor.position.set(side*.052,.049,0);
  const gripAnchor=node(group,'palm-grip-anchor-'+side);gripAnchor.position.set(side*.022,.066,.078);
  const fingers=[];
  const up=new THREE.Vector3(0,1,0);
  function digit(name,rootPos,l1,l2,r){
    const root=node(group,name+'-root');root.position.fromArray(rootPos);
    const a=capsule(group,name+'-proximal','skin',l1+2*r,r),b=capsule(group,name+'-distal','skin',l2+2*r,r);
    const joint=sphere(group,name+'-joint','skinShade',0,0,0,r*1.03);
    const tip=node(group,name+'-tip');
    function set(target,pole){
      const start=root.position,delta=target.clone().sub(start),len=delta.length();
      const d=Math.min(l1+l2-.00001,Math.max(Math.abs(l1-l2)+.00001,len));
      const dir=delta.normalize(),end=start.clone().addScaledVector(dir,d);
      const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));
      let normal=pole.clone().addScaledVector(dir,-pole.dot(dir));if(normal.lengthSq()<1e-10)normal.set(1,0,0);normal.normalize();
      const mid=start.clone().addScaledVector(dir,along).addScaledVector(normal,height);
      for(const [obj,p,q]of[[a,start,mid],[b,mid,end]]){obj.position.copy(p).add(q).multiplyScalar(.5);obj.quaternion.setFromUnitVectors(up,q.clone().sub(p).normalize());}
      joint.position.copy(mid);tip.position.copy(end);
    }
    return {root,tip,joint,segments:[a,b],set};
  }
  // Index knuckle sits on the palm's front surface. Its two lengths still total
  // .073, but let the distal pad approach the note above the corner, not through it.
  const roots=[[-.035,.100],[-.011,.108],[.013,.106],[.035,.097]];
  const lengths=[[.050,.023],[.052,.045],[.050,.044],[.047,.040]];
  roots.forEach(([x,y],i)=>fingers.push(digit('finger-'+side+'-'+i,[side*x,y,i===0?.022:0],...lengths[i],.009)));
  const thumb=digit('thumb-'+side,[-side*.058,.045,.006],.046,.043,.012);
  const v=(x,y,z)=>new THREE.Vector3(x,y,z);
  const ease=n=>{n=Math.max(0,Math.min(1,n));return n*n*(3-2*n)};
  const originalPinch=v(-side*.035,.122,.043),carry=v(side*.005,.145,.050);
  function pose(pinch,grip,rest=false,gun=0,paperNormal=v(0,0,1)){
    const shift=ease((gun-.5)/.5),release=ease((gun-.5)/.5),middleContact=ease((gun-.12)/.38);
    pinchAnchor.position.copy(originalPinch).lerp(carry,rest?0:shift);
    gripAnchor.position.set(side*.022,.066,.078).lerp(v(-side*.015,.080,.075),rest?0:gun);
    fingers.forEach((finger,i)=>{
      const[x,y]=roots[i],open=v(side*(x+(i-1.5)*.006),y+(lengths[i][0]+lengths[i][1])*.96,i===0?.022:rest?.011:.004);
      const touch=[[-.035,.142,.058],[-.010,.113,.085],[.014,.122,.087],[.048,.117,.081]][i];
      let target=open.lerp(v(side*touch[0],touch[1],touch[2]),i===0?grip*.18:grip);
      if(i===0){target.lerp(pinchAnchor.position.clone().addScaledVector(paperNormal,.009),pinch);target.lerp(v(-side*.035,.171,.022),rest?gun:release);}
      else if(!rest&&i===1){target.lerp(pinchAnchor.position.clone().addScaledVector(paperNormal,.009),middleContact);}
      else {const closed=rest?v(side*x*.8,.079,.041):i===2?v(side*.010,.120,.047):v(side*.026,.105,.050);target.lerp(closed,gun);}
      if(!rest&&i>1&&grip>0){
        const delta=target.clone().sub(gripAnchor.position),duckLocal=delta.clone().applyQuaternion(group.quaternion).applyAxisAngle(v(0,1,0),.10);
        const shell=Math.sqrt((duckLocal.x/.05)**2+(duckLocal.y/.05)**2+(duckLocal.z/.055)**2);
        if(shell>1e-6)target.lerp(gripAnchor.position.clone().addScaledVector(delta,1.15/shell),grip);
      }
      const bendNormal=v(rest||i<2?-1:1,0,0).cross(target.clone().sub(finger.root.position));
      finger.set(target,bendNormal);
    });
    const open=v(-side*.089,.100,rest?.008:.018),gripped=v(-side*.039,.078,.078);
    const target=open.lerp(gripped,grip).lerp(pinchAnchor.position.clone().addScaledVector(paperNormal,-.012),pinch).lerp(v(-side*.146,.050,.006),rest?gun:release);
    thumb.set(target,v(0,0,side).cross(target.clone().sub(thumb.root.position)));
  }
  pose(1,0);
  return {group,fingers,thumb,pinchAnchor,gripAnchor,tableAnchor,pose};
}
