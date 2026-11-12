import * as T from './vendor/three.module.min.js';
// Render-only cutaway. Collision geometry remains owned by physics.js.
export class ActorVisibility{
 constructor(meshes,{cutaway=true}={}){this.cutaway=cutaway;this.meshes=meshes;this.hidden=new Map();this.faded=new Map();this.lastTime=null;this.ray=new T.Raycaster();this.box=new T.Box3();this.center=new T.Vector3();this.last={blockedBefore:0,hidden:0,blockedAfter:0};}
 samplePoints(actor){this.box.setFromObject(actor);this.box.getCenter(this.center);const b=this.box,points=this.focusUpper?[]:[this.center.clone()];for(const x of [.15,.5,.85])for(const y of (this.focusUpper?[.65,.82,.98]:[.1,.5,.9]))points.push(new T.Vector3(b.min.x+(b.max.x-b.min.x)*x,b.min.y+(b.max.y-b.min.y)*y,this.center.z));return points;}
 protected(o){for(let p=o;p;p=p.parent)if(p===this.protectedRoot||p.userData.occlusionMode==='keep')return true;return false;}
 isVisible(o){for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;}
 cueOccluder(mesh){const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];return materials.some(m=>m&&(!m.transparent||m.opacity>=.5));}
 blockers(camera,points,includeProtected=false){const blocked=new Set();for(const target of points){const dir=target.clone().sub(camera.position),distance=dir.length();if(distance<.3)continue;this.ray.set(camera.position,dir.normalize());this.ray.near=.01;this.ray.far=Math.max(.01,distance-.28);for(const hit of this.ray.intersectObjects(this.meshes,false))if(this.isVisible(hit.object)&&(!includeProtected||this.cueOccluder(hit.object))&&(includeProtected||!this.protected(hit.object)))blocked.add(hit.object);}return blocked;}
 stationRoot(mesh){for(let p=mesh;p;p=p.parent)if(p.userData.stationId)return p;return null;}
 fadeState(root){let state=this.faded.get(root);if(state)return state;const parts=[];root.traverse(o=>{if(!o.material)return;const materials=Array.isArray(o.material)?o.material:[o.material],clones=materials.map(m=>m.clone());o.material=Array.isArray(o.material)?clones:clones[0];clones.forEach(m=>parts.push({m,opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite}));});state={root,parts,opacity:1,until:0};this.faded.set(root,state);return state;}
 update(camera,actor,time,enabled=true){const dt=this.lastTime===null?1/60:Math.max(0,Math.min(.1,time-this.lastTime));this.lastTime=time;
  if(!this.cutaway){const blocked=enabled?this.blockers(camera,this.samplePoints(actor),true).size:0;this.last={blockedBefore:blocked,hidden:0,faded:0,blockedAfter:blocked};return;}
  for(const [m,until] of this.hidden){if(!enabled||time>=until||this.protected(m)){m.visible=true;this.hidden.delete(m);}}
  const points=enabled?this.samplePoints(actor):[],blocking=enabled?this.blockers(camera,points):new Set();
  for(const mesh of blocking){const station=this.stationRoot(mesh);if(station){this.fadeState(station).until=time+.28;continue;}const m=mesh.userData.cutawayGroup||mesh;m.visible=false;this.hidden.set(m,time+.24);}
  let faded=0;for(const state of this.faded.values()){const target=enabled&&time<state.until&&!this.protected(state.root)?.4:1;state.opacity+=(target-state.opacity)*(1-Math.exp(-dt*8));if(Math.abs(state.opacity-target)<.002)state.opacity=target;if(state.opacity<.999)faded++;
   for(const part of state.parts){const translucent=state.opacity<.999,flag=translucent||part.transparent;if(part.m.transparent!==flag){part.m.transparent=flag;part.m.needsUpdate=true;}part.m.opacity=part.opacity*state.opacity;part.m.depthWrite=translucent?false:part.depthWrite;}
  }
  this.last={blockedBefore:blocking.size,hidden:this.hidden.size,faded,blockedAfter:enabled?this.blockers(camera,points).size:0};
 }
}
