import {OFFICE_PALETTE as C,OFFICE_SURFACES} from './office-palette.js';
export const DOOR=Object.freeze({navy:C.teal,cream:C.cream,brass:C.yellow,glass:OFFICE_SURFACES.glass});
export function buildDoor({T,g,box,cylinder,length,side}){
 g.name='officeDoor-'+side;
 for(const y of[.3,1.9])box(length,.22,.72,DOOR.cream,g,length/2,y,0);
 for(const x of[.13,length-.13])box(.26,1.6,.72,DOOR.navy,g,x,1.1,0);
 const glass=new T.Mesh(new T.BoxGeometry(length-.5,1.4,.12),new T.MeshBasicMaterial({color:DOOR.glass,transparent:true,opacity:.32,depthWrite:false}));glass.name='doorGlass';glass.position.set(length/2,1.1,0);g.add(glass);
 box(length-1,.09,.12,DOOR.brass,g,length/2,1.1,-.22);box(length-1,.09,.12,DOOR.brass,g,length/2,1.1,.22);
 for(const z of[-.31,.31])box(.12,.65,.16,DOOR.brass,g,length-1.1,1.1,z);
 cylinder(.48,2.1,DOOR.navy,g,0,1.05,0);for(const y of[.45,1.65])cylinder(.5,.17,DOOR.brass,g,0,y,0);
}
// Exact local corners shared with the fixed-camera envelope, independently
// checked against real Three.js mesh bounds in browser QA.
export const COMPANY_POINTS=[];
for(const side of[-1,1])for(const x of[-10.5,10.5])for(const y of[-1.7,1.7])for(const z of[-.16,.16])COMPANY_POINTS.push([x,2.4+Math.cos(.9)*y+Math.sin(.9)*z,-23.2+side*(.5-Math.sin(.9)*y+Math.cos(.9)*z)]);
for(const x of[-11,11])for(const z of[-24.7,-21.7])for(const y of[0,.22])COMPANY_POINTS.push([x,y,z]);
export function buildCompanySign({T,office,box,cylinder,label}){
 const g=new T.Group();g.name='companySign';g.userData.occlusionMode='keep';office.add(g);g.position.z=-23.2;
 box(22,.22,3,DOOR.navy,g,0,.11,0);
 for(const x of[-8.6,8.6]){box(.4,3,.5,DOOR.navy,g,x,1.5,0);cylinder(.52,.15,DOOR.brass,g,x,.3,0);}
 for(const side of[-1,1]){const face=new T.Group();face.position.set(0,2.4,side*.5);face.rotation.set(-side*.9,side===1?0:Math.PI,0);g.add(face);box(21,3.4,.25,DOOR.brass,face);box(20.6,3,.27,DOOR.navy,face);const m=label('不准加班公司',20,2.65,'#ffebad','#254c60');m.name='companyFace-'+side;m.position.z=.16;m.userData.occludes=false;face.add(m);}
 return g;
}
