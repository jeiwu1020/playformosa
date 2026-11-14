// Open rear office court: all branding lies below the traveller, in either view.
export function buildDispatchCourt({T,office,label,C,view}){
 const root=new T.Group();root.name='dispatchCourt';office.add(root);
 const floor=new T.Mesh(new T.PlaneGeometry(49,21),new T.MeshToonMaterial({color:0xa7bdae}));floor.rotation.x=-Math.PI/2;floor.position.set(0,.018,-25.5);floor.name='dispatchFloor';root.add(floor);
 for(const [text,z,w,h]of[['急件轉運區',-30,10,1.7]]){
  const m=label(text,w,h,'#183a3c','#f1dfb0');m.name='dispatch-'+text;m.position.set(0,.04,z);m.rotation.x=-Math.PI/2;m.rotation.z=view==='original'?Math.PI:0;m.userData.occludes=false;root.add(m);
 }
 // Floor hazard stripes delineate the dispatch court without a roof or billboard.
 for(const x of [-23.8,23.8])for(let z=-30;z<-18;z+=2){const m=new T.Mesh(new T.PlaneGeometry(.5,1.1),new T.MeshBasicMaterial({color:C.yellow,side:T.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.set(x,.04,z);root.add(m);}
 return root;
}
