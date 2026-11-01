import{createAirScenery}from'./air-scenery.mjs';import{surfaceAt,routeChapter}from'./sky-route.mjs';
// Recognizable carriers share the exact visible capsule rim. Ornament stays below that contact line.
export function createSkyView(THREE,scene){const scenery=createAirScenery(THREE,scene),panels=[];let seed=null;
 const material=c=>new THREE.MeshStandardMaterial({color:c,roughness:.8});
 function add(g,geometry,c,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material(c));m.position.set(x,y,z);g.add(m);return m;}
 function rebuild(s){for(const g of panels){scene.remove(g);g.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}panels.length=0;seed=s.seed;for(const o of s.route){const light=o.id>=12,g=new THREE.Group(),body=new THREE.Group();g.add(body);const rim=add(g,new THREE.BoxGeometry(o.half*2,.035,.04),'#f4d879',0,.125,.36);const colors={awning:'#dc896b',mattress:'#a8c1cf',wok:'#56636b'},color=o.id===0?'#73b0b8':light?{awning:'#d9ac94',mattress:'#bfcfd1',wok:'#93aaa0'}[o.kind]:colors[o.kind];const board=add(g,new THREE.BoxGeometry(o.half*2,light?.16:.24,.65),color,0,light?.04:0);for(const x of[-o.half,o.half])add(g,new THREE.SphereGeometry(.12,8,6),'#f4d879',x);
 let spring=add(body,new THREE.TorusGeometry(light?.3:.45,.08,5,14),'#9fbcc4',0,light?-.4:-.65);spring.scale.y=.8;if(o.id===0){spring.geometry.dispose();spring.geometry=new THREE.TorusGeometry(.18,.04,5,14);spring.rotation.x=Math.PI/2;spring.position.set(0,-.42,0);for(const y of[-.56,-.70]){const coil=add(body,new THREE.TorusGeometry(.18,.04,5,14),'#9fbcc4',0,y);coil.rotation.x=Math.PI/2;}}
 if(o.id===0){
 // The first collider is a low inclined spring ramp, not a toppled building.
 // Keep the gold contact edge/caps and physics transform exactly where they were.
 const pad=add(body,new THREE.BoxGeometry(o.half*2,.34,.95),'#73b0b8',0,-.10);pad.name='thick-ramp-pad';
 for(const x of[-2,-1,0,1,2]){const stripe=add(body,new THREE.BoxGeometry(.08,.025,.95),'#f7edcf',x,.08);stripe.name='pad-seam';}
 for(const x of[-o.half*.65,0]){
  const ca=Math.cos(o.angle),sa=Math.sin(o.angle),top=o.y+x*sa-.32*ca;
  const height=Math.max(.06,top-.04);
  const leg=add(body,new THREE.BoxGeometry(.14,height,.14),'#536d77');
  // Supports stay vertical in world space rather than inheriting the ramp tilt.
  const wx=o.x+x*ca+.32*sa,wy=.04+height/2;
  leg.position.set((wx-o.x)*ca+(wy-o.y)*sa,-(wx-o.x)*sa+(wy-o.y)*ca,-.25);leg.rotation.z=-o.angle;leg.name='upright-ramp-support';
  const foot=add(body,new THREE.BoxGeometry(.65,.08,.55),'#536d77');const fy=.08;foot.position.set((wx-o.x)*ca+(fy-o.y)*sa,-(wx-o.x)*sa+(fy-o.y)*ca,-.25);foot.rotation.z=-o.angle;foot.name='grounded-ramp-foot';
 }
 // Crop only decoration below the ground. The original top contact edge and
 // upper capsule remain unchanged; this removes the buried lower tip/trim.
 g.position.set(o.x,o.y,0);g.rotation.z=o.angle;g.updateMatrixWorld(true);
 g.traverse(m=>{if(!m.isMesh)return;const pos=m.geometry.attributes.position,inv=m.matrixWorld.clone().invert(),v=new THREE.Vector3();for(let j=0;j<pos.count;j++){v.fromBufferAttribute(pos,j).applyMatrix4(m.matrixWorld);if(v.y<.02){v.y=.02;v.applyMatrix4(inv);pos.setXYZ(j,v.x,v.y,v.z);}}pos.needsUpdate=true;m.geometry.computeVertexNormals();m.geometry.computeBoundingBox();m.geometry.computeBoundingSphere();});
 }else if(o.kind==='awning'){for(let j=0;j<8;j++){const width=o.half/4;add(body,new THREE.BoxGeometry(width,light?.3:.65,.5),j%2?'#f7edcf':'#c76f64',-o.half+width*(j+.5),light?-.24:-.42);const scallop=add(body,new THREE.SphereGeometry(1,8,6),j%2?'#f7edcf':'#c76f64',-o.half+width*(j+.5),light?-.42:-.76);scallop.scale.set(width*.48,light?.12:.24,.3);}for(const x of[-o.half*.75,o.half*.75])add(body,new THREE.BoxGeometry(.12,1.2,.12),'#7e8f8c',x,-1.1,-.3);
 }else if(o.kind==='mattress'){add(body,new THREE.BoxGeometry(o.half*2,light?.45:.95,.7),'#c4cdd2',0,light?-.32:-.55);for(let j=0;j<7;j++){const x=-o.half+(j+1)*o.half/4;const seam=add(body,new THREE.BoxGeometry(.06,light?.4:.85,.04),'#7b94a5',x,light?-.30:-.5,.38);add(body,new THREE.SphereGeometry(.08,6,4),'#fff5d8',x,light?-.25:-.4,.43);}for(const x of[-o.half*.6,o.half*.6]){const coil=add(body,new THREE.TorusGeometry(light?.2:.35,.06,4,12),'#6c899b',x,light?-.7:-1.2);coil.scale.y=1.5;}
 }else{const bowl=add(body,new THREE.SphereGeometry(1,16,8,0,Math.PI*2,Math.PI/2,Math.PI/2),light?'#93aaa0':'#46545b',0,-.12);bowl.name='relay-bowl';bowl.scale.set(o.half,light?.45:1.5,.7);add(body,new THREE.BoxGeometry(2,.28,.35),'#c5a175',o.half+1,-.6);add(body,new THREE.BoxGeometry(1,.2,.3),'#7e8d94',-o.half-.5,-.5);}
 const particles=[];for(let n=0;n<5;n++){const m=add(g,new THREE.SphereGeometry(.09,6,4),o.kind==='wok'?['#e8bf70','#d98265','#acd194'][n%3]:'#f3e1b0');m.visible=false;particles.push(m);}g.userData={board,rim,spring,body,particles,artKind:o.id===0?'spring-ramp':o.kind};scene.add(g);panels.push(g);}}
 function update(s,bp,aspect=16/9,view){if(seed!==s.seed)rebuild(s);const airborne=['air','impact','done'].includes(s.phase);for(let i=0;i<panels.length;i++){const o=s.route[i],p=surfaceAt(o,s.flight),g=panels[i];g.position.set(p.x,p.y,0);g.rotation.z=p.angle;g.visible=true;const hit=s.hits.find(h=>h.id===o.id),age=hit?s.flight-hit.t:Infinity,spent=s.spent.includes(o.id),body=g.userData.body;g.userData.board.material.color.set(spent?(o.id>=12?'#b4bcb0':'#9a9e96'):o.id===0?'#73b0b8':o.id>=12?{awning:'#d9ac94',mattress:'#bfcfd1',wok:'#93aaa0'}[o.kind]:{awning:'#dc896b',mattress:'#a8c1cf',wok:'#56636b'}[o.kind]);g.userData.rim.material.color.set(spent?'#aaa99c':'#f4d879');g.userData.spring.scale.y=spent?.25:.8;body.scale.y=o.id!==0&&o.kind==='awning'&&spent?.18:o.kind==='mattress'&&age<1?1-.45*Math.sin(age*Math.PI):1;body.rotation.z=o.kind==='wok'&&age<1?Math.sin(age*22)*.045*(1-age):0;
 g.userData.particles.forEach((m,n)=>{m.visible=age>=0&&age<1.2;if(!m.visible)return;const dx=(hit?.x??p.x)-p.x,dy=(hit?.y??p.y)-p.y,ca=Math.cos(-p.angle),sa=Math.sin(-p.angle);m.position.set(dx*ca-dy*sa+(n-2)*age,dx*sa+dy*ca+age*(2+n*.25)-2.5*age*age,.5);});}
 const x=s.maxX||0;scenery.update(bp,aspect,view);
 // Blend across distance bands instead of hard cutting on the first frame of a chapter.
 const color=new THREE.Color(routeChapter(x).sky);
 for(const edge of[120,350,600,900])if(Math.abs(x-edge)<20){const u=(x-edge+20)/40,t=u*u*(3-2*u);color.set(routeChapter(edge-1).sky).lerp(new THREE.Color(routeChapter(edge).sky),t);break;}
 const entry=airborne?Math.min(1,s.flight/.5):0;
 return new THREE.Color('#d7eadd').lerp(color,entry*entry*(3-2*entry));}

 return{update};}
