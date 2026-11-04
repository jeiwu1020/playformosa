export function eventTime(e,timeOrigin,now){let t=Number(e.timeStamp);if(t>1e12)t-=timeOrigin;return Number.isFinite(t)&&t>=0&&t<=now+5?Math.min(t,now):now;}
export function orderedSamples(e){try{const a=typeof e.getCoalescedEvents==='function'?e.getCoalescedEvents():[];return [...a,e];}catch{return [e];}}
