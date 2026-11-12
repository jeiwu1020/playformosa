import {JOURNEY_STAGES} from './sky-journey.mjs';
// Ruleset3 changes travelled metres, not reference heights or earned lift.
// The independent sky catalog has no physics/landmark dependency.
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export const RULESET='real-altitude-v3';
export const BEST_SCORE_KEY='pf-pole-vault-best-v3';
export const LEGACY_BEST_SCORE_KEY='pf-pole-vault-best-v1';
export const CITY_TOP=829.8,SPACE_BOUNDARY=100000;
const safeHeight=h=>Number.isFinite(h)?Math.max(0,h):0;
// Close real landmarks remain paired in the existing scene. Their upper roof
// anchors the end of that view; no building or sky station is moved.
const cityAndAir=[
 [0,0],[.9,.5],[3.2,5],[12,11],[30.1752,17.5],[38,24],
 [49.54,30.5],[96.3,37],[135,43.5],[184.404,50],[192.024,56.5],
 [333,63],[443.2,69.5],[553.33,76],[634,82.5],[829.8,89],
 [1000,95],[2800,101],[3952,107],[4807,114],[5895,121],
 [8848.86,128],[12000,135],[16000,141],[21000,148],[25000,154],[35000,162],
];
export const PACE_STOPS=Object.freeze([...cityAndAir,...JOURNEY_STAGES.map((s,i)=>[s.start,170+i*9])].map(([height,seconds])=>Object.freeze({height,seconds})));
const knots=PACE_STOPS.map(({height,seconds})=>({x:Math.log1p(height/4),seconds}));
const spans=knots.slice(1).map((b,i)=>b.x-knots[i].x);
const slopes=spans.map((d,i)=>(knots[i+1].seconds-knots[i].seconds)/d);
// Shape-preserving monotone Hermite slopes: positive travel time, continuous
// speed, and no overshoot at a close pair or a very large astronomical gap.
const tangents=knots.map((_,i)=>{
 if(i===0)return slopes[0];if(i===knots.length-1)return slopes.at(-1);
 const a=spans[i-1],b=spans[i],w1=2*b+a,w2=b+2*a;
 return(w1+w2)/(w1/slopes[i-1]+w2/slopes[i]);
});
function travelCurve(height){
 const h=safeHeight(height),x=Math.log1p(h/4),last=knots.length-1;
 if(x>=knots[last].x)return{seconds:knots[last].seconds+(x-knots[last].x)*tangents[last],derivative:tangents[last]};
 let low=0,high=last;while(high-low>1){const mid=(low+high)>>1;if(knots[mid].x<=x)low=mid;else high=mid;}
 const a=knots[low],b=knots[low+1],d=b.x-a.x,u=clamp((x-a.x)/d),u2=u*u,u3=u2*u,m0=tangents[low],m1=tangents[low+1];
 return{seconds:(2*u3-3*u2+1)*a.seconds+(u3-2*u2+u)*d*m0+(-2*u3+3*u2)*b.seconds+(u3-u2)*d*m1,
  derivative:((6*u2-6*u)*(a.seconds-b.seconds)+(3*u2-4*u+1)*d*m0+(3*u2-2*u)*d*m1)/d};
}
export function plannedAscentSeconds(height){return travelCurve(height).seconds;}
export function ascentPace(height){const h=safeHeight(height);return(h+4)/Math.max(.001,travelCurve(h).derivative)/20;}
export function ascentVelocity(liftVelocity,height){
 const v=Number.isFinite(liftVelocity)?liftVelocity:0;
 // Exhaustion/imbalance/stopping still use the unchanged physics termination.
 // A positive velocity is necessary, and weak lift earns less progress.
 if(v<=0)return v*.14;
 return ascentPace(height)*20*smooth(0,20,v);
}
export function loadBest(storage){try{const h=Number((storage??globalThis.localStorage).getItem(BEST_SCORE_KEY));return Number.isFinite(h)?Math.max(0,h):0;}catch{return 0;}}
export function storeBest(height,storage){if(!Number.isFinite(height)||height<0)return false;try{(storage??globalThis.localStorage).setItem(BEST_SCORE_KEY,String(height));return true;}catch{return false;}}
