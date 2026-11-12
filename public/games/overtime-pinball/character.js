import * as T from './vendor/three.module.min.js';
const C={ink:0x192c35,shirt:0xfff1cf,skin:0xf4bc8d,teal:0x3d8d85,pants:0x2f4354};
const ink=new T.MeshBasicMaterial({color:C.ink,side:T.BackSide});
function solid(geometry,color,parent,pos=[0,0,0],scale=[1,1,1]){const m=new T.Mesh(geometry,new T.MeshToonMaterial({color}));m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;parent.add(m);const edge=new T.Mesh(geometry,ink);edge.scale.setScalar(1.035);m.add(edge);return m;}
const cube=(w,h,d,c,p,pos)=>solid(new T.BoxGeometry(w,h,d),c,p,pos);
const oval=(x,y,z,c,p,pos)=>solid(new T.SphereGeometry(1,16,12),c,p,pos,[x,y,z]);
const limb=(r,l,c,p,pos)=>solid(new T.CapsuleGeometry(r,l,4,10),c,p,pos);
function joint(parent,name,pos){const g=new T.Group();g.name=name;g.position.set(...pos);parent.add(g);return g;}
function faceTexture(){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return {canvas,ctx:canvas.getContext('2d'),texture,last:''};}
function drawFace(f,expression){if(f.last===expression)return;f.last=expression;const c=f.ctx;c.clearRect(0,0,256,256);c.lineCap='round';c.lineJoin='round';c.strokeStyle='#19303a';c.fillStyle='#fff9e8';c.lineWidth=7;
 for(const x of [82,174]){c.beginPath();c.ellipse(x,94,27,expression==='smug'?12:24,0,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#19303a';if(expression==='dizzy'){c.beginPath();for(let i=0;i<40;i++){const a=i*.4,r=i*.35;c.lineTo(x+Math.cos(a)*r,94+Math.sin(a)*r);}c.stroke();}else{c.beginPath();c.ellipse(x+(expression==='panic'?3:0),96,8,expression==='smug'?7:14,0,0,Math.PI*2);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(x+3,91,3,0,7);c.fill();}c.fillStyle='#fff9e8';c.beginPath();c.moveTo(x-27,expression==='panic'?54:expression==='smug'?66:64);c.lineTo(x+22,expression==='panic'?65:expression==='smug'?56:69);c.stroke();c.lineWidth=3;c.beginPath();c.moveTo(x-21,128);c.lineTo(x+15,132);c.stroke();c.lineWidth=7;}
 c.fillStyle='#813d35';c.beginPath();if(expression==='panic'){c.ellipse(128,175,23,30,0,0,7);c.fill();c.stroke();c.fillStyle='#fff';c.fillRect(108,150,40,10);}else if(expression==='smug'){c.moveTo(102,167);c.quadraticCurveTo(132,194,159,160);c.stroke();}else if(expression==='puffed'){c.arc(128,172,10,0,7);c.fill();c.stroke();}else{c.moveTo(104,177);c.quadraticCurveTo(130,164,151,180);c.stroke();}
 c.strokeStyle='#b27660';c.lineWidth=2;for(let i=0;i<10;i++){const x=88+i*9;c.beginPath();c.moveTo(x,209-(i%3)*3);c.lineTo(x+2,215-(i%3)*3);c.stroke();}f.texture.needsUpdate=true;
}
export function createCharacter(boss=false){
 const root=new T.Group();root.name=boss?'bossActor':'workerActor';const body=joint(root,'torso',[0,0,0]),rig={body};
 oval(.5,.55,.32,boss?0x35576a:C.shirt,body,[0,.02,0]);cube(.82,.16,.58,C.pants,root,[0,-.47,0]);cube(.85,.07,.61,C.ink,root,[0,-.37,0]);cube(.13,.09,.04,0xc69a44,root,[0,-.37,-.33]);
 for(const sign of [-1,1]){const collar=cube(.26,.15,.05,0xfffbe8,body,[sign*.16,.4,-.26]);collar.rotation.z=sign*.5;}
 for(let i=0;i<3;i++)oval(.027,.027,.026,0x958772,body,[0,.15-i*.17,-.325]);
 const tie=joint(body,'looseTie',[.03,.27,-.36]);cube(.12,.4,.035,boss?0xe36c51:C.teal,tie,[0,-.18,0]);const tail=cube(.15,.13,.04,boss?0xe36c51:C.teal,tie,[0,-.42,0]);tail.rotation.z=.65;rig.tie=tie;
 for(const sign of [-1,1]){const strap=cube(.025,.43,.02,0x537285,body,[sign*.18,.1,-.34]);strap.rotation.z=sign*.35;}
 cube(.29,.34,.04,0xf3f4df,body,[.19,-.17,-.38]);cube(.23,.075,.045,C.teal,body,[.19,-.08,-.405]);oval(.046,.05,.025,C.skin,body,[.14,-.19,-.414]);cube(.07,.09,.025,0x6a9bad,body,[.14,-.27,-.414]);for(let i=0;i<3;i++)cube(.065,.015,.02,C.ink,body,[.23,-.18-i*.04,-.414]);
 const head=joint(body,'head',[0,1.01,0]);rig.head=head;oval(.47,.53,.4,boss?0xe0ad7a:C.skin,head);for(const s of [-1,1])oval(.1,.14,.09,C.skin,head,[s*.47,-.01,0]);
 oval(.49,.17,.42,C.ink,head,[0,.41,.03]);for(let i=0;i<4;i++){const hair=oval(.2,.12,.22,C.ink,head,[-.28+i*.16,.46+i*.025,-.12]);hair.rotation.z=-.3;}
 const f=faceTexture(),face=new T.Mesh(new T.PlaneGeometry(.8,.84),new T.MeshBasicMaterial({map:f.texture,transparent:true,depthWrite:false,side:T.DoubleSide}));face.rotation.y=Math.PI;face.position.set(0,-.015,-.407);head.add(face);rig.face=f;oval(.065,.08,.1,C.skin,head,[0,-.035,-.45]);
 if(!boss){for(const x of [-.145,.145]){const frame=new T.Mesh(new T.TorusGeometry(.104,.009,6,20),new T.MeshToonMaterial({color:C.ink}));frame.position.set(x,.095,-.428);head.add(frame);}cube(.09,.018,.025,C.ink,head,[0,.095,-.433]);}
 const sweat=joint(head,'sweat',[.52,.05,-.1]);oval(.045,.1,.045,0x77c4df,sweat);rig.sweat=sweat;
 for(const side of ['left','right']){const sign=side==='left'?-1:1;const shoulder=joint(body,side+'Shoulder',[sign*.48,.29,0]);limb(.135,.21,boss?0x35576a:C.shirt,shoulder,[0,-.18,0]);const elbow=joint(shoulder,side+'Elbow',[0,-.37,0]);limb(.105,.2,C.skin,elbow,[0,-.16,0]);cube(.22,.08,.23,C.shirt,elbow,[0,.01,0]);const hand=joint(elbow,side+'Hand',[0,-.36,0]);oval(.13,.13,.1,C.skin,hand);for(let k=0;k<3;k++)limb(.031,.06,C.skin,hand,[-.07+k*.06,-.1,-.03]);oval(.05,.08,.05,C.skin,hand,[sign*.12,0,-.02]);
  const hip=joint(root,side==='right'?'kickLeg':'backLeg',[sign*.23,-.48,0]);limb(.145,.17,C.pants,hip,[0,-.18,0]);const knee=joint(hip,side+'Knee',[0,-.35,0]);limb(.12,.13,C.pants,knee,[0,-.16,0]);const shoe=oval(.17,.115,.27,C.ink,knee,[0,-.39,-.08]);shoe.name=side+'Shoe';cube(.29,.035,.43,0x9fa9a0,knee,[0,-.48,-.07]);for(let k=0;k<3;k++)cube(.19,.012,.02,0xe9dfbe,knee,[0,-.31,-.13-k*.05]);rig[side]={shoulder,elbow,hand,hip,knee};
 }
 const rag=cube(.4,.045,.33,0x91c8b4,rig.left.hand,[0,-.15,-.06]);rag.name='cleaningRag';rig.rag=rag;
 const cup=solid(new T.CylinderGeometry(.12,.1,.28,12),0xf4d274,rig.right.hand,[0,-.15,-.13]);cup.name='waterCup';rig.cup=cup;
 const paper=cube(.47,.02,.65,0xfff2d7,rig.left.hand,[0,-.12,-.2]);paper.name='reportPaper';rig.paper=paper;
 const lunch=cube(.55,.2,.4,0xd9ad72,rig.right.hand,[0,-.1,-.22]);rig.lunch=lunch;const parcel=cube(1.05,.85,.8,0xc7a06d,body,[0,0,-.07]);rig.parcel=parcel;cube(.12,.88,.83,0xf0d27d,parcel,[0,0,0]);root.userData.rig=rig;poseCharacter(root,{time:0,activity:'idle'});return root;
}
export function poseCharacter(root,{time=0,activity='flight',progress=0,impact=false}={}){
 const r=root.userData.rig;if(!r)return;const wave=Math.sin(time*14);r.body.rotation.set(0,0,0);r.body.position.y=0;r.head.rotation.set(0,0,0);r.tie.rotation.set(Math.sin(time*7)*.15,0,Math.sin(time*5)*.08);r.lunch.visible=false;r.parcel.visible=false;r.rag.visible=false;r.cup.visible=false;r.paper.visible=false;
 for(const [side,sign] of [['left',-1],['right',1]]){const a=r[side];a.shoulder.rotation.set(0,0,sign*.22);a.elbow.rotation.set(.12,0,0);a.hand.rotation.set(0,0,0);a.hip.rotation.set(0,0,sign*.08);a.knee.rotation.set(.1,0,0);}
 let expression='tired';
 if(activity==='flight'){expression=impact?'panic':'tired';r.left.shoulder.rotation.z=-.8-.25*wave;r.right.shoulder.rotation.z=.8+.3*Math.cos(time*12);r.left.elbow.rotation.x=.5+wave*.3;r.right.elbow.rotation.x=.5-wave*.3;r.left.hip.rotation.x=Math.sin(time*9)*.3;r.right.hip.rotation.x=-Math.sin(time*9)*.3;}
 if(activity==='launcher'){expression='panic';r.body.rotation.z=Math.sin(time*5)*.12;r.left.shoulder.rotation.z=-1.15;r.right.shoulder.rotation.z=1.15;r.left.elbow.rotation.x=.7;r.right.elbow.rotation.x=.7;r.head.rotation.y=Math.sin(time*3)*.5;}
 if(activity==='busy'){expression=progress>.7?'smug':'panic';r.body.rotation.x=-.16;for(const side of ['left','right']){const s=side==='left'?1:-1,a=r[side];a.shoulder.rotation.set(1.35+s*wave*.15,0,s*-.12);a.elbow.rotation.x=-.25;a.hand.rotation.x=.25+s*wave*.3;a.hip.rotation.x=1.45;a.knee.rotation.x=-1.35;}r.head.rotation.y=progress>.35?2.3:Math.sin(time*4)*.05;}
 if(activity==='coffee'){expression='panic';r.body.rotation.x=-.72;r.body.position.y=-.25;r.left.shoulder.rotation.set(1.35+wave*.1,0,-.05+Math.sin(time*10)*.35);r.left.elbow.rotation.x=0;r.right.shoulder.rotation.x=.2;for(const side of ['left','right']){r[side].hip.rotation.x=1.3;r[side].knee.rotation.x=-2.1;}r.rag.visible=true;r.head.rotation.x=.2;r.head.rotation.y=progress>.35?2.3:0;}
 if(activity==='copier'||activity==='shredder'){expression=progress>.65?'panic':'tired';r.body.rotation.x=-.12-Math.abs(Math.sin(time*5))*.2;for(const side of ['left','right']){r[side].shoulder.rotation.x=1.35+Math.sin(time*5)*.2;r[side].elbow.rotation.x=-.25;r[side].hip.rotation.x=-.1;}r.paper.visible=true;r.head.rotation.z=Math.sin(time*5)*.1;r.head.rotation.y=progress>.35?2.3:0;}
 if(activity==='water'){expression=progress>.5?'puffed':'smug';r.right.shoulder.rotation.x=1.55;r.right.elbow.rotation.x=.5;r.cup.visible=true;r.head.rotation.x=-.15;r.head.rotation.y=progress>.4?2.3:0; r.body.scale.x=1+Math.max(0,progress-.4)*.25;}
 else r.body.scale.x=1;
 if(activity==='chair'){expression=progress>.77?'dizzy':'smug';for(const side of ['left','right']){const a=r[side];a.shoulder.rotation.x=.6;a.elbow.rotation.x=.3;a.hip.rotation.x=1.45;a.knee.rotation.x=-1.35;}r.head.rotation.z=Math.sin(time*9)*.16;}
 if(activity==='server'){expression=progress>.65?'panic':'smug';r.body.rotation.x=.25;for(const side of ['left','right']){r[side].shoulder.rotation.x=1.4;r[side].elbow.rotation.x=-.4;r[side].hip.rotation.x=-.18;}r.head.rotation.z=Math.sin(time*20)*.09;}
 if(activity==='clock'){expression=progress>.6?'smug':'panic';r.paper.visible=true;r.left.shoulder.rotation.x=1.3;r.right.shoulder.rotation.x=1.5+wave*.5;r.right.elbow.rotation.x=-.4;r.head.rotation.y=progress>.3?2.3:0;r.body.rotation.x=-Math.abs(wave)*.15;}
 if(activity==='microwave'){expression=progress>.7?'panic':'puffed';r.lunch.visible=progress>.5;r.right.shoulder.rotation.x=1.5;r.right.elbow.rotation.x=.3;r.left.shoulder.rotation.x=1.3+wave*.3;r.head.rotation.y=progress>.4?2.3:0;r.head.rotation.z=wave*.08;}
 if(activity==='parcel'){expression='panic';r.parcel.visible=progress>.2;for(const side of['left','right']){r[side].shoulder.rotation.x=1.4+(side==='left'?wave:-wave)*.4;r[side].elbow.rotation.x=-.2;}r.head.rotation.y=progress>.3?2.3:0;r.body.rotation.z=wave*.1;}
 if(activity==='boss'){expression='panic';r.head.rotation.y=progress>.35?2.3:0;r.paper.visible=true;r.left.shoulder.rotation.x=1.3;r.right.shoulder.rotation.x=1.1;r.body.rotation.x=.25;}
 r.sweat.visible=['panic','puffed','dizzy'].includes(expression);r.sweat.position.y=.05+Math.sin(time*5)*.04;drawFace(r.face,expression);root.userData.expression=expression;
}
