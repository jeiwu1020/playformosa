import * as THREE from './vendor/three.module.min.js';
import{createCharacter}from'./character3d.mjs';
import{createFallbackView}from'./fallback.mjs';
import{sprintPose,prepared}from'./pose3d.mjs';
import{TRACK,trackPoint,targetBank,clamp}from'./race.mjs';
const material=c=>new THREE.MeshStandardMaterial({color:c,roughness:.92});
export function createView(canvas,notice){
 let renderer;try{const context=canvas.getContext('webgl2',{antialias:true,alpha:false,preserveDrawingBuffer:true});if(!context)throw Error('WebGL unavailable');renderer=new THREE.WebGLRenderer({canvas,context,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});}catch{return createFallbackView(canvas,notice);}
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#c8e2d5');scene.fog=new THREE.Fog('#c8e2d5',90,220);
 scene.add(new THREE.HemisphereLight(0xfff9e5,0x6b9274,2.5));const sun=new THREE.DirectionalLight(0xfff1d9,2.6);sun.position.set(-60,100,30);scene.add(sun);
 const camera=new THREE.PerspectiveCamera(46,1,.1,450),mats={grass:material('#9cbd88'),line:material('#fff3d7'),track1:material('#c88468'),track2:material('#d09374'),stand:material('#b5c6a4'),rail:material('#e8e7d0'),green:material('#4f8c70')};
 const boxGeo=new THREE.BoxGeometry(1,1,1),sphereGeo=new THREE.SphereGeometry(1,10,8);
 function box(mat,x,y,z,w,h,d){const m=new THREE.Mesh(boxGeo,mat);m.position.set(x,y,z);m.scale.set(w,h,d);scene.add(m);return m;}
 box(mats.grass,0,-.2,0,320,.3,260);
 function ribbon(from,to,mat,y=.025){const positions=[];for(let i=0;i<=400;i++){const p=trackPoint(i,0),nx=-p.tz,nz=p.tx;positions.push(p.x+nx*from,y,p.z+nz*from,p.x+nx*to,y,p.z+nz*to);}const indices=[];for(let i=0;i<400;i++){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();const m=new THREE.Mesh(g,mat);m.material.side=THREE.DoubleSide;scene.add(m);}
 for(let l=0;l<4;l++)ribbon((l-.5)*2.2,(l+.5)*2.2,l%2?mats.track2:mats.track1);
 for(let l=0;l<=4;l++)ribbon((l-.5)*2.2-.035,(l-.5)*2.2+.035,mats.line,.04);
 ribbon(-2.8,-1.4,material('#d5ccac'),.02);ribbon(7.95,9.5,material('#dac8a4'),.02);
 function lineAcross(p,width,color=mats.line,length=.12){const m=box(color,p.x,.055,p.z,length,.025,width);m.rotation.y=-Math.atan2(p.tz,p.tx);}
 for(let lane=0;lane<4;lane++){const p=trackPoint(0,lane);lineAcross(p,2.1);for(const dz of[-.22,.22]){const m=box(material('#324f56'),p.x-p.tx*.9-p.tz*dz,.14,p.z-p.tz*.9+p.tx*dz,.4,.17,.16);m.rotation.y=-Math.atan2(p.tz,p.tx);}}
 // One physical finish plane; all staggered paths cover exactly 400 metres.
 for(let l=0;l<22;l++)for(let col=0;col<2;col++)box((l+col)%2?mats.green:mats.line,50+.1+col*.22,.07,TRACK.radius-1.1+l*.4,.22,.03,.4);
 function sign(text,x,z,heading=0){const c=document.createElement('canvas');c.width=512;c.height=150;const ctx=c.getContext('2d');ctx.fillStyle='#f8efd4';ctx.fillRect(0,0,512,150);ctx.strokeStyle='#3c6d57';ctx.lineWidth=12;ctx.strokeRect(6,6,500,138);ctx.fillStyle='#2d5c4b';ctx.textAlign='center';ctx.font='bold 54px sans-serif';ctx.fillText(text,256,94);const texture=new THREE.CanvasTexture(c),m=new THREE.Mesh(new THREE.PlaneGeometry(7,2),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));m.position.set(x,2,z);m.rotation.y=heading;scene.add(m);box(mats.green,x,.8,z,.16,1.8,.16);}
 sign('400m · 一圈就好',42,TRACK.radius+10,0);sign('最後直道，腿別下班',-12,TRACK.radius+10,0);
 for(let d=0;d<400;d+=12){const p=trackPoint(d,0),out={x:-p.tz,z:p.tx};const r=box(mats.rail,p.x+out.x*11,.65,p.z+out.z*11,8,1.1,.25);r.rotation.y=-Math.atan2(p.tz,p.tx);for(let row=0;row<3;row++){const b=box(mats.stand,p.x+out.x*(15+row*1.6),.5+row*.55,p.z+out.z*(15+row*1.6),9,.7,1.4);b.rotation.y=-Math.atan2(p.tz,p.tx);}if(d%24===0){const x=p.x+out.x*22,z=p.z+out.z*22;box(material('#817359'),x,1.3,z,.35,2.6,.35);const crown=new THREE.Mesh(sphereGeo,material(d%48?'#7ca16b':'#89af76'));crown.position.set(x,3.2,z);crown.scale.set(1.6,2.1,1.6);scene.add(crown);}}
 // Stadium infield marks make the course scale readable, without shrinking the runner.
 for(let z=-18;z<=18;z+=9)box(material('#a9c793'),0,-.025,z,93,.025,4.5);
 const colors=['#ed782e','#e15759','#299c91','#8a73bd'];const actors=colors.map(color=>{const wrapper=new THREE.Group();scene.add(wrapper);const char=createCharacter(THREE,wrapper,{color});const shadow=new THREE.Mesh(new THREE.CircleGeometry(.63,20),new THREE.MeshBasicMaterial({color:'#38523e',transparent:true,opacity:.20,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.085;scene.add(shadow);return{wrapper,char,shadow};});
 let width=0,height=0,active=true,first=true,lastDraw=0,lastClock=-1,lastRace=null;const camPosition=new THREE.Vector3(),lookAt=new THREE.Vector3();
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();active=false;notice.textContent='3D 顯示中斷，已暫停。請重新載入。';window.dispatchEvent(new Event('race-render-lost'));});
 return{get active(){return active},render(race,force=false){if(!active)return;const b=canvas.getBoundingClientRect();if(!force&&lastClock===race.clock&&lastRace===race&&b.width===width&&b.height===height)return;if(!force&&renderer.isSoftware&&performance.now()-lastDraw<45&&!first)return;lastDraw=performance.now();lastClock=race.clock;lastRace=race;if(b.width!==width||b.height!==height){width=b.width;height=b.height;renderer.setSize(width,height,false);camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();}
 for(const r of race.runners){const p=trackPoint(r.distance+Math.min(3,r.runout||0)*.5,r.lane),a=actors[r.id];const local={...r,x:0,lean:r.lean+(r.started&&r.fall===0?(1-r.stamina/100)*.16:0)};const pose=sprintPose(local,race.time,race.phase,prepared(race));
 a.char.update(pose.points,pose.state);a.wrapper.position.set(p.x,.04,p.z);a.wrapper.rotation.y=-Math.atan2(p.tz,p.tx);a.char.group.rotation.x=-r.bank;
 // Keep the whole body rig intact; body, head and limbs roll together.
 a.shadow.position.set(p.x,.085,p.z);a.shadow.scale.set(r.fall>0?1.6:1,1,1);
 }
 const p=trackPoint(race.runners[0].distance,race.runners[0].lane),portrait=width/height<.85;const back=portrait?7.4:7.8,side=portrait?2.7:4.0;
 const pos=new THREE.Vector3(p.x-p.tx*back-p.tz*side,portrait?3.8:4.2,p.z-p.tz*back+p.tx*side);const target=new THREE.Vector3(p.x+p.tx*(portrait?2.0:2.7),1.1,p.z+p.tz*(portrait?2.0:2.7));
 // Camera smoothing is render-only and cannot affect the clock or world scale.
 if(first){camPosition.copy(pos);lookAt.copy(target);first=false;}else{camPosition.lerp(pos,.16);lookAt.lerp(target,.16);}camera.position.copy(camPosition);camera.lookAt(lookAt);renderer.render(scene,camera);lastDraw=performance.now();
 }};
}
export function drawMinimap(canvas,race){const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);const scale=1.43,cx=w/2,cy=h/2-4;const point=p=>[cx+p.x*scale,cy+p.z*scale];
 for(let l=0;l<4;l++){ctx.beginPath();for(let d=0;d<=400;d+=2){const [x,y]=point(trackPoint(d,l));d?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.strokeStyle=l===1?'#b8876b':'#d7b196';ctx.lineWidth=3;ctx.stroke();}
 ctx.strokeStyle='#2a5544';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(...point({x:50,z:TRACK.radius-2}));ctx.lineTo(...point({x:50,z:TRACK.radius+9}));ctx.stroke();ctx.font='bold 12px sans-serif';ctx.fillStyle='#698271';ctx.textAlign='center';ctx.fillText('400 m',cx,cy+4);
 for(const r of [...race.runners].reverse()){const[x,y]=point(trackPoint(r.distance,r.lane));ctx.beginPath();ctx.arc(x,y,r.id===0?6:4.5,0,Math.PI*2);ctx.fillStyle=r.color;ctx.fill();ctx.lineWidth=r.id===0?2.5:1;ctx.strokeStyle='#fffaf0';ctx.stroke();if(r.id===0){ctx.fillStyle='#244d3f';ctx.font='bold 11px sans-serif';ctx.fillText('你',x,y-10);}}
}
