import {chunkWindow,regionAt,CHUNK_SIZE} from './world.mjs';
const BOARD=10;
// Seven nearby chunks; all geometry/materials shared, removed groups become collectable.
export function createScenery(THREE,scene){
 const group=new THREE.Group();group.name='cartoon-world';scene.add(group);const chunks=new Map(),materials=new Map();
 const geo={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.SphereGeometry(1,10,7),pyramid:new THREE.ConeGeometry(1,1,4),cone:new THREE.ConeGeometry(1,1,8),cylinder:new THREE.CylinderGeometry(1,1,1,8),ring:new THREE.TorusGeometry(1,.08,6,32)};
 const material=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.9}));return materials.get(color);};
 function mesh(parent,name,shape,color,x,y,z,sx,sy,sz){const m=new THREE.Mesh(geo[shape],material(color));m.name=name;m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.receiveShadow=true;parent.add(m);return m;}
 function landmark(parent,r,x){const z=-7,accent=r.accent,k=r.landmark,first=parent.children.length;
  const m=(shape,c,dx,y,sx,sy,sz,dz=0)=>mesh(parent,k+'-part',shape,c,x+dx,y,z+dz,sx,sy,sz);
  const roof=(dx,y,w,c=accent)=>{const a=m('pyramid',c,dx,y,w,.8,w*.65);a.rotation.y=Math.PI/4;};
  if(k==='taipei101'){for(let i=0;i<7;i++)m('box',i%2?'#6a9d9c':'#83b2ae',0,.5+i*.72,2.4-i*.15,.62,1.8-i*.1);m('cylinder','#577e80',0,6.3,.09,2,.09);}
  else if(k==='lantern'){for(const dx of[-2,2]){m('box','#e8d5a4',dx,1.7,3,3.4,2);m('box','#cf614e',dx,3.5,3.5,.25,2.5);}m('sphere','#ec764f',0,3.1,.5,.65,.5,1);}
  else if(k==='harbor'){m('box',accent,0,3.1,.3,6.2,.3);m('box',accent,1.6,5.6,4,.25,.3);m('box','#f4ede0',4,.5,5,.8,1.8,2);m('box','#7d9eac',4,1.2,2,.7,1.3,2);m('box','#f4ede0',3,2,.15,1.2,.15,2);}
  else if(k==='airport'){m('box','#d7e2e5',0,.8,6,1.6,2);m('cylinder','#9eb1bd',-4,2.2,.4,4.4,.4);m('box','#56798e',-4,4,1.7,.8,1.7);m('box','#f4f5ef',3,3,3,.2,.4);m('box','#f4f5ef',3,3,.7,.12,3.5);}
  else if(k==='rail'||k==='train'){m('box','#a48b72',0,.2,8,.2,1.3);m('box',accent,0,1,4,1.2,1.3);m('box','#f3e5be',0,1.8,4.2,.25,1.5);for(const dx of[-1.4,1.4]){m('sphere','#52616b',dx,.5,.35,.35,.35,.7);m('box','#b6dce3',dx,1.2,.7,.5,.05,.68);}if(k==='train')m('cylinder','#52616b',2,1.9,.25,1.2,.25);}
  else if(['gate','fort','palace','temple'].includes(k)){for(const dx of[-2,2])m('box',k==='fort'?'#ac8568':'#cfb48f',dx,1.7,1.6,3.4,1.8);m('box','#ceb99a',0,2.9,5,1.1,1.9);roof(0,3.9,4.6);if(k==='palace'||k==='temple'){m('box','#ead7ac',0,4.5,2.5,1.2,1.6);roof(0,5.4,3.3);if(k==='temple')m('cone','#d9b55f',0,6.4,.6,1.7,.6);}if(k==='fort')for(const dx of[-2,-1,0,1,2])m('box','#a17d64',dx,4,.5,.55,.5);}
  else if(k==='bridge'){for(const dx of[-3,0,3])m('box','#9c6f58',dx,1.7,.65,3.4,1.5);m('box','#b88567',0,3.2,8,.6,1.6);m('box','#719ba1',0,.04,9,.06,4,1);}
  else if(k==='hall'){m('box','#e3d5c4',0,1.8,6,3.6,2.5);for(const dx of[-2,0,2])m('sphere','#657d81',dx,2,.6,1.1,.08,1.3);m('box','#b8c7ba',0,3.7,6.3,.25,2.7);}
  else if(k==='buddha'){m('box','#afa086',0,.5,3,1,2.6);m('sphere','#c6aa73',0,1.7,1.4,1,1);m('sphere','#c6aa73',0,3,.8,1.1,.7);m('sphere','#aa8857',0,4.25,.6,.65,.6);}
  else if(['mountain','gorge','lake'].includes(k)){for(const dx of[-3,3])m('cone',dx<0?'#629483':'#8db09c',dx,3.3,3.6,6.6,3,-3);if(k==='mountain')for(const dx of[-3,3])m('cone','#eaf2e7',dx,5.8,1.05,1.7,1,-3);if(k==='gorge')m('box','#9ab9bd',0,.08,1.5,.12,8,2);if(k==='lake'){m('sphere','#74b8c3',0,.04,5,.08,2.6,2);m('box','#b36b54',1,.45,1.8,.4,.7,2);}}
  else if(k==='field'){for(const dx of[-3,0,3]){m('box','#b7bc61',dx,.12,2.6,.2,4);m('cylinder','#b2a568',dx,1,.06,1.8,.06);m('sphere','#d9bd68',dx,1.8,.35,.25,.25);}m('box','#f1ddba',5,1,2.5,2,2);roof(5,2.4,2.5);}
  else if(k==='lighthouse'){m('cylinder','#f0ede0',0,2.6,.7,5.2,.7);m('cylinder','#506779',0,4.8,.73,.65,.73);m('cone','#ba6451',0,5.8,1,1.2,1);m('box','#f7df87',0,4.8,.6,.4,.05,.74);}
  else if(k==='balloon'){for(const dx of[-3,2]){m('sphere',dx<0?'#e9a45e':'#bc80a3',dx,4.2,1.4,1.8,1.4);m('box','#aa835c',dx,2.1,.6,.5,.6);for(const side of[-1,1])m('box','#f4ddab',dx+side*.3,2.7,.04,.8,.04);}}
  else if(k==='basalt'){for(let i=0;i<7;i++){const h=1.4+(i%3)*.6;m('cylinder',i%2?'#657b81':'#899998',i-3,h/2,.65,h,.65);}}
  else if(k==='island'){m('sphere','#ecd296',0,.12,4,.7,2);m('cylinder','#ad8158',0,1.9,.16,3.8,.16);for(const dx of[-1,1]){const a=m('sphere','#5f9b77',dx,3.8,1.6,.25,.8);a.rotation.z=dx*.25;}m('box','#f7eee0',6,.2,2,.5,.8,-1);m('pyramid','#ed9a68',6,1.5,1,2,.12,-1);}
  else if(k==='torii'){for(const dx of[-2,2])m('cylinder',accent,dx,2.2,.23,4.4,.23);m('box',accent,0,4.2,5.5,.4,.5);m('box','#543e47',0,4.55,6,.25,.7);m('sphere','#eeb6cf',6,3,2.2,2.1,1.9,-3);m('cylinder','#8a6b5d',6,1.2,.3,2.4,.3,-3);}
  else if(k==='shiphotel'){for(const dx of[-2.5,0,2.5])m('box','#9fb4bb',dx,2.2,1.4,4.4,1.5);m('sphere','#d5e0d9',0,4.7,4.7,.5,1.4);m('box','#609a86',0,5,6,.12,1.2);}
  else if(k==='dome'){m('box','#eee8d9',0,1.4,5,2.8,2.5);m('sphere','#f6f0e2',0,3.3,1.5,1.5,1.5);for(const dx of[-3,3]){m('cylinder','#e5dcc6',dx,2.4,.3,4.8,.3);m('cone','#d4c7aa',dx,5,.5,.6,.5);}}
  else if(k==='spire'){for(let i=0;i<7;i++)m('box','#8aa5b0',0,.5+i*.85,2.4-i*.28,.9,1.5-i*.13);m('cylinder','#9bb6bc',0,7,.05,2.5,.05);}
  else if(k==='pyramid'){const a=m('pyramid','#dfb56d',0,3.5,6,7,6,-2);a.rotation.y=Math.PI/4;const b=m('pyramid','#c99a5b',8,2.3,4,4.6,4,-7);b.rotation.y=Math.PI/4;}
  else if(k==='colosseum'){m('cylinder','#c1a280',0,1.7,4,3.4,2);for(const dx of[-3,-1.5,0,1.5,3])for(const y of[1,2.4])m('box','#7b7468',dx,y,.65,.7,.05,1.85);}
  else if(k==='tower'){for(const dx of[-1,1]){const a=m('box','#5b6b79',dx*1.1,3.1,.3,6.4,.4);a.rotation.z=dx*.22;}for(const[y,w]of[[1.5,3.8],[3.4,2.8],[5.8,1.5]])m('box','#5b6b79',0,y,w,.25,.5);m('box','#5b6b79',0,6.8,.2,2,.2);}
  else if(k==='clock'){m('box','#baa782',0,2.7,1.6,5.4,1.5);m('sphere','#f8efd4',0,4.4,.55,.55,.06,.79);m('box','#49576a',0,4.55,.05,.3,.08,.87);m('cone','#566d78',0,6.1,1.2,1.8,1.2);}
  else if(k==='city'){for(let i=0;i<5;i++){const h=2.4+(i%3)*1.7;m('box',['#7a94aa','#a9b5bb','#dbb784'][i%3],(i-2)*2.4,h/2,1.9,h,2,-2-i%2);}m('box','#6d8697',0,6.7,.18,2.6,.18,-2);}
  else if(k==='statue'){m('cone','#739180',0,1.8,3,3.6,2,-2);m('box','#d4d4c8',0,4,.5,2.8,.5);m('sphere','#d4d4c8',0,5.7,.38,.45,.38);m('box','#d4d4c8',0,4.9,3.2,.3,.4);}
  else if(k==='opera'){m('box','#d1c4a9',0,.2,7,.4,3);for(const dx of[-2,0,2]){const a=m('cone','#f5efdb',dx,1.8,1.8,3.3,1.3);a.rotation.z=-.35;}}
  else if(k==='globe'){m('sphere','#81b8c4',0,3,2.6,2.6,2.6);m('sphere','#8dac78',-1,3.5,1.1,.8,.18,2.4);m('sphere','#8dac78',1,2.8,.7,1,.18,2.4);m('ring','#e5bc62',0,3,3,3,3);}
  else if(k==='clouds'){for(const dx of[-3,0,3])m('sphere','#e6f1f6',dx,3+Math.abs(dx)*.2,2.6,.8,1.8);m('sphere','#6ba6c5',0,-3,9,3.5,6,-4);}
  else if(k==='satellite'){m('box','#d6d8cf',0,3,1.4,1.4,1.2);for(const dx of[-3,3])m('box','#617ca8',dx,3,3.8,.12,2);m('cylinder','#c2c7cb',0,4.2,.12,1.5,.12);m('sphere','#759ebb',5,-1,6,3,4,-6);}
  else if(k==='moon'||k==='mars'){m('sphere',k==='moon'?'#c5c6c5':'#cc8c62',0,3,3.2,3.2,2,-2);for(const[dx,y]of[[-1,4],[1.3,3.2],[-.5,1.8]])m('sphere',k==='moon'?'#969ca8':'#9b604d',dx,y,.55,.4,.12,.05);m('box','#a8b1b7',5,.8,1.8,.7,1.2);m('cylinder','#d4d6c7',5,1.5,.05,1,.05);}
  else if(k==='saturn'){m('sphere','#d6c098',0,4,2.6,2.6,2.6,-2);const ring=m('ring','#e7cda0',0,4,4.6,2.1,2.4,-1);ring.rotation.z=.22;m('box','#a5b6cd',5,.4,2,.2,1.5,2);}
  else if(k==='stars'){for(let i=0;i<7;i++)m('sphere',i%2?'#cfc0e6':'#e4eff5',(i-3)*1.5,1+(i*7%5),.12,.12,.12,-i%3);m('sphere','#9d86bd',0,3,1.2,1.2,1.2,-4);}
  if(parent.children[first]){parent.children[first].name=k+'-landmark';parent.children[first].userData.region=r.id;}
 }
 function build(chunk){const g=new THREE.Group();g.name='world-chunk-'+chunk.index;g.userData.start=chunk.start;
  // Six-metre surface slices align every itinerary boundary; landmarks can be seen ahead.
  for(let i=0;i<8;i++){const at=chunk.start+i*6+3,r=regionAt(Math.max(0,at));mesh(g,'world-ground','box',r.ground,i*6+3,-.3,0,6,.6,38);mesh(g,'world-lane','box',r.stage==='space'?'#8994aa':r.ground,i*6+3,.003,0,6,.016,3.6);if(r.stage!=='space')mesh(g,'world-distance-tick','box','#fff4d6',i*6+3,.025,1.8,.04,.03,.5);}
  for(const at of[8,24,40])landmark(g,regionAt(Math.max(0,chunk.start+at)),at);
  // A few clouds stay visually light even above the landmarks.
  if(chunk.region.stage!=='space'){mesh(g,'world-cloud','sphere','#fffaf0',8,11,-14,3,.65,1.1);mesh(g,'world-cloud','sphere','#fffaf0',34,16,-19,3.5,.8,1.4);}else for(let i=0;i<6;i++)mesh(g,'space-star','sphere','#eef1fb',i*8+2,8+i%3*3,-14,.09,.09,.09);
  if(chunk.start<0&&chunk.start+CHUNK_SIZE>-40){const left=Math.max(chunk.start,-36),right=Math.min(chunk.start+CHUNK_SIZE,0);if(right>left)mesh(g,'runway','box','#c46f53',(left+right)/2-chunk.start,.024,0,right-left,.04,3.6);}
  if(chunk.start<=0&&chunk.start+CHUNK_SIZE>0){mesh(g,'takeoff-board','box','#fffced',-chunk.start-.11,.05,0,.22,.06,3.6);mesh(g,'foul-line','box','#df6b57',-chunk.start+.06,.05,0,.12,.06,3.6);}
  return g;
 }
 function update(distance,origin=0){let changed=false;const window=chunkWindow(distance),needed=new Set(window.map(c=>c.index));for(const[id,g]of chunks)if(!needed.has(id)){group.remove(g);chunks.delete(id);changed=true;}for(const c of window){let g=chunks.get(c.index);if(!g){g=build(c);chunks.set(c.index,g);group.add(g);changed=true;}g.position.x=BOARD+c.start-origin;}if(changed){const used=new Set();group.traverse(o=>{if(o.isMesh)used.add(o.material);});for(const[c,m]of materials)if(!used.has(m)){m.dispose();materials.delete(c);}}}
 function stats(){let meshes=0;group.traverse(o=>{if(o.isMesh)meshes++;});return{chunks:chunks.size,meshes,geometries:Object.keys(geo).length,materials:materials.size};}
 function dispose(){scene.remove(group);chunks.clear();group.clear();Object.values(geo).forEach(g=>g.dispose());materials.forEach(m=>m.dispose());materials.clear();}
 return{group,update,stats,dispose};
}
