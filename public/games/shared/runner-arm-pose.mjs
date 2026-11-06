// Render-only articulation. All lengths are anatomical centre-to-centre metres;
// neither this module nor its callers write to the race runner.
export const UPPER_ARM_LENGTH=.34;
export const FOREARM_LENGTH=.32;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const smoothBlend=(v,a,b)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const unit=v=>{const d=Math.hypot(v.x,v.y,v.z);return{x:v.x/d,y:v.y/d,z:v.z/d};};
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const advance=(p,d,l)=>({x:p.x+d.x*l,y:p.y+d.y*l,z:(p.z||0)+d.z*l});
function turn(d,lean){const c=Math.cos(lean),s=Math.sin(lean);return{x:d.x*c-d.y*s,y:d.x*s+d.y*c,z:d.z};}

// Solve directions rather than independently translating elbow/wrist endpoints.
// The elbow angle is the included angle shoulder->elbow->wrist, in radians.
export function articulatedArm(shoulder,{upperAngle=0,elbowAngle=Math.PI/2,outward=.15,forearmOutward=0,side=1,lean=0}={}){
 const upper=unit({x:Math.sin(upperAngle),y:-Math.cos(upperAngle),z:side*outward});
 const desired={x:Math.cos(upperAngle),y:Math.sin(upperAngle),z:side*forearmOutward},projection=dot(desired,upper);
 const bend=unit({x:desired.x-upper.x*projection,y:desired.y-upper.y*projection,z:desired.z-upper.z*projection});
 const turnAngle=Math.PI-elbowAngle,c=Math.cos(turnAngle),s=Math.sin(turnAngle);
 const lower={x:upper.x*c+bend.x*s,y:upper.y*c+bend.y*s,z:upper.z*c+bend.z*s};
 const elbow=advance(shoulder,turn(upper,-lean),UPPER_ARM_LENGTH);
 return{elbow,hand:advance(elbow,turn(lower,-lean),FOREARM_LENGTH)};
}

// A grounded starting hand is an IK target. Clamp reach before solving, rather
// than stretch the meshes; the caller sets a crouch with a reachable shoulder.
export function reachArm(shoulder,target,{side=1}={}){
 const delta={x:target.x-shoulder.x,y:target.y-shoulder.y,z:(target.z||0)-(shoulder.z||0)};
 const length=clamp(Math.hypot(delta.x,delta.y,delta.z),Math.abs(UPPER_ARM_LENGTH-FOREARM_LENGTH)+1e-6,UPPER_ARM_LENGTH+FOREARM_LENGTH-1e-6),axis=unit(delta);
 const preferred={x:-1,y:0,z:side*.15},along=dot(preferred,axis),bend=unit({x:preferred.x-axis.x*along,y:preferred.y-axis.y*along,z:preferred.z-axis.z*along});
 const distance=(UPPER_ARM_LENGTH**2-FOREARM_LENGTH**2+length**2)/(2*length),height=Math.sqrt(Math.max(0,UPPER_ARM_LENGTH**2-distance**2));
 const mid=advance(shoulder,axis,distance),elbow=advance(mid,bend,height);
 return{elbow,hand:advance(shoulder,axis,length)};
}

// Read the actual race fields without changing them. Speed thresholds belong
// to the lower-body gait only. A cartoon racer who stops before finishing stays
// ready with high forearms and a small arm cycle; only a real finish drops them.
// The baked version retains its existing whole-pose gait approximation at rest.
// 400m records v=0 at crossing, so its real runout clock carries the finish.
export function runnerVisualMotion(r,time=0,game='400m'){
 const finished=Number.isFinite(r.finished),started=r.started!==false;
 const finishAge=finished?Math.max(0,game==='400m'?(r.runout||0):time-(Number.isFinite(r.finishRaceTime)?r.finishRaceTime:time)):0;
 const speed=smoothBlend(Math.max(0,r.v||0),0,game==='400m'?1:.35);
 const carry=finished?1-smoothBlend(finishAge,.9,2.1):0;
 const finish=(r.lean||0)*(finished?1-smoothBlend(finishAge,.1,.9):1);
 const activity=finished?Math.max(speed,carry):started?1:0;
 return{activity,finish,finishAge,finished,started};
}

// Continuous local arm angles share one limb solver; fatigue and finish lean
// change posture, never proportions. The phase is supplied by each game's gait.
export function runningArm(shoulder,{phase=0,activity=1,fatigue=0,lean=0,finish=0,active=1,side=1}={}){
 const tired=clamp(fatigue,0,1),settle=1-clamp(activity,0,1),ending=smoothBlend(finish,.15,.85);
 // The user-confirmed Tiangong Omni reference suggests high forearms in
 // front of the chest/face. These are character-fit art choices, not measured
 // robot angles: moderate alternating upper arms, clearly bent elbows, and
 // outward clearance. Keep fatigue/finish recognizable by lowering smoothly.
 const swing=Math.sin(phase)*(.28-.05*tired)*(.5+.5*active)*(1-.25*ending)*(1-settle);
 const upperAngle=.55-.15*tired-.32*ending+swing;
 const elbowAngle=(70+7*Math.sin(phase+.4)+22*tired+27*ending)*(Math.PI/180);
 return articulatedArm(shoulder,{upperAngle:upperAngle*(1-settle),elbowAngle:elbowAngle*(1-settle)+148*Math.PI/180*settle,outward:(.26+.06*tired)*(1-settle)+.04*settle,forearmOutward:.48*(1-settle),side,lean});
}

// Original 132 cells keep their indices. The 128 appended complete poses add
// a middle fatigue level and fresh/tired variants at two intermediate leans.
// The final 12 formerly empty cells hold three standing settle poses per colour;
// dimensions and decoded image memory are unchanged.
// Fatigue/fully leaning use eight phases. Only brief intermediate leans use
// four phases to bound image decoding/memory cost.
// Extra poses use a .18m lower export window so extended crouching fingers
// stay in their cell. Offset their destination equally to retain track contact.
export const RUNNER_EXTRA_SPRITE_SHIFT=.18/2.76;
export const RUNNER_SPRITE_LAYOUT=Object.freeze({width:192,height:288,columns:16,perCharacter:33,characters:4,extraPerCharacter:32,totalFrames:272,rows:17});
export function runnerSpriteFrame(phase,{id=0,running=true,fatigue=0,finish=0,activity=running?1:0,started=running,finished=false}={}){
 const original=id*33,extra=132+id*32;
 if(!started&&!finished)return original+32;
 const settle=1-clamp(activity,0,1);
 // These are genuine standing arm-settle poses, never bent-over lean frames.
 // Unfinished racers retain high forearms while their real input lean recovers;
 // the grid intentionally has no simultaneous lean + arm-settle combination.
 if(finished&&settle>=1/6&&finish<1/6)return 260+id*3+Math.min(2,Math.round(settle*3)-1);
 const cycle=((phase/(Math.PI*2))%1+1)%1,step=n=>Math.floor(cycle*n),lean=Math.round(clamp(finish,0,1)*3),tired=clamp(fatigue,0,1);
 if(lean===0){const band=Math.round(tired*2);return band===0?original+step(16):band===1?extra+step(8):original+16+step(8);}
 if(lean===3)return tired>=.5?extra+8+step(8):original+24+step(8);
 return extra+16+(lean-1)*8+(tired>=.5?4:0)+step(4);
}
export function drawRunnerSprite(ctx,atlas,frame,x,y,width,height){
 ctx.drawImage(atlas,frame%16*192,Math.floor(frame/16)*288,192,288,x,y,width,height);
}
