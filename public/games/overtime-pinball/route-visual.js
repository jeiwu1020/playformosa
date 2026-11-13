import {SHORT_PATH,MAIL_BRANCHES} from './office-routes.js';
/** Paint and lights only: uses the exact physical polylines, never a second path. */
export function createRouteVisuals(T,{office,mapX=x=>-x}={}){
 const root=new T.Group();root.name='overtimeRouteLights';office.add(root);
 const geometries=[],materials=[],tracks=[];
 const color={idle:0x80968c,gold:0xffdb7b,cyan:0xa1e5dc};
 function path(points,name,tint){
  const positions=[];for(let i=1;i<points.length;i++)positions.push(mapX(points[i-1].x),.09,points[i-1].z,mapX(points[i].x),.09,points[i].z);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometries.push(g);
  const m=new T.LineBasicMaterial({color:color.idle});materials.push(m);const line=new T.LineSegments(g,m);line.name=name+'-guide';root.add(line);
  // Small embedded lamps follow the route, rather than tall opaque rail walls.
  const count=Math.min(32,Math.max(8,points.length)),geo=new T.CylinderGeometry(.17,.17,.04,6),mat=new T.MeshBasicMaterial({color:0xffffff});geometries.push(geo);materials.push(mat);
  const lamps=new T.InstancedMesh(geo,mat,count),dummy=new T.Object3D(),c=new T.Color();lamps.name=name+'-lamps';root.add(lamps);
  for(let i=0;i<count;i++){const p=points[Math.round(i/(count-1)*(points.length-1))];dummy.position.set(mapX(p.x),.11,p.z);dummy.updateMatrix();lamps.setMatrixAt(i,dummy.matrix);lamps.setColorAt(i,c.setHex(color.idle));}lamps.instanceMatrix.needsUpdate=true;
  const last=points.at(-1),prev=points.at(-2),dx=mapX(last.x)-mapX(prev.x),dz=last.z-prev.z,angle=Math.atan2(dx,dz);
  const ag=new T.BufferGeometry().setFromPoints([new T.Vector3(-.55,0,-.65),new T.Vector3(0,0,0),new T.Vector3(.55,0,-.65)]);geometries.push(ag);const am=new T.LineBasicMaterial({color:tint});materials.push(am);const arrow=new T.Line(ag,am);arrow.position.set(mapX(last.x),.10,last.z);arrow.rotation.y=angle;root.add(arrow);
  const record={line,lamps,arrow,count,tint,c};tracks.push(record);return record;
 }
 const loop=path(SHORT_PATH,'short-overtime-loop',color.gold),branches={};for(const side of ['left','right'])branches[side]=path(MAIL_BRANCHES[side].path,'mail-branch-'+side,color.cyan);
 let disposed=false;
 function light(track,active,selected,time){
  const frame=active&&!selected?Math.floor(time*12)%track.count:-1,key=`${!!active}:${!!selected}:${frame}`;if(track.lastLightKey===key)return;track.lastLightKey=key;
  track.line.material.color.setHex(selected?track.tint:color.idle);track.arrow.material.color.setHex(active?track.tint:color.idle);
  for(let i=0;i<track.count;i++){const chase=(i-Math.floor(time*12)+track.count*1000)%track.count<3;track.lamps.setColorAt(i,track.c.setHex(selected||active&&chase?track.tint:color.idle));}track.lamps.instanceColor.needsUpdate=true;
 }
 return {root,tracks,update(game,time=0){if(disposed)return;time=Number.isFinite(time)?time:0;const run=game.mailRun;light(loop,!!game.shortRun,false,time);for(const side of ['left','right'])light(branches[side],!!run?.choiceOpen||run?.branch?.side===side,!!run&&(run.choice===side||run.branch?.side===side),time);},dispose(){if(disposed)return;disposed=true;root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
