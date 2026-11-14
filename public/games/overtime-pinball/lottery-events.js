/** Pure tail-party raffle reducer. Caller supplies monotonic active gameplay time.
 * Does not pause, capture input, spawn workers, mutate physics, or write income.
 */
export const LOTTERY_RULES=Object.freeze({spin:1.15,chainCap:600,chainPoints:40,chainTargets:2,speedCap:44});
export const LOTTERY_PRIZES=Object.freeze({
 gate:Object.freeze({label:'今晚禁止下班',duration:8,color:0xffcc38,description:'鐵門關閉，繼續賺加班費！'}),
 upgrade:Object.freeze({label:'人體工學升級',duration:12,color:0x67ddff,description:'L／R 機關延長出擊、強化推力！'}),
 busy:Object.freeze({label:'全公司都在裝忙',duration:12,color:0xff83cc,description:'撞一台，全公司一起演！'})
});
export function createLotteryState(){return {phase:'ready',prize:null,until:0,drawUntil:0,lastNow:0,inside:false,bag:[],lastPrize:null,drawId:0,chainPaid:0,contacts:[]};}
const valid=s=>s&&s.phase!=='ended';
function clock(s,now){if(!valid(s)||!Number.isFinite(now)||now<0||now<s.lastNow)return false;s.lastNow=now;return true;}
function pick(s,random){
 if(!s.bag.length){
  const pool=Object.keys(LOTTERY_PRIZES);s.bag=[];
  while(pool.length){const r=random?.();const i=Math.floor((Number.isFinite(r)?Math.max(0,Math.min(.999999,r)):Math.random())*pool.length);s.bag.push(pool.splice(i,1)[0]);}
  if(s.bag[0]===s.lastPrize)[s.bag[0],s.bag[1]]=[s.bag[1],s.bag[0]];
 }
 return s.bag.shift();
}
export function advanceLottery(s,{now}){
 if(!clock(s,now))return [];
 const commands=[];
 if(s.phase==='drawing'&&now>=s.drawUntil){s.phase='active';s.until=s.drawUntil+LOTTERY_PRIZES[s.prize].duration;commands.push({type:'lotteryStarted',prize:s.prize,drawId:s.drawId,until:s.until});}
 if(s.phase==='active'&&now>=s.until){s.phase='ready';commands.push({type:'lotteryExpired',prize:s.prize,drawId:s.drawId});}
 return commands;
}
export function hitLottery(s,{now,source='main',random}={}){
 if(!valid(s)||source!=='main'||!Number.isFinite(now)||now<s.lastNow||now<0)return [];
 const commands=advanceLottery(s,{now});
 const entered=!s.inside;s.inside=true;
 // A fresh box entry always draws. If a prize is still active, the new draw
 // replaces it instead of making the player wait for a recharge.
 if(!entered||!['ready','active'].includes(s.phase))return commands;
 s.phase='drawing';s.prize=pick(s,random);s.lastPrize=s.prize;s.drawUntil=now+LOTTERY_RULES.spin;s.until=0;s.drawId++;s.chainPaid=0;s.contacts=[];
 commands.push({type:'lotteryDraw',prize:s.prize,drawId:s.drawId,duration:LOTTERY_RULES.spin});return commands;
}
/** Call only once main actor fully clears the collider + radius + hysteresis. */
export function leaveLottery(s){if(valid(s))s.inside=false;}
export function hitLotteryEquipment(s,{now,source='main',stationId,targets=[],contactId}={}){
 if(!valid(s)||source!=='main'||typeof stationId!=='string'||!stationId||['lottery','launcher'].includes(stationId)||!Number.isFinite(now)||now<s.lastNow||now<0)return [];
 const commands=advanceLottery(s,{now});
 if(s.phase==='active'&&s.prize==='busy'&&s.chainPaid<LOTTERY_RULES.chainCap&&(typeof contactId==='number'||typeof contactId==='string')&&!s.contacts.includes(contactId)){
  const chosen=[...new Set(targets)].filter(id=>typeof id==='string'&&id&&id!==stationId&&!['lottery','launcher'].includes(id)).slice(0,LOTTERY_RULES.chainTargets);
  if(chosen.length){
   s.contacts.push(contactId);const points=Math.min(LOTTERY_RULES.chainCap-s.chainPaid,chosen.length*LOTTERY_RULES.chainPoints);s.chainPaid+=points;
   commands.push({type:'lotteryChain',drawId:s.drawId,stationId,targets:chosen,points});
  }
 }
 return commands;
}
export function endLottery(s){if(!valid(s))return [];s.phase='ended';s.until=0;s.inside=false;return [{type:'lotteryEnded'}];}
export function lotteryEffects(s,now){
 const active=valid(s)&&s.phase==='active'&&Number.isFinite(now)&&now>=s.drawUntil&&now<s.until;
 return {gateClosed:!!(active&&s.prize==='gate'),assistHoldMultiplier:active&&s.prize==='upgrade'?1.35:1,assistImpulseMultiplier:active&&s.prize==='upgrade'?1.12:1,speedCap:LOTTERY_RULES.speedCap,chainEnabled:!!(active&&s.prize==='busy')};
}
export function lotteryPresentation(s,now=0){
 if(!s||s.phase==='ended')return {phase:'ended',text:'',label:'',remaining:0,progress:0,color:0x777777};
 const p=LOTTERY_PRIZES[s.prize];const remaining=s.phase==='active'?Math.max(0,s.until-now):s.phase==='drawing'?Math.max(0,s.drawUntil-now):0;
 const text=s.phase==='ready'?'尾牙摸彩：碰箱子抽好康':s.phase==='drawing'?'尾牙摸彩！人人有獎！':`${p.label} · ${Math.ceil(remaining)} 秒`;
 return {phase:s.phase,text,label:p?.label||'尾牙摸彩',description:p?.description||'',remaining,color:p?.color||0xffcc38,progress:s.phase==='active'?remaining/p.duration:s.phase==='drawing'?1-remaining/LOTTERY_RULES.spin:1};
}
