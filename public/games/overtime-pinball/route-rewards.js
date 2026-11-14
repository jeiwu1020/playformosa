import {MAIL_LENGTH,mailPoint} from './mail-run.js';
export const REWARD_ITEMS=[{label:'咖啡券',points:250,fraction:.25},{label:'薪水袋',points:500,fraction:.5},{label:'特休券',points:750,fraction:.75}];
export const freshRouteRewards=()=>({round:0,nextAt:12,until:0,active:false,collected:[false,false,false],total:0});
export function updateRouteRewards(r,time){
 if(r.active&&time>=r.until){r.active=false;r.nextAt=time+[19,15,12][(r.round-1)%3];}
 if(!r.active&&time>=r.nextAt){r.active=true;r.until=time+10;r.collected=[false,false,false];r.round++;return true;}return false;
}
// Sweep the actual route interval: fast frames cannot skip a reward, and both
// entrances collect the same physical items in opposite order.
export function collectRouteRewards(r,time,from,to,direction){
 if(!r.active||time>=r.until)return [];
 const a=direction===-1?MAIL_LENGTH-from:from,b=direction===-1?MAIL_LENGTH-to:to,result=[];
 REWARD_ITEMS.forEach((item,n)=>{const d=item.fraction*MAIL_LENGTH;if(!r.collected[n]&&d>=Math.min(a,b)&&d<=Math.max(a,b)){r.collected[n]=true;r.total+=item.points;result.push({...item,index:n,...mailPoint(d)});}});return result;
}
