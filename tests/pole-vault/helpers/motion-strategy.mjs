// Deterministic finite-observation fixture; not a claim about human skill.
const memory=new WeakMap();
export function corrected(s){
 let m=memory.get(s);if(!m){m={next:0,until:0,turn:0};memory.set(s,m);}
 const t=s.airTime,f=Math.floor(t/.4)%2;
 if(t>=m.next){m.next=t+.4;const signal=s.lean*1.5+s.spin*.85;m.turn=Math.abs(signal)>.14?-Math.sign(signal):0;m.until=t+.10;}
 return t<m.until&&m.turn?(m.turn>0?[1,0,1,0]:[0,1,0,1]):[f,!f,!f,f];
}
