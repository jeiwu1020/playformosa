// Active time is monotonic. A hidden tab keeps every remaining millisecond.
export class ActiveRoundClock{
 constructor(duration=30){this.duration=duration;this.started=false;this.paused=true;this.spent=0;this.segmentStart=0;}
 start(now){this.started=true;this.spent=0;this.segmentStart=now;this.paused=false;}
 elapsed(now){return Math.max(0,this.spent+(!this.paused&&this.started?Math.max(0,now-this.segmentStart):0));}
 remaining(now){return Math.max(0,this.duration-this.elapsed(now)/1000);}
 expired(now){return this.started&&this.remaining(now)<=0;}
 pause(now){if(!this.paused&&this.started){this.spent=this.elapsed(now);this.paused=true;}}
 resume(now){if(this.paused&&this.started){this.segmentStart=now;this.paused=false;}}
}
export function departureIsSafe({seatReady,busy,accepted=false}){return accepted===true&&seatReady===true&&!busy;}
