// Ruleset2 changes real travelled metres, not the displayed score. Keep this
// module independent of physics/landmarks to avoid circular height dependencies.
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export const RULESET='real-altitude-v2';
export const BEST_SCORE_KEY='pf-pole-vault-best-v2';
export const LEGACY_BEST_SCORE_KEY='pf-pole-vault-best-v1';
export const CITY_TOP=829.8,SPACE_BOUNDARY=100000;
export function ascentPace(height){const h=Number.isFinite(height)?Math.max(0,height):0;return .14+.16*smooth(200,CITY_TOP,h)+.9*smooth(CITY_TOP,9000,h)+1.8*smooth(9000,SPACE_BOUNDARY,h);}
// C1 soft cap of earned travel velocity. The cap cannot create or sustain lift.
export function ascentVelocity(liftVelocity,height){const h=Number.isFinite(height)?Math.max(0,height):0,v=(Number.isFinite(liftVelocity)?liftVelocity:0)*ascentPace(h);if(v<=0)return v;
 const cap=h<=CITY_TOP?20+15*smooth(200,CITY_TOP,h):35+500*smooth(CITY_TOP,3000,h)+.5*Math.max(0,h-3000)*smooth(3000,4000,h),band=2;
 return v<=cap-band?v:v>=cap+band?cap:cap-(cap+band-v)**2/(4*band);
}
export function loadBest(storage){try{const h=Number((storage??globalThis.localStorage).getItem(BEST_SCORE_KEY));return Number.isFinite(h)?Math.max(0,h):0;}catch{return 0;}}
export function storeBest(height,storage){if(!Number.isFinite(height)||height<0)return false;try{(storage??globalThis.localStorage).setItem(BEST_SCORE_KEY,String(height));return true;}catch{return false;}}
