// At most three small state snapshots; no video/history grows with an endless run.
function snapshot(s){const copy=structuredClone(s);const freeze=v=>{if(v&&typeof v==='object'){for(const child of Object.values(v))freeze(child);Object.freeze(v);}return v;};return freeze(copy);}
export function createResultFrame(){
 let clearance=null,attempt=null,preflight=null;
 return{observe(s){
  if(s.phase==='finish'&&s.events?.includes('clearance')&&!s.hitBar)clearance=snapshot(s);
  else if(s.phase==='finish'&&s.events?.includes('crossing-frame')&&!attempt)attempt=snapshot(s);
  else if((s.phase==='run'||s.phase==='plant')&&!attempt&&!clearance)preflight=snapshot(s);
 },get state(){return clearance??attempt??preflight;},get kind(){return clearance?'clearance':attempt?'attempt':'preflight';}};
}
