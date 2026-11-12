import{copyRace}from'./runner-replay.mjs';
export const RUNNER_RULES=Object.freeze({'run-400m':'400m-prototype-v3','run-1500m':'1500m-bounded-plans-v4'});
export function runnerVerdict(game,m){
 if(game==='run-400m'){
  if(m.falls>=3)return'四肢開了三次以上離職會議，最後還是全員到齊。';
  if(m.falls>0)return'跑道躺過，終點也到過。這圈履歷很完整。';
  if(m.falseStarts>0)return'槍還沒響，腿已經先打卡。這次終於準時下班。';
  if(m.stamina<12)return'腿力用到最後一滴，靈魂稍後到站。';
  if(m.stamina>65)return'跑完還有存款，腿是不是偷偷開了定存？';
  if(m.steps>0&&m.perfectSteps/m.steps>=.85)return'腳步準得像節拍器，四肢今天終於開同一個會。';
  if(m.reaction>=.8)return'槍聲先出發，你的腿多想了一下人生。';
  if(m.rank===1)return'四肢這次意見一致：第一個下班。';
  if(m.splits?.length===4&&m.splits[3]-m.splits[2]<m.splits[1]-m.splits[0])return'最後一百比中段還快，原來腿有留私房錢。';
  return'彎道扶得住，直道跑得完。四肢合作案通過。';
 }
 if(m.penalty>0)return'起跑先欠一筆加時，終點還是把帳跑完了。';
 if(m.energy<8)return'終點到了。你的腿申請立即離職。';
 if(m.energy>65)return'跑完還有很多力氣，下場可以少一點客氣。';
 const cans=Array.isArray(m.cansCollected)?m.cansCollected.length:m.cansCollected||0;
 if(cans===3)return'三罐補給全收，今天跑的是能量罐集點賽。';
 if(m.slipSeconds>=45)return'跟跑氣流存了好久，省力這科你有選修。';
 if(m.laneChanges>=15)return'換位比開會還勤，跑道差點以為你在巡田水。';
 if(m.laneChanges===0)return'全程不換位，腿有在跑，立場非常堅定。';
 if(m.rank===1)return'等到空檔才出手，四肢一起把第一名帶回家。';
 if(cans===2)return'兩罐補給剛剛好，第三罐留給跑道當小費。';
 return'腳知道要衝，腦知道要等。這場有默契。';
}
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export function freezeRunnerResult(game,race,ruleset){
 const p=race.runners[0];if(p.finished===null||!Number.isFinite(p.finished)||p.finished<=0||ruleset!==RUNNER_RULES[game])return null;
 const rank=1+race.runners.filter(q=>q!==p&&q.finished!==null&&q.finished<p.finished).length;
 const metrics=copyRace({...p,falseStarts:race.falseStarts??0,rank,...(game==='run-1500m'?{raceSeed:race.initialSeed,racePlanId:race.planId}:{})});
 return freeze({game,ruleset,phase:'done',finished:true,seconds:p.finished,rank,metrics,verdict:runnerVerdict(game,metrics),scoreSnapshot:{ruleset,seconds:p.finished},runners:copyRace(race.runners),timeBasis:game==='run-1500m'?'街機版實際遊戲用時，非真實田徑紀錄':'實際遊戲用時'});
}
