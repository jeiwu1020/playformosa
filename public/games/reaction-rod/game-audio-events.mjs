// Rod-only read-only state deltas; never consumes events, RNG, or input.
export function createGameAudioEvents(game,play){
 let previous=null,finished=false;
 function reset(){previous=null;finished=false;}
 function update(s,{replay=false,active=true,emitResult=true}={}){
  if(game!=='reaction-rod'||!s||replay||!active||s.paused||s.state==='paused')return;
  const phase=s.phase??s.state,p=previous;
  if(p&&(s.caught||0)>p.caught)play('catch');
  if(p&&(s.missed||0)>p.missed)play('miss');
  if(p&&(s.body?.falls||0)>p.falls)play('impact');
  if(phase==='done'&&!finished&&emitResult){finished=true;play('result');}
  previous={caught:s.caught||0,missed:s.missed||0,falls:s.body?.falls??s.falls??0};
 }
 return {reset,update,finish(){if(finished)return;finished=true;play('result');}};
}
