import {EARTH_STOPS,SPACE_STOPS,PALETTES} from './route-data.mjs';
export const CHUNK_SIZE=48;
export function greatCircleKm(a,b){const rad=Math.PI/180,dlat=(b[0]-a[0])*rad,dlon=(b[1]-a[1])*rad;const h=Math.sin(dlat/2)**2+Math.cos(a[0]*rad)*Math.cos(b[0]*rad)*Math.sin(dlon/2)**2;return 6371*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));}
const regions=[];let raw=0,km=0;
function add(id,name,landmark,palette,stage,extra={}){const[sky,ground,accent]=PALETTES[palette];regions.push({id,name,start:raw,end:Infinity,kmStart:km,sky,ground,accent,landmark,stage,cue:name+' · 四肢繼續前進',...extra});}
EARTH_STOPS.forEach(([id,name,lat,lon,landmark,palette],i)=>{if(i){raw+=i<22?24:72;km+=greatCircleKm(EARTH_STOPS[i-1].slice(2,4),[lat,lon]);}add(id,name,landmark,palette,i<22?'taiwan':'world',{coordinate:[lat,lon],taiwanIndex:i<22?i+1:null});});
export const WORLD_LENGTH=raw; // end of this particular global itinerary, not Earth's circumference
SPACE_STOPS.forEach(([id,name,length,legKm,landmark,palette])=>{raw+=length;km+=legKm;add(id,name,landmark,palette,id==='atmosphere'?'atmosphere':'space');});
for(let i=0;i<regions.length-1;i++){regions[i].end=regions[i+1].start;regions[i].kmEnd=regions[i+1].kmStart;}
regions.at(-1).kmPerRaw=100000000/384;
export const REGIONS=Object.freeze(regions.map(Object.freeze));
const clean=d=>Math.max(0,Number.isFinite(d)?d:0);
export function regionAt(distance){const d=clean(distance),r=REGIONS.find(r=>d>=r.start&&d<r.end)||REGIONS.at(-1);return{...r,loop:d>=WORLD_LENGTH?1:0,offset:d-r.start};}
const achievements=[['penghu','台灣22縣市達成'],['world_complete','環球航線完成'],['space','飛出地球'],['moon','登月達成'],['mars','火星抵達'],['saturn','土星環抵達']].map(([id,label])=>({start:REGIONS.find(r=>r.id===id).start,label}));
export function adventureAt(distance){const d=clean(distance),r=regionAt(d),fraction=Number.isFinite(r.end)?(d-r.start)/(r.end-r.start):0;const km=r.kmStart+(Number.isFinite(r.end)?(r.kmEnd-r.kmStart)*fraction:(d-r.start)*r.kmPerRaw);return{km,region:r,achievements:achievements.filter(a=>d>=a.start).map(a=>a.label)};}
export function chunkWindow(distance){const center=Math.floor(clean(distance)/CHUNK_SIZE);return Array.from({length:7},(_,i)=>{const index=center+i-2,start=index*CHUNK_SIZE;return{index,start,region:regionAt(Math.max(0,start+CHUNK_SIZE/2))};});}
// Preserved exactly from v8: route content does not change the learned flight feel.
export function windAt(distance){const a=distance/55;return{push:Math.sin(a)*.85,lift:.85+.55*Math.sin(a*.73+.4),nextPush:Math.sin((distance+18)/55)*.85};}
export function routeLabel(distance){const r=regionAt(distance);return r.id==='world_complete'?'環球完成・向外飛行':r.id==='deep_space'?r.name:r.name+'航段';}
export function journeyLabel(distance){return '台北出發 → '+routeLabel(distance);}
