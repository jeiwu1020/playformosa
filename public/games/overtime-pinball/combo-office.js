import {COMBO_ROUTES} from './combo-routes.js';import{LAYOUT}from'./route-layout.js';
export function buildComboOffice({T,office,label,view}){
 const root=new T.Group();root.name='comboRoutes';office.add(root);const paths={};
 for(const[id,from,to,color]of[['paper',LAYOUT.copier,LAYOUT.shredder,0xffe7a0],['coffee',LAYOUT.desk2,LAYOUT.chair,0xa16c43]]){
  const group=new T.Group();root.add(group);const dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz),mid=COMBO_ROUTES[id].checkpoint;
  const lane=new T.Mesh(new T.PlaneGeometry(id==='paper'?2.4:2.8,length-3),new T.MeshBasicMaterial({color,transparent:true,opacity:.4,depthWrite:false,side:T.DoubleSide}));lane.rotation.set(-Math.PI/2,0,Math.atan2(dx,-dz));lane.position.set(-(from.x+to.x)/2,.075,(from.z+to.z)/2);group.add(lane);
  for(let n=1;n<6;n++){const t=n/6,m=new T.Mesh(new T.PlaneGeometry(.65,id==='paper'?.85:.35),new T.MeshBasicMaterial({color:id==='paper'?0xfff6d9:0xe5b981,side:T.DoubleSide}));m.rotation.x=-Math.PI/2;m.rotation.z=Math.atan2(dx,-dz);m.position.set(-(from.x+dx*t),.09,from.z+dz*t);group.add(m);}
  const text=label(id==='paper'?'報表 → 碎紙':'咖啡 → 轉椅',5,1.1,'#193b3d',id==='paper'?'#f3dda1':'#e7c49e');text.rotation.x=-Math.PI/2;text.rotation.z=view==='reverse'?0:Math.PI;text.position.set(-mid.x+(id==='paper'?4:-3.2),.11,mid.z);text.userData.occludes=false;group.add(text);paths[id]={lane,text};
 }
 return{root,update(game){for(const[id,p]of Object.entries(paths)){const active=game.comboRoutes.active?.id===id;p.lane.material.opacity=active?.65:.28;p.text.material.color.setHex(active?0xffffff:0xc6d4c4);}}};
}
