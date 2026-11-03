const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
// Rig endpoints, in world metres. Left index 0 is A/J, right index 1 is S/K.
export function javelinPose(s){
 const age=s.releaseTime==null?-1:Math.max(0,s.time-s.releaseTime),brace=s.recoveryTime==null&&s.braceTime!=null&&age<.45,draw=clamp((s.draw||0)/.8,0,1),moving=s.v>.2;
 const settling=s.recoveryTime!=null?clamp((s.time-s.recoveryTime)/.8,0,1):0;
 const lean=(brace||age>=0&&age<.45?0:moving?.08:0)+clamp(s.balanceRoll||0,-.35,.35);
 const hip={x:s.x,y:1.10+(moving&&!brace?Math.sin(s.time*18)*.018:0)},shoulder={x:s.x+Math.sin(lean)*.65,y:hip.y+Math.cos(lean)*.65},head={x:s.x+Math.sin(lean)*.98,y:hip.y+Math.cos(lean)*.98};
 const p={hip,shoulder,head};
 for(let i=0;i<2;i++){
  const phase=(s.time-(s.lastStep??0))*Math.PI/.32+(s.lastLeg==='s'?Math.PI:0)+i*Math.PI,swing=moving?Math.cos(phase):0,lift=moving?Math.max(0,Math.sin(phase))*.22:0;
  p['foot'+i]={x:s.x+swing*.44,y:.11+lift};p['knee'+i]={x:s.x+swing*.23,y:.62+lift*.3};
  const arm=moving?Math.sin(phase+Math.PI)*.23:0;p['elbow'+i]={x:shoulder.x+arm,y:shoulder.y-.30};p['hand'+i]={x:shoulder.x+arm+.18,y:shoulder.y-.45};
 }
 if(brace){p.foot0={x:s.x+.45,y:.11};p.knee0={x:s.x+.26,y:.60};p.foot1={x:s.x-.48,y:.11};p.knee1={x:s.x-.31,y:.61};p.elbow0={x:shoulder.x+.26,y:shoulder.y-.12};p.hand0={x:shoulder.x+.46,y:shoulder.y-.30};}
 // A short tap survives key-up visibly; a held J stays extended without extra force.
 const leftArm=Math.max(clamp(s.jPulse||0,0,1),s.held?.j ? .72 : 0);
 if(leftArm>0){const elbow={x:shoulder.x+.24,y:shoulder.y+.04},hand={x:shoulder.x+.55,y:shoulder.y+.10};p.elbow0={x:mix(p.elbow0.x,elbow.x,leftArm),y:mix(p.elbow0.y,elbow.y,leftArm)};p.hand0={x:mix(p.hand0.x,hand.x,leftArm),y:mix(p.hand0.y,hand.y,leftArm)};}
 // Continuous right-arm draw -> overhead drive -> follow-through, no detached prop.
 const progress=age<0?(brace?clamp((s.time-s.braceTime)/.5,0,1):0):1;
 let a=mix(1.28,2.75,draw);if(brace||age>=0&&age<.45)a=mix(2.75,.7,progress);
 if(age>=0)a=mix(.7,-1.1,clamp(age/.55,0,1));
 if(age<0||age<.7){p.elbow1={x:shoulder.x+Math.cos(a)*.32,y:shoulder.y+Math.sin(a)*.32};p.hand1={x:p.elbow1.x+Math.cos(a-.25)*.30,y:p.elbow1.y+Math.sin(a-.25)*.30};}
 if((brace&&s.time-s.braceTime>.12)||(age>=0&&age<.10)){const angle=s.launch?.angle??s.armAngle??.55;const t=age>=0?1:clamp((s.time-s.braceTime-.12)/.12,0,1);const hx=s.x+.5*Math.cos(angle),hy=1.75+.5*Math.sin(angle);p.hand1={x:mix(p.hand1.x,hx,t),y:mix(p.hand1.y,hy,t)};p.elbow1={x:mix(p.elbow1.x,s.x+.22*Math.cos(angle)-.13*Math.sin(angle),t),y:mix(p.elbow1.y,1.75+.22*Math.sin(angle)+.13*Math.cos(angle),t)};}
 if(settling>0){for(let i=0;i<2;i++){p['elbow'+i]={x:mix(p['elbow'+i].x,shoulder.x+.08,settling),y:mix(p['elbow'+i].y,shoulder.y-.28,settling)};p['hand'+i]={x:mix(p['hand'+i].x,shoulder.x+.16,settling),y:mix(p['hand'+i].y,shoulder.y-.52,settling)};}}
 return{points:p,state:{lean,phase:s.phase==='result'?'done':'run'}};
}
