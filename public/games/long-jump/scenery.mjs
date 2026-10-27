import {chunkWindow,regionAt,CHUNK_SIZE} from './world.mjs';
const BOARD=10;
// Seven nearby chunks; all geometry/materials shared, removed groups become collectable.
export function createScenery(THREE,scene){
 const group=new THREE.Group();group.name='cartoon-world';scene.add(group);const chunks=new Map(),materials=new Map();
 const geo={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.SphereGeometry(1,10,7),pyramid:new THREE.ConeGeometry(1,1,4),cone:new THREE.ConeGeometry(1,1,8),cylinder:new THREE.CylinderGeometry(1,1,1,8)};
 const material=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.9}));return materials.get(color);};
 function mesh(parent,name,shape,color,x,y,z,sx,sy,sz){const m=new THREE.Mesh(geo[shape],material(color));m.name=name;m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.receiveShadow=true;parent.add(m);return m;}
 function landmark(parent,r,x,loop){const z=-7,accent=r.accent;
  if(r.id==='taiwan'){for(const side of[-1,1]){mesh(parent,'taiwan-shop','box',side<0?'#e8d5a4':'#668d78',x+side*2,1.7,z,3,3.4,2);mesh(parent,'taiwan-awning','box','#cf614e',x+side*2,3.5,z+.2,3.5,.25,2.5);}mesh(parent,'taiwan-lantern','sphere','#ec764f',x,3.1,z+1,.5,.65,.5);mesh(parent,'taiwan-sign','box','#fff3c5',x,4,z,.2,2,.2);}
  if(r.id==='sea'){mesh(parent,'sea-island','sphere','#ecd296',x,.12,z,4,.7,2);mesh(parent,'sea-palm','cylinder','#ad8158',x,1.9,z,.16,3.8,.16);for(const side of[-1,1]){const leaf=mesh(parent,'sea-leaf','sphere','#5f9b77',x+side*.9,3.8,z,1.6,.25,.8);leaf.rotation.z=side*.25;}mesh(parent,'sea-boat','box','#f7eee0',x+9,.2,z-1,2,.5,.8);mesh(parent,'sea-sail','pyramid','#ed9a68',x+9,1.5,z-1,1,2,.12);}
  if(r.id==='japan'){for(const dx of[-2,2])mesh(parent,'japan-torii','cylinder',accent,x+dx,2.2,z,.23,4.4,.23);mesh(parent,'japan-torii','box',accent,x,4.2,z,5.5,.4,.5);mesh(parent,'japan-torii','box','#543e47',x,4.55,z,6,.25,.7);mesh(parent,'japan-cherry','sphere','#eeb6cf',x+7,3,z-3,2.6,2.1,1.9);mesh(parent,'japan-trunk','cylinder','#8a6b5d',x+7,1.2,z-3,.3,2.4,.3);}
  if(r.id==='egypt'){const a=mesh(parent,'egypt-pyramid','pyramid','#dfb56d',x,3.5,z-2,6,7,6);a.rotation.y=Math.PI/4;const b=mesh(parent,'egypt-pyramid','pyramid','#c99a5b',x+10,2.3,z-7,4,4.6,4);b.rotation.y=Math.PI/4;mesh(parent,'egypt-obelisk','box','#e4c88f',x-7,2.5,z,.8,5,.8);}
  if(r.id==='france'){for(const side of[-1,1]){const leg=mesh(parent,'france-tower','box','#5b6b79',x+side*1.1,3.1,z,.3,6.4,.4);leg.rotation.z=side*.22;}for(const [y,w]of[[1.5,3.8],[3.4,2.8],[5.8,1.5]])mesh(parent,'france-tower','box','#5b6b79',x,y,z,w,.25,.5);mesh(parent,'france-spire','box','#5b6b79',x,6.8,z,.2,2,.2);mesh(parent,'france-cafe','box','#e3cdb6',x+8,1.2,z,4,2.4,2);mesh(parent,'france-canopy','box','#bc6d63',x+8,2.5,z+.5,4.3,.2,2.8);}
  if(r.id==='usa'){for(let i=0;i<5;i++){const h=2.4+(i%3)*1.7;mesh(parent,'usa-skyline','box',['#7a94aa','#a9b5bb','#dbb784'][i%3],x+(i-2)*2.4,h/2,z-2-i%2,1.9,h,2);if(i%2===0)mesh(parent,'usa-window','box','#fff1bc',x+(i-2)*2.4,h*.65,z-.95-i%2,1,.2,.04);}mesh(parent,'usa-spire','box','#6d8697',x,6.7,z-2,.18,2.6,.18);}
  if(loop>0)mesh(parent,'world-loop-pennant','pyramid',loop%2?'#df91ad':'#8fbf92',x+4,4.2,z+1,.6,1.3,.1);
 }
 function build(chunk){const g=new THREE.Group();g.name='world-chunk-'+chunk.index;g.userData.start=chunk.start;
  // Six-metre surface slices align every itinerary boundary; landmarks can be seen ahead.
  for(let i=0;i<8;i++){const at=chunk.start+i*6+3,r=regionAt(Math.max(0,at));mesh(g,'world-ground','box',r.ground,i*6+3,-.3,0,6,.6,38);mesh(g,'world-lane','box',r.id==='sea'?'#72c9d0':'#ead4a8',i*6+3,.003,0,6,.016,3.6);if(r.id!=='sea')mesh(g,'world-distance-tick','box','#fff4d6',i*6+3,.025,1.8,.04,.03,.5);}
  for(const at of[8,24,40])landmark(g,regionAt(Math.max(0,chunk.start+at)),at,regionAt(Math.max(0,chunk.start+at)).loop);
  // A few clouds stay visually light even above the landmarks.
  mesh(g,'world-cloud','sphere','#fffaf0',8,11,-14,3,.65,1.1);mesh(g,'world-cloud','sphere','#fffaf0',34,16,-19,3.5,.8,1.4);
  if(chunk.start<0&&chunk.start+CHUNK_SIZE>-40){const left=Math.max(chunk.start,-36),right=Math.min(chunk.start+CHUNK_SIZE,0);if(right>left)mesh(g,'runway','box','#c46f53',(left+right)/2-chunk.start,.024,0,right-left,.04,3.6);}
  if(chunk.start<=0&&chunk.start+CHUNK_SIZE>0){mesh(g,'takeoff-board','box','#fffced',-chunk.start-.11,.05,0,.22,.06,3.6);mesh(g,'foul-line','box','#df6b57',-chunk.start+.06,.05,0,.12,.06,3.6);}
  return g;
 }
 function update(distance,origin=0){const window=chunkWindow(distance),needed=new Set(window.map(c=>c.index));for(const[id,g]of chunks)if(!needed.has(id)){group.remove(g);chunks.delete(id);}for(const c of window){let g=chunks.get(c.index);if(!g){g=build(c);chunks.set(c.index,g);group.add(g);}g.position.x=BOARD+c.start-origin;}}
 function stats(){let meshes=0;group.traverse(o=>{if(o.isMesh)meshes++;});return{chunks:chunks.size,meshes,geometries:Object.keys(geo).length,materials:materials.size};}
 function dispose(){scene.remove(group);chunks.clear();group.clear();Object.values(geo).forEach(g=>g.dispose());materials.forEach(m=>m.dispose());materials.clear();}
 return{group,update,stats,dispose};
}
