import * as T from './vendor/three.module.min.js';
// One persistent mesh, two narrow tapered ribbons. Positions follow travel,
// independently of the tumbling character; never writes to physics or camera.
export class JetWake{
 constructor(parent){this.points=Array.from({length:18},()=>({x:0,y:0,z:0,age:1}));this.count=0;this.positions=new Float32Array(17*2*6*3);this.colors=new Float32Array(this.positions.length/3*4);const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(this.positions,3).setUsage(T.DynamicDrawUsage));g.setAttribute('color',new T.BufferAttribute(this.colors,4).setUsage(T.DynamicDrawUsage));g.setDrawRange(0,0);this.mesh=new T.Mesh(g,new T.MeshBasicMaterial({color:0xe4fff5,vertexColors:true,transparent:true,opacity:.44,depthWrite:false,side:T.DoubleSide}));this.mesh.name='jetAirflow';this.mesh.frustumCulled=false;this.mesh.visible=false;parent.add(this.mesh);}
 clear(){this.count=0;this.mesh.visible=false;this.mesh.geometry.setDrawRange(0,0);}
 update(dt,p,speed,enabled=true,reduced=false){
  if(!enabled||reduced||speed<24||!Number.isFinite(speed)){this.clear();return;}
  if(dt<=0)return;
  const last=this.points[0];if(this.count&&Math.hypot(p.x-last.x,p.y-last.y,p.z-last.z)>Math.min(6,speed*dt*2+.8))this.clear();
  for(let i=0;i<this.count;i++)this.points[i].age+=dt;
  while(this.count&&this.points[this.count-1].age>.23)this.count--;
  if(!this.count||Math.hypot(p.x-this.points[0].x,p.z-this.points[0].z)>.16){for(let i=Math.min(this.count,17);i>0;i--)Object.assign(this.points[i],this.points[i-1]);Object.assign(this.points[0],p,{age:0});this.count=Math.min(18,this.count+1);}
  let n=0;const intensity=Math.min(1,(speed-24)/20);for(let i=1;i<this.count-1;i++){const a=this.points[i],b=this.points[i+1],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<.01)continue;const nx=-dz/len,nz=dx/len,width=.09+.1*intensity,fade=Math.max(0,1-b.age/.23);for(const side of[-1,1]){const offset=side*(.8+i*.025);for(const [point,edge]of[[a,-1],[b,-1],[a,1],[a,1],[b,-1],[b,1]]){this.positions[n]=point.x+nx*(offset+edge*width*fade);this.positions[n+1]=Math.max(.35,point.y-.55);this.positions[n+2]=point.z+nz*(offset+edge*width*fade);const ci=n/3*4;this.colors[ci]=this.colors[ci+1]=this.colors[ci+2]=1;this.colors[ci+3]=fade;n+=3;}}}
  this.mesh.material.opacity=.26+.18*intensity;this.mesh.geometry.attributes.position.needsUpdate=true;this.mesh.geometry.attributes.color.needsUpdate=true;this.mesh.geometry.setDrawRange(0,n/3);this.mesh.visible=n>0;
 }
}
