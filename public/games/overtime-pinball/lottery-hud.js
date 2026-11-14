// Passive mobile status borrows the joke slot briefly; original text is never overwritten.
import {LOTTERY_PRIZES} from './lottery-events.js';

export function lotteryStatusText(s,now){
 if(s.phase==='ready')return '摸彩箱就緒 · 碰箱開獎';
 if(s.phase==='drawing')return '摸彩開獎中';
 if(s.phase==='active')return `中獎｜${LOTTERY_PRIZES[s.prize]?.label||'摸彩獎項'} · ${Math.max(0,Math.ceil(s.until-now))}秒`;
 return '';
}
export function lotteryPromptText(prompt){
 if(!prompt)return '';
 return prompt.ready?`按 L／R 抽獎 · ${Math.max(1,Math.ceil(prompt.remaining))} 秒後自動抽獎`:'摸彩箱啟動中';
}
export function createLotteryStatus(){let key='',until=0,lastClock=0,nextReminder=0;
 return {update(s,now,{enabled=true,suppressed=false}={}){
  if(now<lastClock){key='';until=0;nextReminder=0;}lastClock=now;
  const next=[s?.phase,s?.prize,s?.drawId].join(':');
  if(next!==key){key=next;until=now+3;nextReminder=now+15;}
  else if(s?.phase==='ready'&&now>=nextReminder){until=now+2.5;nextReminder=now+15;}
  return enabled&&!suppressed&&s&&s.phase!=='ended'&&now<until?lotteryStatusText(s,now):'';
 }};
}
