const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function bossVisualState(g){
 const b=g.bossPatrol,e=g.round.ending,active=['patrol','chase','kick'].includes(b.phase),dx=b.x-b.previousX,dz=b.z-b.previousZ;
 const kick=e?.kicked?Math.sin(clamp((e.elapsed-1.15)/.5,0,1)*Math.PI):Math.max(0,(b.kickUntil-(g.playClock??g.time))/.45);
 return {x:-b.x,z:b.z,active,warning:b.phase==='warning',yaw:Math.hypot(dx,dz)>.00001?Math.atan2(-dx,dz):null,height:b.phase==='chase'&&e?Math.sin(clamp(e.elapsed/1.15,0,1)*Math.PI)*4:0,kick,walk:b.phase==='patrol'?Math.sin((g.playClock??g.time)*13)*.5:0};
}
