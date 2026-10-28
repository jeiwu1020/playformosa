// Pointer intent uses CSS pixels, never device pixels or accumulated jitter.
export const dragThreshold=(width,height)=>Math.max(12,Math.min(24,Math.min(width,height)*.035));
export const beginGesture=(x,y,width,height)=>({startX:x,startY:y,maxDistance:0,threshold:dragThreshold(width,height)});
export function moveGesture(g,x,y){g.maxDistance=Math.max(g.maxDistance,Math.hypot(x-g.startX,y-g.startY));return validGesture(g);}
export const validGesture=g=>Boolean(g&&g.maxDistance>=g.threshold);
export const newSeries=()=>({index:0,results:[],complete:false});
export function recordCup(series,result){if(series.complete||series.results.length!==series.index)return false;series.results.push({...result});return true;}
export function nextCup(series){if(series.results.length!==series.index+1)return false;if(series.index===2){series.complete=true;return false;}series.index++;return true;}
export const seriesTotal=series=>series.results.reduce((sum,r)=>sum+r.total,0);
