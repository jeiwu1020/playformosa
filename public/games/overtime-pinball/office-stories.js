import {clockCue} from './clock-cue.js';
// Each themed station retains its existing circular collision footprint.
export function buildOfficeStory({T,model,type,box,cylinder,label,C}){
 const plate=(text,w,h,x,y,z,bg='#f5dfb2')=>{const m=label(text,w,h,'#173b49',bg);m.rotation.y=Math.PI;m.position.set(x,y,z);model.add(m);return m;};
 if(type==='clock'){
  box(2.5,.3,1.6,0x254c60,model,0,.15,0);box(1.8,2.7,1.2,C.cream,model,0,1.55,0);box(1.5,.55,.08,C.ink,model,0,2.3,-.65);plate('18:00',1.4,.5,0,2.3,-.7,'#b7e5cb');plate('下班打卡',1.85,.55,0,3.2,-.1);
  box(1.1,.1,.5,C.ink,model,0,1.5,-.8);const ticket=box(.65,.03,.9,C.cream,model,0,1.6,-1.02),hammer=box(.8,.35,.6,C.orange,model,0,1.95,-.8);
  const lamps=[-1,0,1].map(x=>cylinder(.16,.12,C.yellow,model,x*.48,2.83,-.1));
  lamps.forEach(m=>m.material=m.material.clone());return(i,t)=>{ticket.position.z=-1.02-(i?.pulls||0)*.08;hammer.position.y=1.95-(i?.pullPulse||0)*1.3;lamps.forEach((m,n)=>{m.material.color.setHex(n<(i?.pulls||0)?0x64e5b0:i&&n===i.pulls&&clockCue(i).lit?0xffed95:0xd3b879);});};
 }
 if(type==='microwave'){
  box(2.3,1.4,1.6,0x254c60,model,0,.7,0);box(2.4,1.2,1.6,C.cream,model,0,2,0);box(1.65,.85,.06,C.ink,model,-.25,2,-.83);
  const tray=new T.Group();tray.position.set(-.25,1.69,-.65);model.add(tray);cylinder(.55,.07,C.cream,tray);box(.7,.18,.55,0xe8b174,tray,0,.12,0);for(let n=0;n<3;n++)cylinder(.1,.1,0x76a969,tray,n*.18-.18,.25,0);
  const lamp=box(.22,.5,.08,C.orange,model,.95,2,-.85);plate('便當急救',2.4,.6,0,2.95,-.05);const steam=[];for(let n=0;n<5;n++){const m=new T.Mesh(new T.SphereGeometry(.18,8,6),new T.MeshBasicMaterial({color:0xffeac6,transparent:true,opacity:.45,depthWrite:false}));model.add(m);steam.push(m);}
  lamp.material=lamp.material.clone();return(i,t)=>{tray.rotation.y=i?(i.charge||0)*8:0;lamp.material.color.setHex(i?.charge>=1.2&&i.charge<=2?0x70e8a9:i?.charge>2?0xf17a59:0x355267);steam.forEach((m,n)=>{m.visible=!!i&&i.charge>.7;m.position.set(Math.sin(n+t*2)*.3,2.6+((t+n*.2)%1)*1.5,-.6);});};
 }
 // Compact packing bench: alternating tape strokes, then the box launches open.
 box(2.6,.18,1.6,0xc9a474,model,0,1.3,0);for(const x of[-1,1])box(.18,1.3,1.2,0x254c60,model,x,.65,0);
 const pack=new T.Group();pack.position.y=1.45;model.add(pack);box(1.15,.8,1,0xc5a16c,pack,0,.4,0);const lid=box(1.2,.06,1.05,C.cream,pack,0,.83,0);
 const tapes=[];for(let n=0;n<6;n++)tapes.push(box(.12,.025,1.08,n%2?C.teal:C.yellow,pack,(n-2.5)*.18,.875,0));
 const roll=cylinder(.28,.2,C.yellow,model,1,1.65,0);// Name is now a separate screen-facing label, clear of route arrows.
 return(i,t)=>{tapes.forEach((m,n)=>m.visible=n<(i?.pulls||0));roll.rotation.z=(i?.pulls||0)*.8+(i?.pullPulse||0)*2;lid.rotation.x=i?.stage==='launch'?Math.sin(i.launchElapsed/.55*Math.PI)*1.4:0;pack.position.y=1.45+(i?.pullPulse||0)*.3;};
}
