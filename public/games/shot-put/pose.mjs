const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const link=(p,l,a)=>({x:p.x+l*Math.cos(a),y:p.y+l*Math.sin(a)});
// Two-link IK keeps the original .34/.32 arms; never stretches the art to reach a target.
function arm(p,i,target,bend=1){const dx=target.x-p.shoulder.x,dy=target.y-p.shoulder.y,d=clamp(Math.hypot(dx,dy),.020001,.659999),a=Math.atan2(dy,dx),off=Math.acos(clamp((.34**2+d*d-.32**2)/(2*.34*d),-1,1));p['elbow'+i]=link(p.shoulder,.34,a+bend*off);p['hand'+i]=link(p.shoulder,d,a);}
export function bodyPose(s){const j=s.j??[0,0,0,0],lean=s.lean??0,ca=Math.cos(lean),sa=Math.sin(lean);let p={hip:{x:0,y:0},shoulder:{x:0,y:.65},head:{x:0,y:1.01}};
 for(let i=0;i<2;i++){const a=(i===0?.28:-.28)+j[i]*.8,k=.12+j[i]*1.65;p['knee'+i]=link(p.hip,.55,-Math.PI/2+a);p['foot'+i]=link(p['knee'+i],.55,-Math.PI/2+a-k);}
 // Right ball hand stays beside neck, draws back as K tightens; left arm visibly opens for balance.
 arm(p,0,{x:.19-.21*j[3],y:.88-.08*j[3]},-1);
 arm(p,1,{x:.15+.48*j[2],y:.24+.39*j[2]},-1);
 p=Object.fromEntries(Object.entries(p).map(([k,v])=>[k,{x:(s.bodyX??0)+v.x*ca+v.y*sa,y:v.y*ca-v.x*sa}]));
 const floor=.12-Math.min(p.foot0.y,p.foot1.y);for(const v of Object.values(p))v.y+=floor;p.lean=lean;return p;
}
export function poseFor(s){if(!s.throwPose)return bodyPose(s);const p=structuredClone(s.throwPose),u=s.phase==='push'?clamp(s.clock/.28):1,t=u*u*(3-2*u),a=s.angle*Math.PI/180;
 const end=link(p.shoulder,.659999,a),from=s.throwPose.hand0;arm(p,0,{x:from.x+(end.x-from.x)*t,y:from.y+(end.y-from.y)*t},-1);
 // Recoil is a consequence of a backward release, not a random failure animation.
 if(['impact','done'].includes(s.phase)&&s.backward){const fall=s.phase==='done'?1:clamp(s.impact/1.1);const origin={...p.hip},angle=-.65*fall,c=Math.cos(angle),sn=Math.sin(angle);for(const v of Object.values(p))if(typeof v==='object'){const x=v.x-origin.x,y=v.y-origin.y;v.x=origin.x+x*c+y*sn-.22*fall;v.y=origin.y+y*c-x*sn;}const low=Math.min(...Object.entries(p).filter(([,v])=>typeof v==='object').map(([k,v])=>v.y-(k==='head'?.32:k==='hip'?.23:.12)));for(const v of Object.values(p))if(typeof v==='object')v.y-=low;p.lean+=angle;}
 return p;
}
export function ballPosition(s){if(['air','impact','done'].includes(s.phase))return{x:s.x+(s.launchX??0),y:s.y+.18};const p=poseFor(s);return{x:p.hand0.x+.02,y:p.hand0.y+.14};}
