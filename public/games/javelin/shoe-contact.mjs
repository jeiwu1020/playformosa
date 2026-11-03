// Track top=.045; contact tolerance=.010m. White line inner edge=-.07m.
// Same sole ellipsoid and ankle rotation as character3d.mjs; no arm/body envelope.
export const SOLE={x:.025,y:-.077,rx:.18,ry:.022,rz:.104},GROUND_TOLERANCE=.055;
export function shoeSolePoints(pose,i){const foot=pose.points['foot'+i],knee=pose.points['knee'+i],a=Math.atan2(foot.x-knee.x,knee.y-foot.y),c=Math.cos(a),s=Math.sin(a);return Array.from({length:64},(_,n)=>{const t=n*Math.PI/32,x=SOLE.x+SOLE.rx*Math.cos(t),y=SOLE.y+SOLE.ry*Math.sin(t);return{x:foot.x+x*c-y*s,y:foot.y+x*s+y*c}});}
export function groundContacts(pose){return[0,1].flatMap(i=>shoeSolePoints(pose,i).filter(p=>p.y<=GROUND_TOLERANCE).map(p=>({...p,foot:i})));}
export function crossedLine(pose,line=0){return groundContacts(pose).find(p=>p.x>=line)??null;}
