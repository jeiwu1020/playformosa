// Presentation only. These are authored viewing bands, never scoring thresholds
// or claims about the measured location of an object. No clock or game mutation.
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const band=(a,b,c,d,h)=>smooth(a,b,h)*(1-smooth(c,d,h));
const subjects=[
 {id:'airglow',label:'大氣的邊緣',note:'雲海已經在腳下，天空還有下一層。',range:[30000,45000,180000,240000]},
 {id:'station',label:'軌道上的鄰居',note:'太空站：這位選手沒有登機證。',range:[120000,180000,1800000,2600000]},
 {id:'probe',label:'遠行的探測器',note:'導航重新規劃中，請繼續往上。',range:[1800000,2600000,80000000,110000000]},
 {id:'lunar',label:'月亮越來越近',note:'月球是距離示意，不是固定離地高度。',range:[60000000,110000000,800000000,1100000000]},
 {id:'comet',label:'穿過深空',note:'彗星路過，順便看了一眼你的四肢。',range:[600000000,1100000000,30000000000,40000000000]},
];
const surprises=[
 {id:'boba',label:'珍奶小行星',note:'少冰微糖，重力另外算。'},
 {id:'pineapple',label:'鳳梨太空艙',note:'旺來已抵達，地球還在配送範圍外。'},
 {id:'market',label:'宇宙夜市',note:'老闆：這裡也可以加辣。'},
];
export function skyJourney(s){
 const raw=s.phase==='finish'?(s.finishAltitude??s.altitude):s.altitude;
 const h=Number.isFinite(raw)?Math.max(0,raw):0,log=Math.log10(Math.max(1,h));
 const items=subjects.map(({range,...entry})=>({...entry,weight:band(...range,h),progress:clamp((Math.log(Math.max(range[0],h))-Math.log(range[0]))/(Math.log(range[3])-Math.log(range[0]))),fantasy:false})).filter(x=>x.weight>.00001);
 const fantasy=smooth(3e10,5e10,h);
 if(fantasy>0){
  const travel=Math.max(0,(log-Math.log10(3e10))/1.5),i=Math.floor(travel),fraction=travel-i;
  const previous=i?1-smooth(0,.18,fraction):0;
  if(previous>0)items.push({...surprises[(i-1)%3],weight:previous*fantasy,progress:1,fantasy:true});
  items.push({...surprises[i%3],weight:(1-previous)*fantasy,progress:fraction,fantasy:true});
 }
 // Keep at most two adjacent subjects, even at a wide lunar/fantasy crossfade.
 const visible=items.sort((a,b)=>b.weight-a.weight).slice(0,2);
 const main=visible[0]??{id:'cloudsea',label:'雲海上方',note:'還有風景，繼續往上。',fantasy:false};
 return{altitude:h,main,items:visible,
  clouds:band(1000,1800,16000,30000,h),
  horizon:band(24000,45000,180000,500000,h),
  moon:band(60000000,110000000,800000000,1100000000,h),
  earth:smooth(80000,150000,h)*(1-.85*smooth(6,9,log)),
  fantasy};
}
