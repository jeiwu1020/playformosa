// One monotone travel map for ascent, frozen clearance and cinematic return.
const safeHeight=h=>Number.isFinite(h)?Math.max(0,h):0;
export function sceneAltitude(height){const h=safeHeight(height),knee=1.5;return h<=knee?h:3*Math.log1p(h/4)+(knee-3*Math.log1p(knee/4))*Math.exp(-(h-knee)/4);}
export function heightAtSceneAltitude(y){y=safeHeight(y);if(y<=1.5)return y;let low=1.5,high=Math.min(1e150,4*Math.expm1(Math.min(345,y/3)));for(let i=0;i<40;i++){const mid=(low+high)/2;if(sceneAltitude(mid)<y)low=mid;else high=mid;}return(low+high)/2;}
export function vaultOffsetX(s,plantX=18){const origin=s.finishAttempted?s.finishX:s.x;return s.phase==='run'||s.phase==='plant'?0:plantX-3.3+Math.max(0,Math.min(4.5,origin-(plantX-3.3)))-origin;}
