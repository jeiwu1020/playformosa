// Render-only joint adapter. Race physics, AI, timing and chest crossing stay in race.mjs.
const mix=(a,b,t)=>a+(b-a)*t;
export function prepared(race){return race.phase==='set'||race.phase==='race'||race.phase==='done'||race.runners[0].held[2]&&race.runners[0].held[3];}
export function sprintPose(r,time=0,phase='ready',isPrepared=r.held[2]&&r.held[3]||phase==='set'||phase==='race'){
 const crouch=!r.started&&isPrepared,lean=crouch?1.02:r.fall>0?1.2:r.lean*.67+(r.imbalance>.55?Math.sin(time*15)*.13:.07);
 const hip={x:r.x,y:crouch?.48:1.12+(r.v>1?Math.sin(time*22)*.025:0)};
 const shoulder={x:hip.x+Math.sin(lean)*.65,y:hip.y+Math.cos(lean)*.65};
 const head={x:hip.x+Math.sin(lean)*.98,y:hip.y+Math.cos(lean)*.98};
 const p={hip,shoulder,head};
 for(let i=0;i<2;i++){
  const s=i?1:-1,phase=time*19+r.id*1.4+i*Math.PI;
  if(crouch){p['knee'+i]={x:r.x+(i?-.32:.40),y:i?.15:.32};p['foot'+i]={x:r.x+(i?-.95:-.05),y:.11};p['elbow'+i]={x:shoulder.x+.12,y:.35};p['hand'+i]={x:shoulder.x+.31,y:.105};}
  else{const swing=r.v>1?Math.sin(phase):0;const lift=r.v>1?Math.max(0,Math.cos(phase))*.32:0;
   p['knee'+i]={x:r.x+swing*.35,y:.64+lift*.25};p['foot'+i]={x:r.x+swing*.57,y:.11+lift};
   const activeArm=time-r.lastArm<.7,arm=activeArm?Math.sin(phase+Math.PI)*.34:Math.sin(phase+Math.PI)*.10;
   const elbow={x:shoulder.x+(r.lean>.2?-.36:arm),y:shoulder.y-.27};p['elbow'+i]=elbow;p['hand'+i]={x:elbow.x+(r.lean>.2?-.22:.25),y:elbow.y+(r.lean>.2?-.18:.20)};
  }
 }
 if(r.fall>0){const amount=Math.min(1,r.fall/.32);for(const k in p){const q=p[k],dx=q.x-r.x,dy=q.y-1.12;const target={x:r.x+dx*.35+dy*.88,y:.30-dx*.45+dy*.15};q.x=mix(q.x,target.x,amount);q.y=Math.max(.09,mix(q.y,target.y,amount));}}
 if(r.runoutAge>1.2){const breathe=Math.sin((r.runoutAge-1.2)*5)*.014*Math.min(1,r.runoutAge-1.2);p.shoulder.y+=breathe;p.head.y+=breathe;const settle=Math.min(1,(r.runoutAge-1.2)/.6);for(let i=0;i<2;i++){p['elbow'+i].y=mix(p['elbow'+i].y,p.shoulder.y-.35,settle);p['hand'+i].y=mix(p['hand'+i].y,p.shoulder.y-.60,settle);}}
 return{points:p,state:{lean,phase:r.finished!==null?'done':r.fall>0?'land':'run'}};
}
export function viewport(width,height,playerX){const aspect=width/Math.max(1,height),viewHeight=aspect<.8?13:aspect<1.2?10:8.2;return{viewHeight,viewWidth:viewHeight*aspect,targetX:Math.max(.65,playerX+(aspect<.8?.5:2)),targetY:.8};}

// Lower broadcast view, still elevated enough to separate the four lanes.
export const cameraOffset={x:2,y:13,z:18};
