// Monotonic active-time clock. Rendering rate cannot discard elapsed simulation time.
export function createClock(advance){let last=null,paused=false;return{reset(now){last=now;paused=false},tick(now){if(!Number.isFinite(now))return;if(last===null){last=now;return}const dt=Math.max(0,now-last)/1000;last=Math.max(last,now);if(!paused&&dt>0)advance(dt)},pause(now){this.tick(now);paused=true},resume(now){last=now;paused=false}};}
// Visible-frame fairness: inputs use the last presented simulation snapshot.
// If the browser has not presented a fresh frame for 200ms, explicitly pause;
// never consume that invisible gap and then blame the player for a hidden miss.
export function createPresentationClock(advance,onStall,maxGapMs=200){
 const clock=createClock(advance);let presented=null,paused=false,awaiting=true,pending=null;
 function fresh(now){if(paused)return false;if(presented!==null&&now-presented>maxGapMs){paused=true;pending=null;clock.pause(presented);onStall();return false;}return true;}
 return{reset(now){presented=null;pending=null;awaiting=true;paused=false;clock.reset(now)},frame(now){if(!fresh(now))return false;if(awaiting){clock.resume(now);}else clock.tick(now);pending=now;return true},present(now){if(!paused&&pending===now){presented=now;pending=null;awaiting=false;}},input(now){return !awaiting&&pending===null&&fresh(now)},pause(){paused=true;pending=null;clock.pause(presented)},resume(now){paused=false;awaiting=true;pending=null;presented=null;clock.resume(now)}};
}
