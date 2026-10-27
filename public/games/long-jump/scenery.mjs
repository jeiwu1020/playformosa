import {chunkWindow,regionAt,REGIONS,CHUNK_SIZE} from './world.mjs';
import {createArt} from './scenery-art.mjs';
import {landmarkParts} from './landmarks.mjs';
const BOARD=10;
// Unique route landmarks have fixed anchors, not one stamp per repeating scenery cell.
const anchors=REGIONS.map(r=>({r,at:r.id==='taipei'?-30:r.start+12}));
const coast=new Set(['keelung','kaohsiung','pingtung','matsu','penghu','okinawa','singapore','hawaii','australia','newzealand']);
const country=new Set(['hsinchu_county','miaoli','changhua','nantou','yunlin','chiayi_county','chiayi_city','taitung','hualien','yilan','rio']);
const oldtown=new Set(['newtaipei','hsinchu_city','tainan','kinmen','seoul','osaka','bangkok','india','rome','france','london']);
export function createScenery(THREE,scene){
 const group=new THREE.Group();group.name='cartoon-world';scene.add(group);const chunks=new Map(),art=createArt(THREE);
 function surroundings(parts,r,x,seed){const add=(shape,c,dx,y,sx,sy,sz,z=-7,rz=0)=>art.part(parts,shape,c,x+dx,y,z,sx,sy,sz,0,0,rz),v=((seed*17%11)+11)%11;
  const tree=(dx,z=-7,s=.7)=>{add('cylinder','#9a8065',dx,s*.5,.08,s,.08,z);add('sphere',r.stage==='world'?'#799780':'#71957b',dx,s*1.25,s*.55,s*.65,s*.5,z);};
  if(r.stage==='space'){
   for(let i=0;i<4;i++)add('sphere',i%2?'#c5cadd':'#e2dabd',i*2.7-3,1.1+(i+v)%4*.65,.045,.045,.045,-9-i%2);
   if(r.id==='moon'||r.id==='mars'){add('sphere',r.id==='moon'?'#8b9799':'#a36f57',1,.05,1.2,.08,.6,-5);add('sphere',r.id==='moon'?'#b6bcb4':'#c19472',-3,.15,.45,.23,.4,-7);}
   else if(r.id==='saturn')add('sphere','#b9ac91',2,.2,.8,.3,.4,-7);
   return;
  }
  if(r.stage==='atmosphere'){add('sphere','#e8efeb',0,1.5,3.8,.45,1.6,-7);add('sphere','#d3e4e6',4,2.0,2,.4,1.1,-9);return;}
  if(coast.has(r.id)){
   add('box','#8dc7c8',0,.015,12,.03,6,-8);for(const dx of[-4,0,4])add('box','#d3c3a3',dx,.25,.16,.5,.16,-5.4);
   if(['keelung','matsu'].includes(r.id)){for(const dx of[-3,2]){const h=.9+(v%3)*.2;add('box',r.id==='matsu'?'#b8b29a':['#b5c9b5','#d8b899','#bdc8cc'][v%3],dx,h/2,2,h,1.2,-9);add('pyramid','#8c9180',dx,h+.23,1.7,.45,1.2,-9);}}
   else{tree(-3,-7,.7);tree(3,-9,.9);if(v%2===0)add('box','#d6d9bc',0,.55,2,1.1,1.2,-9);}
  }else if(country.has(r.id)){
   const mountain=['miaoli','nantou','chiayi_county','hualien','rio'].includes(r.id);if(mountain){add('sphere','#9caf94',0,.75,6,1.2,2.5,-10);add('cone','#829b81',3,.75,2,1.5,1.6,-8.5);}else for(let i=0;i<3;i++)add('box',i%2?'#b9c588':'#a3b978',i*3-3,.02,2.8,.04,3,-7);
   if(['nantou','hualien','yilan'].includes(r.id))add('box','#8abfc2',0,.04,12,.06,1.1,-5.3);
   tree(-3,-7,.7);tree(3,-8,1.0);if(v%3===0){add('box','#c8b598',0,.6,1.8,1.2,1.3,-8);add('pyramid','#9a8870',0,1.4,1.6,.55,1.1,-8);}
  }else if(oldtown.has(r.id)){
   for(const dx of[-3,2.5]){const h=1.0+(v%3)*.25;add('box',['#cfbba2','#bdafa0','#d9c4a3'][v%3],dx,h/2,2.2,h,1.4,-8);add('pyramid',['#a37d66','#7c8d80','#a48c72'][v%3],dx,h+.25,1.9,.55,1.3,-8);for(const wx of[-.5,.5])add('box','#748d88',dx+wx,.6,.28,.4,.025,-7.28);}tree(0,-6.8,.65);
  }else if(['egypt','dubai'].includes(r.id)){
   add('sphere','#d9bd91',0,.2,5,.35,2,-8);add('sphere','#cdb18b',4,.4,3,.6,1.5,-10);if(r.id==='dubai')for(let i=0;i<3;i++)add('box','#c4cac1',i*1.5-2,.6+i*.2,1.1,1.2+i*.4,1.1,-9);else add('box','#b6a07d',2,.15,.5,.3,.5,-6);
  }else{
   // Ordinary varied towers: no silhouette can be mistaken for a second 101.
   for(let i=0;i<3;i++){const h=.8+((v+i*3)%5)*.22,dx=(i-1)*2.7;add('box',['#b7c6bf','#c5c9ba','#acbfc0'][i],dx,h/2,1.8,h,1.4,-8-i%2);for(let row=0;row<2;row++)add('box','#e1e4c9',dx,.35+row*.45,1.2,.06,.03,-7.28-i%2);}tree(4,-6.5,.7);
  }
 }
 function build(chunk){const g=new THREE.Group();g.name='world-chunk-'+chunk.index;g.userData.start=chunk.start;const parts=[];
  for(let i=0;i<8;i++){const at=chunk.start+i*6+3,r=regionAt(Math.max(0,at));art.part(parts,'box',r.ground,i*6+3,-.3,6,6,.6,34);art.part(parts,'box',r.stage==='space'?'#8994aa':r.ground,i*6+3,.003,0,6,.016,3.6);if(r.stage!=='space')art.part(parts,'box','#fff4d6',i*6+3,.025,1.8,.04,.03,.5);}
  for(let i=0;i<4;i++){const at=chunk.start+i*12+6;surroundings(parts,regionAt(Math.max(0,at)),i*12+6,Math.floor(at/12));}
  if(chunk.start<0&&chunk.start+CHUNK_SIZE>-40){const left=Math.max(chunk.start,-36),right=Math.min(chunk.start+CHUNK_SIZE,0);if(right>left)art.part(parts,'box','#c46f53',(left+right)/2-chunk.start,.024,0,right-left,.04,3.6);}
  if(chunk.start<=0&&chunk.start+CHUNK_SIZE>0){art.part(parts,'box','#fffced',-chunk.start-.11,.05,0,.22,.06,3.6);art.part(parts,'box','#df6b57',-chunk.start+.06,.05,0,.12,.06,3.6);}
  g.add(art.batch(parts,'district-scenery'));
  for(const{r,at}of anchors){if(Math.floor(at/CHUNK_SIZE)!==chunk.index)continue;const m=art.batch(landmarkParts(art,r),r.landmark+'-landmark'),b=m.geometry.boundingBox,size=b.getSize(new THREE.Vector3()),scale=Math.min(3.2/size.y,7.2/size.x,1);m.geometry.translate(-(b.min.x+b.max.x)/2,-b.min.y,0);m.geometry.scale(scale,scale,scale);m.geometry.computeBoundingBox();m.geometry.computeBoundingSphere();m.position.set(at-chunk.start,0,-4.1);m.userData.region=r.id;m.userData.worldAnchor=BOARD+at;m.castShadow=true;g.add(m);}
  return g;
 }
 function release(g){g.traverse(o=>{if(o.isMesh)o.geometry.dispose();});group.remove(g);}
 function update(distance,origin=0){const window=chunkWindow(distance),needed=new Set(window.map(c=>c.index));for(const[id,g]of chunks)if(!needed.has(id)){release(g);chunks.delete(id);}for(const c of window){let g=chunks.get(c.index);if(!g){g=build(c);chunks.set(c.index,g);group.add(g);}g.position.x=BOARD+c.start-origin;}}
 function stats(){let meshes=0,vertices=0;const geometries=new Set();group.traverse(o=>{if(o.isMesh){meshes++;vertices+=o.geometry.attributes.position.count;geometries.add(o.geometry);}});return{chunks:chunks.size,meshes,vertices,geometries:geometries.size,materials:1};}
 function dispose(){for(const g of chunks.values())release(g);chunks.clear();scene.remove(group);art.dispose();}
 return{group,update,stats,dispose};
}
