import{HOLD_TIME}from'./physics.mjs';
export function formatDistance(distance){const n=Number.isFinite(distance)?Math.max(0,distance):0;return n>=10000?{value:(n/1000).toFixed(2),unit:'km'}:{value:n.toFixed(2),unit:'m'};}
export function controlFeedback(s){return ['左手','右手','左腳','右腳'].map((label,i)=>{if(i<2)return{label,hint:s.phase==='air'?'擺動／調姿':'擺動平衡',load:0};const f=i-2,age=s.holdTimes[f];return{label,hint:s.phase==='air'?(s.brace[f]>.3?'準備落地':'長按收尾'):s.charging&&s.chargeFoot===f?'放開起跳':age>0?'長按蓄力':'短按邁步',load:s.phase==='air'?s.brace[f]:Math.min(1,age/HOLD_TIME)};});}
