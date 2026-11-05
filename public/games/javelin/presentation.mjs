// Presentation time is separate from frozen scoring physics, like discus landing-hold.
export const LANDING_HOLD=1.8,FOUL_HOLD=2.2;
export function createPresentation(){return{elapsed:0,shown:false,captured:false,photo:null};}
export function advancePresentation(p,state,dt,paused=false){if(paused||state.phase!=='result'||p.shown)return false;p.elapsed+=Math.max(0,Math.min(10,dt));if(p.elapsed>=(state.foul?FOUL_HOLD:LANDING_HOLD)){p.shown=true;return true;}return false;}
// Only a copy of the actual current game canvas; no generated/placeholder result art.
export function captureResultFrame(source,state,_mode,makeCanvas=()=>document.createElement('canvas')){try{if(!source?.width||!source?.height)throw Error('no frame');const c=makeCanvas();c.width=source.width;c.height=source.height;const ctx=c.getContext('2d');ctx.drawImage(source,0,0);const scale=c.width/700,h=70*scale;ctx.fillStyle='rgba(255,248,229,.94)';ctx.fillRect(0,c.height-h,c.width,h);ctx.fillStyle=state.foul?'#a13e28':'#234f40';ctx.font=`bold ${19*scale}px sans-serif`;ctx.fillText(state.foul?'犯規 · '+(state.reason||'本次不計成績'):`有效投擲 · ${(state.distance||0).toFixed(2)} m`,14*scale,c.height-45*scale);ctx.font=`${12*scale}px sans-serif`;ctx.fillText('標槍｜本次實際畫面',14*scale,c.height-26*scale);ctx.font=`${11*scale}px sans-serif`;ctx.fillStyle='#607461';ctx.fillText('島遊無界工作室 | PLAYFORMOSA STUDIO',14*scale,c.height-9*scale);return Object.freeze({url:c.toDataURL('image/png'),width:c.width,height:c.height,foul:!!state.foul,error:null});}catch{return Object.freeze({url:null,error:'這次畫面無法擷取，成績仍已保留。',foul:!!state.foul});}}

// One useful next action, without repeating launch metrics or the foul verdict.
export function resultAdvice(state){
 const launch=state.launch;
 if(state.foul&&state.reason?.includes('越線'))return '出手後立刻按住 A＋S 煞停，下一投提早支撐。';
 if(!launch)return '提早按住 K 引槍，距離起擲線約 6–7 公尺按 A 支撐，再放開 K。';
 if(launch.stability<.55)return 'A／S 落腳後點 J，穩住身體。';
 if(launch.draw<.85)return '提早按住 K，充分引槍。';
 if(launch.braceDelay===null)return '接近起擲線前按住 A 支撐，再放開 K。';
 if(launch.braceDelay<.14)return '按住 A 後稍等一拍，再放開 K。';
 if(launch.braceDelay>.5)return '支撐後早一點放開 K，別讓槍尖抬得太高。';
 return '保持節奏，再挑戰更遠的一投！';
}
