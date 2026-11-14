import {successfulInteraction} from './interactions.js';
// Upper office devices keep effects local and reuse meshes throughout each finite scene.
export function buildSpecialStation({T,model,type,box,cylinder,label,C}){
 const front=(text,w,h,y)=>{const m=label(text,w,h,'#183a3c','#ffe3a0');m.rotation.y=Math.PI;m.position.set(0,y,-.96);m.userData.occludes=false;model.add(m);return m;};
 if(type==='shredder'){
  box(2.2,1.7,1.8,C.teal,model,0,.9,0);box(2.3,.35,1.9,C.ink,model,0,1.88,0);const intake=box(1.75,.18,.04,C.orange,model,0,1.36,-.93);intake.name='shredderIntake';front('薪資單',1.7,.65,.85).name='shredderSalaryLabel';
  const salary=new T.Group();salary.name='salaryStream';model.add(salary);for(let n=0;n<7;n++){const m=box(.17,.03,1.6,C.cream,salary,-.6+n*.2,1.36,-.95);m.rotation.x=.14*(n%2?1:-1);m.userData.occludes=false;}
  const badge=front('+2600',2.2,.65,2.8);badge.position.z=0;
  return (i)=>{const active=i?.activity==='shredder';salary.visible=!!active;salary.scale.z=active?1+(i.pulls||0)*.12+i.pullPulse:1;salary.position.y=active&&i.stage==='launch'&&successfulInteraction(i)?Math.sin(Math.min(1,i.launchElapsed/.55)*Math.PI)*1.8:0;salary.rotation.z=active?Math.sin(i.elapsed*12)*i.pullPulse*.5:0;};
 }
 box(1.9,3.1,1.7,C.ink,model,0,1.6,0);for(let n=0;n<4;n++){box(1.65,.52,.06,C.teal,model,0,.6+n*.62,-.88);for(const x of[-.5,-.2,.1])box(.12,.08,.03,C.yellow,model,x,.6+n*.62,-.93);}front('重開機',2,.6,3.55);
 const fan=new T.Group();fan.name='serverFan';fan.position.set(0,2,-1.02);model.add(fan);for(let n=0;n<4;n++){const m=box(.16,.8,.04,C.mint,fan,0,0,0);m.rotation.z=n*Math.PI/2;}const plug=box(.6,.35,.4,C.orange,model,0,1.3,-1.65);plug.name='powerPlug';
 const rings=[];for(let n=0;n<3;n++){const m=new T.Mesh(new T.TorusGeometry(.8,.045,6,24),new T.MeshBasicMaterial({color:C.yellow}));m.position.set(0,1.7,-1.4-n*.4);m.userData.occludes=false;model.add(m);rings.push(m);}
 const badge=front('+3000',2.2,.65,4.3);badge.position.z=0;
 return(i)=>{const active=i?.activity==='server';fan.rotation.z=active?i.elapsed*(3+i.charge*8):0;plug.position.z=-1.65-(active?Math.min(i.charge,2)*.2:0);for(let n=0;n<rings.length;n++){const m=rings[n];m.visible=!!active&&i.stage==='launch'&&successfulInteraction(i);m.scale.setScalar(1+(active?i.launchElapsed:0)*1.5);m.position.z=-1.4-n*.4-(active?i.launchElapsed:0)*3;}};
}
