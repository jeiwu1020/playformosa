// Final-round Rod snapshot only. Never reads historical local bests.
export const BOARD_METRICS=Object.freeze({'reaction-rod':{rules:'catch-rating-v1',unit:'catches',status:'done',direction:'desc',secondary:true}});
export function resultToSubmission(game,r){
 if(game!=='reaction-rod'||!r||r.phase!=='done'||!Number.isInteger(r.caught)||r.caught<=0||r.caught>10||!Number.isFinite(r.rating)||r.rating<0||r.rating>10)return null;
 return {score:r.caught,status:'done',secondaryScore:r.rating};
}
