export const BOARD_METRICS=Object.freeze({
 'courtesy-contest':{rules:'press-courtesy-v2',unit:'courtesies',status:'seated',direction:'desc',secondary:true,secondaryUnit:'秒'},
});
export function resultToSubmission(game,r){const b=Object.hasOwn(BOARD_METRICS,game)?BOARD_METRICS[game]:null;if(!b||!r||r.phase!=='done')return null;
 if(game==='courtesy-contest'){
  if(r.seated!==true||!Number.isSafeInteger(r.count)||r.count<0||r.count>=Number.MAX_SAFE_INTEGER||typeof r.remaining!=='number'||!Number.isFinite(r.remaining)||r.remaining<.01||r.remaining>30||Math.abs(r.remaining*100-Math.round(r.remaining*100))>1e-9)return null;
  return {score:r.count,status:b.status,secondaryScore:r.remaining};
 }
 return null;
}
