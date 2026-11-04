import {sampleTimeline,DURATION} from './timeline.mjs';
import {createRig} from './rig.mjs';

export function createDemoWorld(THREE) {
  const scene=new THREE.Scene();scene.background=new THREE.Color('#eee9d9');
  const colors={trousers:'#827b6e',trousersSeam:'#746e62',trousersBelt:'#292824',trousersBuckle:'#77716a',khaki:'#b8a178',khakiLight:'#c6b18b',khakiDark:'#97825d',iris:'#7b8b82',skin:'#f1bd83',skinShade:'#e7a66e',orange:'#f47625',orangeDark:'#d8521e',navy:'#243d54',navyLight:'#35556b',brown:'#2e2825',brownLight:'#40332c',white:'#fff8e8',ink:'#211e1b',ear:'#d98c68',table:'#6a8c78',edge:'#466b59',leg:'#385747',floor:'#e9e4d2',bill:'#e3ecd0',billDark:'#6d9270',billLight:'#f3f4dc',yellow:'#ffd447',yellowLight:'#ffe784',beak:'#ed8e31'};
  const materials=Object.fromEntries(Object.entries(colors).map(([k,color])=>[k,new THREE.MeshStandardMaterial({color,roughness:.78})]));
  materials.yellow.roughness=.46;materials.yellowLight.roughness=.46;
  const geos={sphere:new THREE.SphereGeometry(1,16,12),box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,12),hair:new THREE.SphereGeometry(.305,18,10,0,Math.PI*2,0,1.25),collar:new THREE.TorusGeometry(.102,.019,6,16)};
  const cache=new Map();
  function mesh(parent,name,geo,material,x=0,y=0,z=0,sx=1,sy=1,sz=1){const o=new THREE.Mesh(geo,materials[material]);o.name=name;o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function sphere(p,n,m,x=0,y=0,z=0,sx=1,sy=sx,sz=sx){return mesh(p,n,geos.sphere,m,x,y,z,sx,sy,sz);}
  function box(p,n,m,x=0,y=0,z=0,sx=1,sy=1,sz=1){return mesh(p,n,geos.box,m,x,y,z,sx,sy,sz);}
  function capsule(p,n,m,len,r,x=0,y=0,z=0){const key=len+':'+r;if(!cache.has(key))cache.set(key,new THREE.CapsuleGeometry(r,Math.max(.001,len-2*r),4,10));return mesh(p,n,cache.get(key),m,x,y,z);}
  function node(p,n){const o=new THREE.Group();o.name=n;p.add(o);return o;}
  const kit={mesh,sphere,box,capsule,node,materials,geos};
  scene.add(new THREE.HemisphereLight('#fff9ed','#b8bd9c',2.5));
  const sun=new THREE.DirectionalLight('#fff3d8',3.3);sun.position.set(-2.5,4.5,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-2;sun.shadow.camera.right=2;sun.shadow.camera.top=3;sun.shadow.camera.bottom=-1;sun.shadow.normalBias=.025;scene.add(sun);
  const fill=new THREE.DirectionalLight('#dce9ff',1.2);fill.position.set(3,2,2);scene.add(fill);
  const floor=box(scene,'demo-ground','floor',0,-.015,.15,200,.03,200);floor.castShadow=false;
  const table=node(scene,'demo-table');
  box(table,'table-top','table',0,.815,.48,1.7,.07,.74);
  box(table,'table-front-edge','edge',0,.786,.845,1.71,.058,.025);
  box(table,'table-back-edge','edge',0,.786,.115,1.71,.058,.025);
  for(const x of[-.73,.73])for(const z of[.20,.76])box(table,'table-leg-'+x+'-'+z,'leg',x,.40,z,.066,.78,.066);
  // A subtle painted circular place marker, not an extra prop or duplicate duck.
  const pad=mesh(table,'duck-place-marker',new THREE.CylinderGeometry(.095,.095,.002,36),'edge',.48,.851,.25);
  pad.castShadow=false;
  const actor=createRig(THREE,scene,kit);
  const bill=node(scene,'demo-banknote');
  // The origin is its top-right pinching point. It hangs clear of the palm/duck.
  box(bill,'banknote-paper','bill',-.073,-.102,0,.174,.204,.0025);
  for(const side of[-1,1]){
    const z=side*.0017;
    box(bill,'bill-border-top-'+side,'billDark',-.073,-.012,z,.154,.004,.0005);
    box(bill,'bill-border-bottom-'+side,'billDark',-.073,-.193,z,.154,.004,.0005);
    box(bill,'bill-border-left-'+side,'billDark',-.149,-.102,z,.004,.184,.0005);
    box(bill,'bill-border-right-'+side,'billDark',.003,-.102,z,.004,.184,.0005);
    sphere(bill,'bill-oval-'+side,'billDark',-.073,-.097,side*.0024,.040,.057,.0009);
    sphere(bill,'bill-portrait-'+side,'billLight',-.073,-.087,side*.0033,.021,.027,.0006);
    sphere(bill,'bill-portrait-shoulders-'+side,'billLight',-.073,-.124,side*.0033,.030,.019,.0006);
    for(let i=0;i<3;i++)box(bill,'bill-stroke-'+side+'-'+i,'billDark',-.073,-.162-i*.009,z,.059-i*.012,.003,.0005);
  }
  const duck=node(scene,'demo-duck');
  sphere(duck,'duck-body','yellow',0,0,0,.050,.050,.055);
  sphere(duck,'duck-breast','yellowLight',0,.010,.034,.043,.041,.036);
  sphere(duck,'duck-head','yellow',0,.060,.022,.035,.037,.034);
  sphere(duck,'duck-beak','beak',0,.052,.056,.026,.010,.022);
  const tail=sphere(duck,'duck-tail','yellow',0,.018,-.053,.030,.025,.027);tail.rotation.x=-.4;
  for(const side of[-1,1]){
    sphere(duck,'duck-wing-'+side,'yellowLight',side*.046,.001,-.002,.009,.025,.038);
    sphere(duck,'duck-eye-'+side,'ink',side*.021,.067,.048,.0058,.0068,.004);
    sphere(duck,'duck-eye-glint-'+side,'white',side*.020,.069,.051,.0018,.0018,.0012);
  }
  // Contact nodes are actual transforms used by positioning and returned to QA.
  const billContact=node(bill,'bill-contact');
  const duckContact=node(duck,'duck-contact');
  const worldPos=o=>o.getWorldPosition(new THREE.Vector3());
  function update(input){
    const sample=input&&typeof input==='object'?input:sampleTimeline(input);
    const anatomy=actor.update(sample);
    const hand=actor.hands[0];
    const pinch=worldPos(hand.pinchAnchor),grip=worldPos(hand.gripAnchor);
    if(sample.bill.attached){bill.position.copy(pinch);bill.rotation.set(...sample.bill.rotation);}
    else {bill.position.fromArray(sample.bill.freePoint);bill.rotation.set(0,sample.bill.flutter,sample.bill.flutter*.55);}
    if(sample.duck.attached)duck.position.copy(grip);else duck.position.set(.48,.90,.25);
    // Rubber duck remains upright while the palm rolls around its rounded body.
    duck.rotation.set(0,-.10,0);
    scene.updateMatrixWorld(true);
    const contacts={
      restWrist:actor.hands[1].group.position.toArray(),
      tableHands:actor.hands.map((h,i)=>{const p=worldPos(h.tableAnchor);return{side:i===0?'right':'left',point:p.toArray(),gap:p.y-.85};}),
      pinchAnchor:pinch.toArray(),palmAnchor:grip.toArray(),
      carryFingerTip:worldPos(hand.fingers[1].tip).toArray(),indexTip:worldPos(hand.fingers[0].tip).toArray(),thumbTip:worldPos(hand.thumb.tip).toArray(),
      attachments:[
        {name:'banknote',attached:sample.bill.attached,anchor:pinch.toArray(),contact:worldPos(billContact).toArray()},
        {name:'duck',attached:sample.duck.attached,anchor:grip.toArray(),contact:worldPos(duckContact).toArray()},
      ],
    };
    return {...sample,anatomy,contacts};
  }
  function diagnostics(){let meshes=0,triangles=0;scene.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});return {meshes,triangles,tableTop:.85,armLengths:[.35,.34],duration:DURATION};}
  function dispose(){const geometries=new Set(),mats=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));});geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());scene.clear();}
  update(0);
  return {scene,update,dispose,actor,objects:{bill,duck,table},diagnostics};
}
