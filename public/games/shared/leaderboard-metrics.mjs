// Final-round snapshots only. These adapters never read historical local bests.
export const BOARD_METRICS=Object.freeze({
 'long-jump':{rules:'journey-km-v1',unit:'km',status:'valid',direction:'desc'},
 hurdles:{rules:'110m-8h-v1',unit:'s',status:'done',direction:'asc'},
 'high-jump':{rules:'cleared-height-v1',unit:'m',status:'cleared',direction:'desc'},
 'pole-vault':{rules:'real-altitude-v3',unit:'m',status:'done',direction:'desc'},
 'shot-put':{rules:'relay-distance-v1',unit:'m',status:'valid',direction:'desc'},
 discus:{rules:'wind-ufo-distance-v1',unit:'m',status:'valid',direction:'desc'},
 'reaction-rod':{rules:'catch-rating-v1',unit:'catches',status:'done',direction:'desc',secondary:true},
 'beer-slide':{rules:'accuracy-retention-v1',unit:'points',status:'valid',direction:'desc'},
 'tower-climb':{rules:'indoor-10floors-v1',unit:'s',status:'summit',direction:'asc'}
});
export function resultToSubmission(game,r){
 const b=Object.hasOwn(BOARD_METRICS,game)?BOARD_METRICS[game]:null;
 if(!b||!r||r.phase!=='done')return null;
 let score;
 switch(game){
 case 'long-jump':if(r.valid!==true)return null;score=r.legalAdventureKm;break;
 case 'hurdles':score=r.t;if(score>180)return null;break;
 case 'high-jump':if(r.success!==true)return null;score=r.height;break;
 case 'pole-vault':if(r.ruleset!==b.rules||r.scoreSnapshot?.ruleset!==b.rules)return null;score=r.scoreSnapshot.height;break;
 case 'shot-put':if(r.valid!==true)return null;score=r.distance;break;
 case 'discus':if(r.foul!==false)return null;score=r.score;break;
 case 'reaction-rod':score=r.caught;if(!Number.isInteger(score)||score>10||!Number.isFinite(r.rating)||r.rating<0||r.rating>10)return null;break;
 case 'beer-slide':if(r.fallen||r.invalid||r.invalidReason||r.cancelled)return null;score=r.raw;if(score>10)return null;break;
 case 'tower-climb':if(r.finished!==true||r.floor!==10)return null;score=r.time;if(score>60)return null;break;
 }
 if(typeof score!=='number'||!Number.isFinite(score)||score<=0)return null;
 return {score,status:b.status,...(b.secondary?{secondaryScore:r.rating}:{})};
}
