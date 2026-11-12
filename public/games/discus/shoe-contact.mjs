import{worldPosePoint}from'./pose.mjs';
// Same equatorial vertices as the original rendered 16-segment sole mesh.
export const SOLE=Object.freeze({x:.025,y:-.077,z:0,rx:.18,ry:.022,rz:.104,segments:16});
const outline=Array.from({length:SOLE.segments},(_,i)=>({x:SOLE.x-SOLE.rx*Math.cos(i*Math.PI*2/SOLE.segments),z:SOLE.rz*Math.sin(i*Math.PI*2/SOLE.segments)}));
export function soleCrossing(pose,side,radius=2){const foot=worldPosePoint(pose,'foot'+side,side);if(foot.y>.121)return null;const c=Math.cos(pose.yaw),sn=Math.sin(pose.yaw);let furthest=radius*radius,hit=null;for(const p of outline){const x=foot.x+p.x*c+p.z*sn,z=foot.z-p.x*sn+p.z*c,r=x*x+z*z;if(r>furthest){furthest=r;hit={x,y:.09,z,side};}}return hit;}
