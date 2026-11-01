// Continuous movement feedback: no beat clock, no required next limb.
export function flightCue(s){
 if(s.falling)return{ready:false,label:'返回軟墊',feedback:'成績鎖定 · 亂按只改落地表演'};
 if(s.phase==='finish')return{ready:false,label:'自動背滾過桿！',feedback:s.hitBar?'碰桿！':'橫桿已鎖定'};
 const effort=s.airEffort||0,efficiency=s.efficiency||0,tilt=Math.abs(s.lean||0);
 const stable=tilt<.45&&Math.abs(s.spin||0)<1.2;
 return {ready:effort>.4&&stable,progress:Math.min(1,(s.airLift||0)/3),
 label:stable?'姿態穩定':'姿態偏斜',prompt:effort<.2?'手腳動起來':'升力 '+Math.round(Math.min(1,(s.airLift||0)/3)*100)+'%',
 feedback:tilt>.45?'姿態偏斜':effort<.2?'動作停住了':efficiency>.65?'升力充足 ↑':'升力偏弱',
 feedbackType:effort>.4&&stable?'success':'',finish:'體力 '+Math.round((s.energy||0)*100)+'%'};
}
