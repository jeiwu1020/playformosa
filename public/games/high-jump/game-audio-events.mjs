// Read-only deltas from authoritative state. No RNG, input, timers, or event consumption.
export function createGameAudioEvents(game,play){
 let previous=null,stepDistance=0,finished=false;
 function reset(){previous=null;stepDistance=0;finished=false;}
 function update(s,{replay=false,active=true,emitResult=true}={}){
  if(!s||replay||!active||s.paused||s.state==='paused')return;
  const phase=s.phase??s.state,p=previous;
  if(game==='high-jump'){
   if(phase==='run'&&p?.phase==='run'){stepDistance+=Math.abs((s.x||0)-p.x);if(stepDistance>=.8){play('step');stepDistance%=.8;}}
   if(phase==='air'&&p?.phase!=='air')play('jump');
   if(s.hit&&!p?.hit)play('impact');
   if(phase==='land'&&p?.phase!=='land')play('land');
  }else if(game==='shot-put'){
   if(phase==='push'&&p?.phase!=='push')play('jump');
   if(phase==='impact'&&p?.phase!=='impact')play('land');
  }else if(game==='discus'){
   if(phase==='cast'&&p?.phase!=='cast')play('jump');
   if(phase==='done'&&p&&p.phase!=='done')play('land');
  }else if(game==='reaction-rod'){
   if(p&&(s.caught||0)>p.caught)play('catch');
   if(p&&(s.missed||0)>p.missed)play('miss');
   if(p&&(s.body?.falls||0)>p.falls)play('impact');
  }else if(game==='tower-climb'){
   const landings=s.landings||[];
   if(p&&landings.length>p.landings&&landings.slice(p.landings).some(l=>!l.cancelled))play('step');
   if(p&&(s.falls||0)>p.falls)play('impact');
  }
  if(phase==='done'&&!finished&&emitResult){finished=true;play('result');}
  previous={phase,x:s.x||0,hit:Boolean(s.hit),caught:s.caught||0,missed:s.missed||0,falls:s.body?.falls??s.falls??0,landings:s.landings?.length||0};
 }
 return {reset,update,finish(){if(finished)return;finished=true;play('result');}};
}
