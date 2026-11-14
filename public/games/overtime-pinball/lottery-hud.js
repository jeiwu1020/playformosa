// Passive mobile status borrows the joke slot briefly; original text is never overwritten.
export function lotteryStatusText(s,now){
 if(s.phase==='ready')return '摸彩：碰摸彩機';
 if(s.phase==='drawing')return '摸彩：抽獎中！';
 if(s.phase==='charging')return `摸彩再碰${Math.max(0,3-(s.charged?.length||0))}種設備`;
 if(s.phase==='active')return `${({gate:'封門保護',upgrade:'機關升級',busy:'裝忙連鎖'})[s.prize]} ${Math.max(0,Math.ceil(s.until-now))}秒`;
 return '';
}
export function createLotteryStatus(){let key='',until=0,lastClock=0,nextReminder=0;
 return {update(s,now,{enabled=true,suppressed=false}={}){
  if(now<lastClock){key='';until=0;nextReminder=0;}lastClock=now;
  const next=[s?.phase,s?.prize,s?.drawId,s?.charged?.length].join(':');
  if(next!==key){key=next;until=now+3;nextReminder=now+15;}
  else if(s?.phase==='charging'&&now>=nextReminder){until=now+2.5;nextReminder=now+15;}
  return enabled&&!suppressed&&s&&s.phase!=='ended'&&now<until?lotteryStatusText(s,now):'';
 }};
}
