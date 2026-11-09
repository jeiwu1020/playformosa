import {createPressureThreatPlan} from './threat-plan.js';
export const PARTNERS=[
 {id:'aunt',name:'阿姨',reply:'少年仔，這個位你先坐！'},
 {id:'office',name:'上班族',reply:'這張椅子，我先幫你排進行程！'},
 {id:'stubborn',name:'堅持不坐客',reply:'我今天就是要站，你坐啦！'}
];
export function choosePartner(random,last=''){const n=Math.max(0,Math.min(2,Math.floor(Number.isFinite(random)?random*3:0)));return PARTNERS[n].id===last?PARTNERS[(n+1)%3].id:PARTNERS[n].id;}
export function partnerLines(count,partner){
 const offer=count>=10?'您坐，我站到終點！':count>=7?'不坐就是不給我面子！':count>=4?'我腿是裝飾，您先坐！':'您先坐，真的不用客氣！';
 const replies=partner==='office'?['謝謝，但我已經幫你預約這個位！','這份讓座申請，我退回給你！','先坐再開會，不接受反駁！']:partner==='stubborn'?['我站得很開心，你坐！','我的膝蓋說，今天不上班！','椅子可以空，我的原則不能空！']:['少年仔，你才要坐！','我練深蹲，你坐啦！','這份禮貌，我接不住！'];
 return [offer,replies[Math.min(2,Math.floor(count/4))]];
}
export function threatTiming(random){const n=Number.isFinite(random)?Math.max(0,Math.min(1,random)):0;const travelMs=[3000,2000,1000][Math.min(2,Math.floor(n*3))];return {duration:.8+travelMs/1000,windup:.8,travelMs};}
export function chainReward(count,previous){return Number.isInteger(count)&&count>=4&&count%4===0&&count>previous?1:0;}
// Six genuinely different background passengers. Only the last three have seated hand-gesture frames.
export const SEAT_AUDIENCE=[{type:0,slot:.075},{type:3,slot:.21},{type:1,slot:.345},{type:2,slot:.655},{type:4,slot:.79},{type:5,slot:.925}];

export function createThreatPlan(random=Math.random){return createPressureThreatPlan(random);}
