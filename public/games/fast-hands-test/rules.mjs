// This adapter is used only by the isolated test page. Official rules stay untouched.
import {LEVEL_TUNING,catchStageSettings,newMatch,beginRound,advance,press,pauseMatch} from '../fast-hands/levels-rules.mjs';
const freeze=Object.freeze;
function choice(value,values,label){if(!values.includes(value))throw new RangeError(`${label}選項不正確。`);return value;}
function integer(value,min,max,label){
 const n=typeof value==='string'&&value.trim()===''?NaN:Number(value);
 if(!Number.isInteger(n)||n<min||n>max)throw new RangeError(`${label}範圍為 ${min}–${max}，請輸入整數。`);
 return n;
}
export function testSettings(mode,values={}){
 choice(mode,['catch','duel'],'測試模式');
 const catchMode=choice(values.catchMode??'stage',['stage','flight'],'接彈'),aiMode=choice(values.aiMode??'random',['random','fixed'],'AI'),waitMode=choice(values.waitMode??'random',['random','fixed'],'等待');
 const stage=mode==='catch'&&catchMode==='stage'?integer(values.stage??1,1,9999,'關卡'):null;
 const flightMs=mode==='catch'&&catchMode==='flight'?integer(values.flightMs,100,3000,'飛行毫秒'):catchStageSettings(stage??1).flightMs;
 const windowMs=Math.max(LEVEL_TUNING.catchWindowFloorMs,flightMs*LEVEL_TUNING.catchWindowRatio);
 const aiMs=mode==='duel'&&aiMode==='fixed'?integer(values.aiMs,80,3000,'AI 反應毫秒'):null;
 const waitMs=waitMode==='fixed'?integer(values.waitMs,300,5000,'等待毫秒'):null;
 return freeze({mode,catchMode,stage,flightMs,windowMs,aiMode,aiMs,waitMode,waitMs});
}
export function beginTest(settings,now,random=Math.random){
 if(!Number.isFinite(now)||now<0)throw new RangeError('Invalid test start time');
 const checked=testSettings(settings.mode,settings);
 const original=beginRound(newMatch(checked.mode,{practice:true,random}),now,random);
 return freeze({...original,testing:true,testSettings:checked,flightMs:checked.flightMs,windowMs:checked.windowMs,aiMs:checked.aiMs??original.aiMs,readyAt:checked.waitMs===null?original.readyAt:now+checked.waitMs});
}
export function advanceTest(state,now){
 if(!state?.testing||!Number.isFinite(now)||now<state.startedAt)return state;
 // Keep measuring after the AI deadline; the unchanged press() still decides the winner.
 if(state.mode==='duel'&&state.phase==='live'&&now<=state.liveAt+5000)return state;
 return advance(state,now);
}
export function pressTest(state,now){
 if(!state?.testing)return state;
 const next=press(state,now);
 if(next===state||state.mode!=='catch'||state.phase!=='live')return next;
 const result=freeze({...next.results.at(-1),playerMs:now-state.liveAt});
 return freeze({...next,results:freeze([result])});
}
export const pauseTest=state=>state?.testing?pauseMatch(state):state;
