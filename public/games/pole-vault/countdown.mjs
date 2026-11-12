// Runs outside race physics: pause is free, GO is emitted only on the crossing.
export function createCountdown(){let remaining=3,goAge=0;return{
 get ready(){return remaining<=0;},
 get label(){return remaining>0?String(Math.ceil(remaining-1e-9)):goAge<.65?'開始':'';},
 advance(dt,paused=false){if(paused||!Number.isFinite(dt)||dt<=0)return false;if(remaining<=0){goAge+=dt;return false;}remaining=Math.max(0,remaining-dt);if(remaining<1e-9){remaining=0;return true;}return false;}
};}
