import{createArt}from'./sky-art/scenery-art.mjs';
import{cosmicParts}from'./sky-art/cosmic-art.mjs';
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const mod=(x,n)=>(x%n+n)%n;
// Pure presentation: continuous camera parallax, plus sparse fixed world objects.
// Nothing here consumes route RNG or writes a throw/score.
export function createAirScenery(T,scene){
 const art=createArt(T),layers=[],period=160;
 function layer(name,geometry,material,rate,z,base,rise){const pool=Array.from({length:3},()=>{const m=new T.Mesh(geometry,material);m.userData={naturalLayer:name,softwareLayer:-110};m.name='natural-'+name;scene.add(m);return m;});layers.push({name,pool,rate,z,base,rise});}
 const hill=[];for(let i=0;i<80;i++){const x=i*2,xx=x+2,h=x=>1.8+.5*Math.sin(x*Math.PI/16)-.2*Math.cos(x*Math.PI/40);hill.push(x,-12,0,xx,-12,0,xx,h(xx),0,x,-12,0,xx,h(xx),0,x,h(x),0);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(hill,3));g.computeVertexNormals();g.computeBoundingSphere();
 const soft=c=>new T.MeshBasicMaterial({color:c,transparent:true,depthWrite:false,side:T.DoubleSide});
 layer('hills',g,soft('#adc7ae'),.10,-28,-7,.86);
 const trees=[];for(const[x,h]of[[-2,1.6],[17,1.3],[39,1.7],[66,1.2],[94,1.5],[121,1.8],[143,1.2]]){art.part(trees,'box','#7d9182',x,.25,0,.12,.7,.1);art.part(trees,'cone','#8da992',x,h*.6,0,.55,h,.2);}
 const tree=art.batch(trees,'trees');layer('trees',tree.geometry,soft('#8da992'),.24,-18,-4.1,.80);
 const clouds=[];for(const x of[3,65,119])for(const [dx,y,w]of[[-.65,0,.8],[0,.18,1],[.8,-.02,.7]])art.part(clouds,'sphere','#ecf2e9',x+dx,y,0,w,.3,.14);
 const cloud=art.batch(clouds,'clouds');layer('clouds',cloud.geometry,soft('#edf2e7'),.055,-22,-4,.93);
 const ids=['bubble_tea','alien_judges','space','moon'],templates=ids.map(id=>{const m=art.batch(cosmicParts(art,id),'high-'+id),c=new T.Vector3();m.geometry.boundingBox.getCenter(c);m.geometry.translate(-c.x,-c.y,-c.z);return m.geometry;});
 const highMaterial=art.material.clone();highMaterial.transparent=true;highMaterial.depthWrite=false;highMaterial.opacity=0;
 const high=Array.from({length:9},()=>{const m=new T.Mesh(templates[0],highMaterial);m.name='sky-backdrop-special';m.scale.setScalar(.62);m.userData={airScenery:true,softwareLayer:-30};scene.add(m);return m;});
 function update(point={x:0,y:2},aspect=16/9,view){point=point||{x:0,y:2};if(!Number.isFinite(point.x)||!Number.isFinite(point.y))return;const cx=view?.center??point.x,cy=view?.height??Math.max(1.4,point.y-1),alt=Math.max(0,point.y);
  for(const l of layers){const tile=Math.floor(cx*l.rate/period);l.pool[0].material.opacity=l.name==='clouds'?.7*(1-smooth(50,95,alt)):1-smooth(30,65,alt);for(let k=tile-1;k<=tile+1;k++){const m=l.pool[mod(k,3)];m.position.set(k*period+(1-l.rate)*cx,l.base+l.rise*cy,l.z);m.userData.anchorKey=l.name+':'+k;}}
  highMaterial.opacity=smooth(45,70,alt);
  // 120m x 60m anchor lattice is much wider than the actual camera. Recycle only
  // the far row/column; an in-view anchor retains both mesh identity and position.
  const col=Math.floor((cx-70)/120),row=Math.max(0,Math.floor((cy-65)/60));
  for(let c=col-1;c<=col+1;c++)for(let r=row;r<=row+2;r++){const m=high[mod(c,3)*3+mod(r,3)],kind=mod(c+r,ids.length);m.geometry=templates[kind];m.position.set(70+c*120,65+r*60,-10);m.userData.anchorKey=c+':'+r;m.userData.artKind=ids[kind];}
 }
 update();return{update};
}
