import {milestones,sceneAltitude} from './milestones.mjs';
import {CITY_TOP,SPACE_BOUNDARY} from './flight-profile.mjs';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const safe=h=>Number.isFinite(h)?Math.max(0,h):0;
const real=milestones.filter(m=>m.kind!=='space').map(m=>({...m,category:m.kind==='mountain'?'mountain':'building',datum:m.kind==='mountain'?'sea-level':'ground'}));
const flights=[
 {id:'plane',label:'輕型螺旋槳飛機',category:'airborne',min:1000,max:4000,enter:830,leave:4500,range:'1–4 km'},
 {id:'jet',label:'大型客機',category:'airborne',min:9000,max:12000,enter:8500,leave:14000,range:'9–12 km'},
 {id:'research',label:'高空研究機',category:'airborne',min:18000,max:21000,enter:16000,leave:24000,range:'18–21 km'},
 {id:'weatherballoon',label:'氣象探空氣球',category:'airborne',min:25000,max:35000,enter:23000,leave:45000,range:'25–35 km'},
];
// Original authored silhouettes remain available, but never become fake sourced
// benchmarks or randomly replace a real landmark at its actual height.
const authored=[['brickclock','紅磚鐘樓'],['watertower','城市水塔'],['observatory','圓頂天文台'],['twinspire','雙子尖塔'],['terrace','空中花園大樓'],['archtower','弧形觀景塔'],['balloon','熱氣球'],['birds','候鳥'],['eagle','老鷹'],['airship','飛行船'],['ufo','飛碟']].map(([id,label])=>({id,label,category:'decoration'}));
export const catalog=Object.freeze([...real,...flights,...authored].map(Object.freeze));
function neighbourhoods(entries){const groups=[];for(const entry of entries){const y=sceneAltitude(entry.height),last=groups.at(-1);if(last&&y-last.lastY<.30&&last.entries.length<2){last.entries.push(entry);last.lastY=y;last.center=(last.center+y)/2;}else groups.push({entries:[entry],center:y,lastY:y});}return groups;}
const cities=neighbourhoods(real.filter(m=>m.category==='building'&&m.id!=='apartment'));
const mountains=neighbourhoods(real.filter(m=>m.category==='mountain'));
function referenceItems(groups,h,gate=1,upcoming=false){const y=sceneAltitude(h),items=[];for(let i=0;i<groups.length;i++){const g=groups[i],prev=groups[i-1],older=groups[i-2],next=groups[i+1];
 // Two neighbouring groups share the scene: the upcoming subject reaches full
 // presence at the prior roof; the passed one then descends and leaves smoothly.
 const riseStart=older?older.lastY+.35*(prev.center-older.lastY):prev?prev.center-2:0;
 const rise=i? smooth(riseStart,prev.lastY,y):1,fall=next?1-smooth(g.lastY,g.lastY+.35*(next.center-g.lastY),y):1;
 const left=prev?.center??g.center-2,right=next?.center??g.center+2;
 const weight=(upcoming?rise*fall:(i===0&&y<=g.center?1:smooth(left,g.center,y))*(i===groups.length-1&&y>=g.center?1:1-smooth(g.center,right,y)))*gate;if(weight<.00001)continue;
 g.entries.forEach((m,j)=>items.push({...m,weight,role:weight>=.5?'main':'next',group:i,clusterSize:g.entries.length,clusterIndex:j,relative:sceneAltitude(m.height)-y}));
 }return items;}
export function altitudeScene(s){const h=safe(s.phase==='finish'?(s.finishAltitude??s.altitude):s.altitude),peak=Math.max(h,safe(s.maxHeight));
 const cityGate=1-smooth(CITY_TOP,1600,h),mountainGate=smooth(2800,3600,h)*(1-smooth(9000,15000,h));
 const references=[...referenceItems(cities,h,cityGate,true),...referenceItems(mountains,h,mountainGate)];
 const aircraft=flights.map(m=>({...m,weight:smooth(m.enter,m.min,h)*(1-smooth(m.max,m.leave,h))})).find(m=>m.weight>.00001)??null;
 // Airborne ranges are authored exhibit bands, not passed-height milestones.
 const items=references.map(m=>({...m,weight:m.weight*(aircraft?.weight>.4?.45:1)}));
 if(aircraft)items.push({...aircraft,role:'main',relative:0});
 const rank=m=>m.weight+(m.category==='building'&&m.height>=h?.05:0),ranked=[...references].sort((a,b)=>rank(b)-rank(a)),main=aircraft?.weight>.4?aircraft:ranked[0]??{id:h>=SPACE_BOUNDARY?'space':'upperair',label:h>=SPACE_BOUNDARY?'太空景觀':'高空雲層',category:'environment'};
 return{altitude:h,main,next:ranked.find(m=>m.id!==main.id)??null,items,aircraft,passed:real.filter(m=>peak>=m.height).map(m=>m.id),visible:true};
}
// Compatibility name for existing consumers; unlike the superseded showcase,
// selection/roof position is entirely altitude-driven. No seven-second slots.
export const showcase=altitudeScene;
export function landmarkPose(item,mobile=false){const w=clamp(item.weight),near=smooth(.05,.85,w),pair=item.clusterSize||1;
 const scale=.18+.82*near,z=-26+19*near-(item.clusterIndex||0)*2;
 const lane=(mobile?1.25:2.25)+(1-near)*(mobile?.6:1.0)+((item.clusterIndex||0)-(pair-1)/2)*(mobile?1.0:1.35);
 return{scale,z,lane,opacity:Math.min(1,w*1.6)};
}
export function environment(s){const h=safe(s.altitude),air=safe(s.airTime),day=(1+Math.cos(Math.min(Math.PI,air/28)))/2,sunset=Math.sin(Math.min(Math.PI,air/28));
 const space=smooth(SPACE_BOUNDARY,150000,h),stars=Math.max((1-day)*.7,smooth(85000,130000,h));
 const daySky=[.765,.898,.875],dusk=[.86,.61,.49],night=[.15,.23,.34],deep=[.075,.13,.22];
 const sky=daySky.map((c,i)=>((c*day+night[i]*(1-day))*(1-sunset*.45)+dusk[i]*sunset*.45)*(1-space)+deep[i]*space);
 const seed=((Number(s.plantQuality)||0)*997+(Number(s.launchTime)||0)*.17)%1;
 const rain=(seed<.42?1:0)*smooth(.5,3,air)*(1-smooth(4000,7000,h));
 return{sky,day,sunset,space,stars,rain,clouds:1-smooth(12000,30000,h),phase:h>=SPACE_BOUNDARY?'space':day>.7?'day':day>.2?'sunset':'night'};
}
export function sceneryCaption(item){if(!item)return'';if(item.category==='mountain')return`${item.label} · 海拔${item.id==='montblanc'?'約':''}${item.height.toLocaleString('en-US')} m（海平面比較）`;
 if(item.height)return`${item.label} · ${item.height.toLocaleString('en-US',{maximumFractionDigits:3})} m${item.id==='burj'?'（設備尖端）':item.id==='liberty'?'（含基座）':''}`;
 if(item.range)return`${item.label} · 展示區間 ${item.range}（非固定巡航高度）`;
 return item.id==='space'?'太空景觀 · 100 km FAI卡門線 · 行星為遠方示意':`${item.label} · 大氣與天色示意`;
}

// Stylized background separation, not a new altitude/score map. Magnification is
// relative to the athlete floor, so its sign and exact real-H crossing survive.
export function landmarkRoofY(item,altitude,approach=1){const floor=sceneAltitude(altitude),delta=sceneAltitude(item.height)-floor;return floor+.08+(item.category==='building'?delta+(3.4*Math.tanh(delta*5.5/3.4)-delta)*clamp(approach):delta);}
