// Articulated joints adapt the preserved 100m procedural character, in metres.
export function runnerPose(r,time){
 const running=r.v>.35, tired=Math.max(0,1-r.energy/30), wobble=r.wobble||0;
 const phase=time*(6+r.v*1.45)+r.id*1.3;
 const lean=.065+(r.lean||0)*.62+tired*.12+Math.sin(phase*.6)*wobble*.045;
 const hip={x:0,y:1.12+(running?Math.sin(phase*2)*.028:Math.sin(time*3)*.012)};
 const shoulder={x:Math.sin(lean)*.65,y:hip.y+Math.cos(lean)*.65};
 const head={x:Math.sin(lean)*.98,y:hip.y+Math.cos(lean)*.98};const points={hip,shoulder,head};
 for(let i=0;i<2;i++){const a=phase+i*Math.PI,swing=running?Math.sin(a):0,lift=running?Math.max(0,Math.cos(a))*.32:0;
  points['knee'+i]={x:swing*.35,y:.64+lift*.25};points['foot'+i]={x:swing*.57,y:.11+lift};
  const arm=running?Math.sin(a+Math.PI)*(.35+tired*.13):.025*Math.sin(time*2+i);
  points['elbow'+i]={x:shoulder.x+((r.lean||0)>.2?-.36:arm),y:shoulder.y-.27-tired*.12,z:tired*Math.sin(a)*.12};
  points['hand'+i]={x:points['elbow'+i].x+((r.lean||0)>.2?-.22:.24),y:points['elbow'+i].y+((r.lean||0)>.2?-.18:.20)-tired*.14,z:tired*Math.sin(a)*.20};
 }
 return{points,state:{lean,phase:running?'run':'standing'}};
}
