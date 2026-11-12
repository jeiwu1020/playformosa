export const DOOR={navy:0x254c60,cream:0xf2e3c3,brass:0xd5b568,glass:0x7ac8cf};
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
for(const side of[-1,1])for(const x of[-9.5,9.5])for(const y of[-1.45,1.45])for(const z of[-.16,.16])COMPANY_POINTS.push([x,2.6+Math.cos(.9)*y+Math.sin(.9)*z,-34.5+side*(1.25-Math.sin(.9)*y+Math.cos(.9)*z)]);
for(const x of[-10,10])for(const z of[-37.2,-31.8])for(const y of[0,.22])COMPANY_POINTS.push([x,y,z]);
export function buildCompanySign({T,office,box,cylinder,label}){
 const g=new T.Group();g.name='companySign';g.userData.occlusionMode='keep';office.add(g);g.position.z=-34.5;
 box(20,.22,5.4,DOOR.navy,g,0,.11,0);
 for(const x of[-8.6,8.6]){box(.4,3.5,.5,DOOR.navy,g,x,1.75,0);cylinder(.52,.15,DOOR.brass,g,x,.3,0);}
 for(const side of[-1,1]){const face=new T.Group();face.position.set(0,2.6,side*1.25);face.rotation.set(-side*.9,side===1?0:Math.PI,0);g.add(face);box(19,2.9,.25,DOOR.brass,face);box(18.6,2.5,.27,DOOR.navy,face);const m=label('不准加班公司',18,2.1,'#ffebad','#254c60');m.name='companyFace-'+side;m.position.z=.16;m.userData.occludes=false;face.add(m);}
 return g;
}
