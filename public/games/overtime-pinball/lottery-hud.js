// Shared table-top lottery card; the normal joke slot stays untouched.
import {LOTTERY_PRIZES} from './lottery-events.js';

export function lotteryStatusPresentation(s,now){
 if(s.phase==='ready')return {phase:'ready',kicker:'幸運時刻',headline:'摸彩箱已就緒',detail:'碰觸摸彩箱，靠近後抽獎'};
 if(s.phase==='drawing')return {phase:'drawing',kicker:'尾牙摸彩',headline:'好運開出中',detail:'人人有獎 · 獎項揭曉中'};
 if(s.phase==='active'){
  const prize=LOTTERY_PRIZES[s.prize];
  return {phase:'active',kicker:'✦ 本次中獎',headline:prize?.label||'摸彩獎項',detail:`${prize?.description||'好運已經降臨'} · ${Math.max(0,Math.ceil(s.until-now))} 秒`};
 }
 return {phase:'ended',kicker:'',headline:'',detail:''};
}
export function lotteryStatusText(s,now){
 const p=lotteryStatusPresentation(s,now);return [p.kicker,p.headline,p.detail].filter(Boolean).join(' · ');
}
export function lotteryPromptPresentation(prompt){
 if(!prompt)return null;
 return prompt.ready
  ?{phase:'prompt',kicker:'尾牙摸彩',headline:'選擇你的好運',detail:`按 L／R 抽獎 · ${Math.max(1,Math.ceil(prompt.remaining))} 秒後自動抽獎`}
  :{phase:'prompt',kicker:'尾牙摸彩',headline:'摸彩箱已感應',detail:'準備開獎…'};
}
export function lotteryPromptText(prompt){
 if(!prompt)return '';
 const p=lotteryPromptPresentation(prompt);return p.detail;
}
export function createLotteryStatus(){let key='',until=0,lastClock=0,nextReminder=0;
 function presentation(s,now,{enabled=true,suppressed=false}={}){
  if(now<lastClock){key='';until=0;nextReminder=0;}lastClock=now;
  const next=[s?.phase,s?.prize,s?.drawId].join(':');
  if(next!==key){key=next;until=now+(s?.phase==='active'?5.5:s?.phase==='drawing'?2.2:3);nextReminder=now+15;}
  else if(s?.phase==='ready'&&now>=nextReminder){until=now+2.5;nextReminder=now+15;}
  return enabled&&!suppressed&&s&&s.phase!=='ended'&&now<until?lotteryStatusPresentation(s,now):null;
 }
 return {presentation,update(s,now,options){const p=presentation(s,now,options);return p?[p.kicker,p.headline,p.detail].filter(Boolean).join(' · '):'';}};
}
