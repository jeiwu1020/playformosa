// Presentation-only side channel. Never add fields to the simulation or its events.
const moments=new WeakMap();
export function rememberFinalMoment(world,outcome,reason){
 if(world.index!==9||!world.rod||moments.has(world))return;
 try{
  const freeze=Object.freeze;
  moments.set(world,freeze({state:world.state,time:world.time,activeHand:world.activeHand,outcome,reason,
   rod:freeze({...world.rod}),input:freeze({...world.input}),
   hands:freeze(world.hands.map(hand=>freeze({...hand}))),
   body:freeze({...world.body,feet:freeze([...world.body.feet])})}));
 }catch{/* A missing photo must never interrupt a catch, miss or fall. */}
}
export function readFinalMoment(world){return moments.get(world)||null;}
