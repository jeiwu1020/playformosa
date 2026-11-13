import {ASSISTS} from './assist-machines.js';
export function buildAssists({T,office,box,cylinder,label,C,view}){
 const models={};
 for(const[id,o]of Object.entries(ASSISTS)){
  const root=new T.Group();root.name='assist-'+id;root.userData.stationId=root.name;root.position.set(-o.x,0,o.z);office.add(root);
  const moving=new T.Group();root.add(moving);let tray;
  if(id==='center'){
   cylinder(o.r+.12,.08,C.ink,root,0,.04,0);cylinder(o.r,.18,C.yellow,moving,0,.13,0);cylinder(.38,1.2,C.teal,moving,0,-.5,0);
   for(let n=0;n<4;n++)box(.9,.06,.65,C.cream,moving,0,.25+n*.07,0);
  }else{
   box(o.hx*2,2.6,o.hz*2,o.upper?C.orange:C.teal,root,0,1.3,0);box(.16,1.05,o.hz*2-.2,C.ink,root,-o.inward*o.hx,1.6,0);
   tray=box(o.extension,.65,o.hz*2-.2,C.cream,moving,o.inward*o.extension/2,1.5,0);box(.15,1.05,o.hz*2,C.orange,moving,0,1.6,0);
   box(.15,.18,.8,C.ink,moving,-o.inward*.12,1.7,0);
   for(let n=0;n<3;n++)box(1.2,.08,.9,C.cream,moving,o.inward*.8,1.9+n*.1,0);
  }
  const inputSide=o.inputSide||id,screenSide=(view==='reverse'?inputSide==='right':inputSide==='left')?'L':'R';
  const text=label(id==='center'?'L / R 彈公文':screenSide+(o.upper?' 上段轉送':' 退件'),id==='center'?3.4:3, .85,'#17383b','#f4d470');text.position.set(0,id==='center'?.42:3.1,0);text.rotation.x=-Math.PI/2;text.rotation.z=view==='reverse'?0:Math.PI;text.userData.occludes=false;root.add(text);
  const light=box(id==='center'?2.2:1.6,.1,.18,C.yellow,root,0,id==='center'?.12:2.68,.85);light.userData.occludes=false;
  let halo;if(id==='center'){halo=new T.Mesh(new T.RingGeometry(o.r+.2,o.r+.48,32),new T.MeshBasicMaterial({color:0xfff3ab,side:T.DoubleSide,transparent:true,opacity:.9,depthWrite:false}));halo.rotation.x=-Math.PI/2;halo.position.y=.045;halo.visible=false;root.add(halo);}
  models[id]={root,moving,light,text,tray,halo};
 }
 return{models,update(game){for(const[id,m]of Object.entries(models)){const s=game.assists[id],o=ASSISTS[id];if(id==='center'){const i=game.interaction?.activity==='launcher'?game.interaction:null,lift=i?Math.min(1,i.elapsed/.35):0;m.moving.position.y=lift*1.2;m.text.position.y=.42+lift*1.2;m.halo.visible=!!game.central.available&&!i;m.root.userData.ready=!!game.central.available;m.light.scale.z=game.central.available?5:1;m.light.visible=!!i||game.central.available;}else{m.moving.position.x=-o.inward*(o.hx+o.extension*s.amount);m.tray.scale.x=Math.max(.001,s.amount);m.tray.position.x=o.inward*o.extension*s.amount/2;}m.light.scale.x=Math.max(.08,Math.min(1,1-((id==='center'?(game.stationReady.launcher||0):s.nextReady)-game.time)/(id==='center'?4:o.cooldown)));}}};
}
